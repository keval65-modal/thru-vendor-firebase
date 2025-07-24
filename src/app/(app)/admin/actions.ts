
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase-admin';
import { Timestamp, collection, getDocs, doc, updateDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import type { Vendor } from '@/lib/inventoryModels';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const ADMIN_LOGIN_ROUTE = '/admin/login';

// Security is now enforced by Firestore Security Rules, not by dbCheck.

/**
 * Fetches all vendors from the 'vendors' collection.
 * Enforces admin-only access via Firestore Security Rules.
 */
export async function getAllVendors(): Promise<{ vendors?: Vendor[], error?: string }> {
  try {
    const vendorsCollection = collection(db, 'vendors');
    const vendorSnapshot = await getDocs(vendorsCollection);
    const vendorsList = vendorSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            // Convert Timestamps to ISO strings for client-side compatibility
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as Vendor;
    });
    return { vendors: vendorsList };
  } catch (error) {
    console.error('[AdminActions] Error fetching vendors:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: `Failed to fetch vendors. This may be a permissions issue. Ensure your Firestore rules are set correctly for admins. Details: ${errorMessage}` };
  }
}

const UpdateVendorByAdminSchema = z.object({
  shopName: z.string().min(1, "Shop name is required."),
  ownerName: z.string().min(1, "Owner name is required."),
  storeCategory: z.string().min(1, "Store category is required."),
  isActiveOnThru: z.preprocess((val) => val === 'on' || val === true, z.boolean()),
});

export type UpdateVendorByAdminFormState = {
    success?: boolean;
    error?: string;
    message?: string;
    fields?: Record<string, string[]>;
};

/**
 * Updates a vendor's details from the dedicated admin edit page.
 */
export async function updateVendorByAdmin(
    vendorId: string,
    prevState: UpdateVendorByAdminFormState,
    formData: FormData
): Promise<UpdateVendorByAdminFormState> {
    const validatedFields = UpdateVendorByAdminSchema.safeParse(
        Object.fromEntries(formData.entries())
    );
    
    if (!validatedFields.success) {
        return {
            error: "Invalid data submitted.",
            fields: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const updates = validatedFields.data;

    try {
        const vendorRef = doc(db, 'vendors', vendorId);
        await updateDoc(vendorRef, {
            ...updates,
            type: updates.storeCategory,
            updatedAt: Timestamp.now(),
        });
        
        revalidatePath('/admin');
        revalidatePath(`/admin/${vendorId}/edit`);
        return { success: true, message: "Vendor updated successfully." };

    } catch (error) {
        console.error(`[AdminActions] Error updating vendor ${vendorId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { error: `Failed to update vendor: ${errorMessage}` };
    }
}


export type DeleteVendorResult = {
    success: boolean;
    error?: string;
    message?: string;
};

/**
 * Deletes a vendor and all their inventory items.
 * WARNING: This does NOT delete the user from Firebase Auth. That must be done manually.
 */
export async function deleteVendorAndInventory(vendorId: string): Promise<DeleteVendorResult> {
    if (!vendorId) {
        return { success: false, error: 'Vendor ID is missing.' };
    }
    
    console.log(`[AdminActions] Initiating deletion for vendor: ${vendorId}`);

    try {
        const batch = writeBatch(db);

        // 1. Find and stage deletion for all inventory items for that vendor
        const inventoryCollectionRef = collection(db, 'vendors', vendorId, 'inventory');
        const inventorySnapshot = await getDocs(inventoryCollectionRef);
        
        let deletedItemsCount = 0;
        if (!inventorySnapshot.empty) {
            inventorySnapshot.forEach(docSnap => {
                batch.delete(docSnap.ref);
                deletedItemsCount++;
            });
            console.log(`[AdminActions] Staged deletion of ${deletedItemsCount} inventory items for vendor: ${vendorId}`);
        } else {
            console.log(`[AdminActions] No inventory items found for vendor: ${vendorId}`);
        }
        
        // 2. Stage deletion for the vendor document itself
        const vendorRef = doc(db, 'vendors', vendorId);
        batch.delete(vendorRef);
        console.log(`[AdminActions] Staged deletion of vendor document: ${vendorId}`);
        
        // 3. Commit all deletes in a single atomic operation
        await batch.commit();

        console.log(`[AdminActions] Successfully deleted vendor ${vendorId} and their inventory.`);
        revalidatePath('/admin');
        return { success: true, message: `Vendor and their ${deletedItemsCount} inventory items have been deleted.` };

    } catch (error) {
        console.error(`[AdminActions] Error during deletion of vendor ${vendorId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: `Failed to delete vendor: ${errorMessage}` };
    }
}


/**
 * Fetches a single vendor's details for the edit page.
 */
export async function getVendorForEditing(vendorId: string): Promise<{ vendor?: Vendor, error?: string }> {
  try {
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);
    if (!vendorSnap.exists) {
      return { error: 'Vendor not found.' };
    }
    const vendorData = vendorSnap.data() as Omit<Vendor, 'id'>;
    return {
      vendor: {
        id: vendorSnap.id,
        ...vendorData,
        createdAt: vendorData.createdAt instanceof Timestamp ? vendorData.createdAt.toDate().toISOString() : vendorData.createdAt,
        updatedAt: vendorData.updatedAt instanceof Timestamp ? vendorData.updatedAt.toDate().toISOString() : vendorData.updatedAt,
      } as Vendor
    };
  } catch (error) {
    console.error(`[AdminActions] Error fetching vendor ${vendorId} for editing:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: `Failed to fetch vendor: ${errorMessage}` };
  }
}
