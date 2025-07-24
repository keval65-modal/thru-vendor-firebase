
'use server';

import { db } from '@/lib/firebase-admin';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp, WriteBatch, writeBatch, runTransaction } from 'firebase/firestore';
import type { PlacedOrder, VendorOrderPortion, VendorDisplayOrder, OrderItemDetail } from '@/lib/orderModels';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Fetches all relevant orders for a given vendor using an efficient 'array-contains' query.
 * An order is relevant if its vendorIds array contains the vendor's ID and its status is active.
 */
export async function fetchVendorOrders(vendorId: string): Promise<VendorDisplayOrder[]> {
  if (!vendorId) {
    console.error("[fetchVendorOrders] vendorId is required.");
    return [];
  }

  const ordersRef = collection(db, 'orders');
  // These are the statuses we consider "active" and want to display on the main dashboard.
  const activeStatuses: PlacedOrder['overallStatus'][] = ["Pending Confirmation", "Confirmed", "In Progress", "Ready for Pickup"];
  
  // New, more efficient compound query.
  const q = query(
    ordersRef,
    where("vendorIds", "array-contains", vendorId),
    where("overallStatus", "in", activeStatuses)
  );
  
  try {
    const querySnapshot = await getDocs(q);
    const relevantOrders: VendorDisplayOrder[] = [];

    querySnapshot.forEach(docSnap => {
      const orderData = { id: docSnap.id, ...docSnap.data() } as PlacedOrder;
      const vendorPortion = orderData.vendorPortions.find(p => p.vendorId === vendorId);

      if (vendorPortion) {
        // Exclude the full vendorPortions array and add the specific one for the display model.
        const { vendorPortions, ...rootOrderData } = orderData;
        relevantOrders.push({
          ...rootOrderData,
          vendorPortion: vendorPortion
        });
      }
    });

    // Sort by creation date, newest first
    relevantOrders.sort((a, b) => {
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as string).getTime();
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as string).getTime();
        return dateB - dateA;
    });

    console.log(`[fetchVendorOrders] Found ${relevantOrders.length} relevant orders for vendor ${vendorId}`);
    return relevantOrders;
    
  } catch (error) {
    console.error(`[fetchVendorOrders] Error fetching orders for vendor ${vendorId}:`, error);
    // Handle potential index errors
    if (error instanceof Error && error.message.includes("requires an index")) {
      console.error("Firestore index missing. Please create the required composite index on the 'orders' collection for ('vendorIds' array-contains) and ('overallStatus' in).");
    }
    return [];
  }
}


/**
 * Updates the status of a specific vendor's portion of an order.
 * Can also update the item list for grocery confirmations.
 */
export async function updateVendorOrderStatus(
  orderId: string,
  newStatus: VendorOrderPortion['status'],
  updatedItems?: OrderItemDetail[]
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  const vendorId = session?.uid; // USE UID, NOT EMAIL

  if (!vendorId) {
    return { success: false, error: "Authentication required." };
  }
  if (!orderId) {
    return { success: false, error: "Order ID is required." };
  }

  const orderRef = doc(db, 'orders', orderId);

  try {
    await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
            throw new Error("Order not found.");
        }

        const orderData = orderSnap.data() as PlacedOrder;
        let vendorFound = false;
        let newVendorSubtotal = 0;

        const updatedPortions = orderData.vendorPortions.map(portion => {
            if (portion.vendorId === vendorId) { // MATCH BY UID
                vendorFound = true;
                if (updatedItems) {
                    // This is a grocery confirmation, recalculate subtotal
                    newVendorSubtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
                    return { ...portion, status: newStatus, items: updatedItems, vendorSubtotal: newVendorSubtotal };
                }
                // For non-grocery flow or status changes after confirmation
                return { ...portion, status: newStatus };
            }
            return portion;
        });

        if (!vendorFound) {
            throw new Error("This order does not concern you.");
        }
        
        const allOtherPortionsReady = updatedPortions
            .filter(p => p.vendorId !== vendorId)
            .every(p => p.status === 'Ready for Pickup');
            
        const thisPortionReady = newStatus === 'Ready for Pickup';

        const updatePayload: any = { vendorPortions: updatedPortions };

        // If this action makes all portions ready for pickup, update the overall status.
        if (thisPortionReady && allOtherPortionsReady) {
            updatePayload.overallStatus = 'Ready for Pickup';
        }

        // If items were updated (grocery flow), we need to recalculate the grand total.
        if (updatedItems) {
            const oldPortion = orderData.vendorPortions.find(p => p.vendorId === vendorId);
            const oldSubtotal = oldPortion?.vendorSubtotal || 0;
            const difference = newVendorSubtotal - oldSubtotal;
            updatePayload.grandTotal = orderData.grandTotal + difference;
        }

        transaction.update(orderRef, updatePayload);
    });

    console.log(`[updateVendorOrderStatus] Successfully updated status to '${newStatus}' for vendor ${vendorId} in order ${orderId}`);
    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    return { success: true };

  } catch (error) {
    console.error(`[updateVendorOrderStatus] Error updating order ${orderId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to update order status. ${errorMessage}` };
  }
}

/**
 * Fetches details for a single order, tailored for the vendor view.
 */
export async function fetchOrderDetails(orderId: string): Promise<VendorDisplayOrder | null> {
    const session = await getSession();
    const vendorId = session?.uid; // USE UID, NOT EMAIL

    if (!vendorId) {
        console.error("[fetchOrderDetails] Not authenticated.");
        return null;
    }

    const orderRef = doc(db, 'orders', orderId);
    try {
        const docSnap = await getDoc(orderRef);
        if (!docSnap.exists()) {
            console.warn(`[fetchOrderDetails] Order ${orderId} not found.`);
            return null;
        }

        const orderData = { id: docSnap.id, ...docSnap.data() } as PlacedOrder;
        const vendorPortion = orderData.vendorPortions.find(p => p.vendorId === vendorId); // MATCH BY UID

        if (!vendorPortion) {
            console.warn(`[fetchOrderDetails] Vendor ${vendorId} not part of order ${orderId}.`);
            return null;
        }

        const { vendorPortions, ...rootOrderData } = orderData;
        return {
            ...rootOrderData,
            vendorPortion: vendorPortion
        };

    } catch (error) {
        console.error(`[fetchOrderDetails] Error fetching order ${orderId}:`, error);
        return null;
    }
}
