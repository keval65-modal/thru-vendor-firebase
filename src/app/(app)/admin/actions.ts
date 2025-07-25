
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase-admin';
import { Timestamp, collection, getDocs, doc, updateDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import type { Vendor } from '@/lib/inventoryModels';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ADMIN_UID } from '@/config/constants';


async function verifyAdmin() {
    const session = await getSession();
    if (session.role !== 'admin') {
        throw new Error("You are not authorized to perform this action.");
    }
    return session;
}

export async function getAllVendors(): Promise<{ vendors?: Vendor[], error?: string }> {
  try {
    await verifyAdmin();
    const vendorsCollection = collection(db, 'vendors');
    const vendorSnapshot = await getDocs(vendorsCollection);
    const vendorsList = vendorSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as Vendor;
    });
    return { vendors: vendorsList };
  } catch (error) {
    console.error('[AdminActions] Error fetching vendors:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: `Failed to fetch vendors. ${errorMessage}` };
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

export async function updateVendorByAdmin(
    vendorId: string,
    prevState: UpdateVendorByAdminFormState,
    formData: FormData
): Promise<UpdateVendorByAdminFormState> {
    try {
        await verifyAdmin();
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

export async function deleteVendorAndInventory(vendorId: string): Promise<DeleteVendorResult> {
    try {
        await verifyAdmin();
        if (!vendorId) {
            return { success: false, error: 'Vendor ID is missing.' };
        }
        
        console.log(`[AdminActions] Initiating deletion for vendor: ${vendorId}`);

        const batch = writeBatch(db);

        const inventoryCollectionRef = collection(db, 'vendors', vendorId, 'inventory');
        const inventorySnapshot = await getDocs(inventoryCollectionRef);
        
        let deletedItemsCount = 0;
        if (!inventorySnapshot.empty) {
            inventorySnapshot.forEach(docSnap => {
                batch.delete(docSnap.ref);
                deletedItemsCount++;
            });
        }
        
        const vendorRef = doc(db, 'vendors', vendorId);
        batch.delete(vendorRef);
        
        await batch.commit();

        revalidatePath('/admin');
        return { success: true, message: `Vendor and their ${deletedItemsCount} inventory items have been deleted.` };

    } catch (error) {
        console.error(`[AdminActions] Error during deletion of vendor ${vendorId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: `Failed to delete vendor: ${errorMessage}` };
    }
}

export async function getVendorForEditing(vendorId: string): Promise<{ vendor?: Vendor, error?: string }> {
  try {
    await verifyAdmin();
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
