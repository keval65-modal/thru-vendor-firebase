
'use server';

import { db } from '@/lib/firebase-admin';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { PlacedOrder, VendorDisplayOrder } from '@/lib/orderModels';
import { getSession } from '@/lib/auth';

export async function getReadyForPickupOrders(): Promise<VendorDisplayOrder[]> {
  const session = await getSession();
  const vendorId = session?.uid;

  if (!vendorId) {
    console.error("[getReadyForPickupOrders] Vendor ID is required.");
    return [];
  }

  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where("vendorIds", "array-contains", vendorId));
  
  try {
    const querySnapshot = await getDocs(q);
    const readyOrders: VendorDisplayOrder[] = [];
    
    querySnapshot.forEach(docSnap => {
      const orderData = { id: docSnap.id, ...docSnap.data() } as PlacedOrder;
      const vendorPortion = orderData.vendorPortions.find(p => p.vendorId === vendorId);

      // Filter for orders where THIS vendor's portion is ready
      if (vendorPortion && vendorPortion.status === 'Ready for Pickup') {
        const { vendorPortions, ...rootOrderData } = orderData;
        readyOrders.push({
          ...rootOrderData,
          vendorPortion: vendorPortion
        });
      }
    });

    readyOrders.sort((a, b) => {
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as string).getTime();
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as string).getTime();
        return dateB - dateA;
    });

    console.log(`[getReadyForPickupOrders] Found ${readyOrders.length} orders ready for pickup for vendor ${vendorId}`);
    return readyOrders;
    
  } catch (error) {
    console.error(`[getReadyForPickupOrders] Error fetching orders for vendor ${vendorId}:`, error);
    return [];
  }
}
