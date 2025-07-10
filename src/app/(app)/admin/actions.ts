
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import type { Vendor } from '@/lib/inventoryModels';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// NOTE: A proper admin system would have role-based access control.
// This function now enforces that the user has the 'admin' role.
async function isAdmin() {
    const session = await getSession();
    // A proper admin check verifies the user's role.
    return session?.role === 'admin';
}

/**
 * Fetches all vendors from the 'vendors' collection.
 */
export async function getAllVendors(): Promise<{ vendors?: Vendor[], error?: string }> {
  if (!await isAdmin()) {
    return { error: "You are not authorized to perform this action." };
  }

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
    return { error: `Failed to fetch vendors: ${errorMessage}` };
  }
}

const UpdateVendorByAdminSchema = z.object({
  vendorId: z.string().min(1, "Vendor ID is required."),
  shopName: z.string().min(1, "Shop name is required."),
  ownerName: z.string().min(1, "Owner name is required."),
  storeCategory: z.string().min(1, "Store category is required."),
  isActiveOnThru: z.boolean().default(false),
});

export type UpdateVendorByAdminFormState = {
    success?: boolean;
    error?: string;
    message?: string;
    fields?: Record<string, string[]>;
};

/**
 * Updates a vendor's details from the admin panel.
 * Receives validated data from a client component form.
 */
export async function updateVendorByAdmin(
    data: z.infer<typeof UpdateVendorByAdminSchema>
): Promise<UpdateVendorByAdminFormState> {
    if (!await isAdmin()) {
        return { error: "You are not authorized to perform this action." };
    }
    
    // Data is already parsed and validated by react-hook-form on the client
    const { vendorId, ...updates } = data;

    try {
        const vendorRef = doc(db, 'vendors', vendorId);
        await updateDoc(vendorRef, {
            ...updates,
            type: updates.storeCategory, // Ensure `type` mirrors `storeCategory`
            updatedAt: Timestamp.now(),
        });
        
        revalidatePath('/admin');
        return { success: true, message: "Vendor updated successfully." };

    } catch (error) {
        console.error(`[AdminActions] Error updating vendor ${vendorId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { error: `Failed to update vendor: ${errorMessage}` };
    }
}


export type DeleteVendorFormState = {
    success?: boolean;
    error?: string;
    message?: string;
};

/**
 * Deletes a vendor and all their inventory items.
 * WARNING: This does NOT delete the user from Firebase Auth. That must be done manually.
 */
export async function deleteVendorAndInventory(
    prevState: DeleteVendorFormState,
    formData: FormData
): Promise<DeleteVendorFormState> {
    if (!await isAdmin()) {
        return { error: "You are not authorized to perform this action." };
    }

    const vendorId = formData.get('vendorId') as string;
    if (!vendorId) {
        return { error: 'Vendor ID is missing.' };
    }
    
    console.log(`[AdminActions] Initiating deletion for vendor: ${vendorId}`);

    try {
        const batch = writeBatch(db);

        // 1. Delete the vendor document
        const vendorRef = doc(db, 'vendors', vendorId);
        batch.delete(vendorRef);
        console.log(`[AdminActions] Staged deletion of vendor document: ${vendorId}`);

        // 2. Find and delete all inventory items for that vendor from the subcollection
        const inventoryCollectionRef = collection(db, 'vendors', vendorId, 'inventory');
        const inventoryQuery = query(inventoryCollectionRef);
        const inventorySnapshot = await getDocs(inventoryQuery);
        
        if (!inventorySnapshot.empty) {
            inventorySnapshot.forEach(docSnap => {
                batch.delete(docSnap.ref);
            });
            console.log(`[AdminActions] Staged deletion of ${inventorySnapshot.size} inventory items for vendor: ${vendorId}`);
        } else {
            console.log(`[AdminActions] No inventory items found for vendor: ${vendorId}`);
        }
        
        // 3. Commit all deletes in a single batch
        await batch.commit();

        console.log(`[AdminActions] Successfully deleted vendor ${vendorId} and their inventory.`);
        revalidatePath('/admin');
        return { success: true, message: `Vendor and their ${inventorySnapshot.size} inventory items have been deleted.` };

    } catch (error) {
        console.error(`[AdminActions] Error during deletion of vendor ${vendorId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { error: `Failed to delete vendor: ${errorMessage}` };
    }
}
