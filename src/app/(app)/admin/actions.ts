
'use server';

import { z } from 'zod';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { Vendor } from '@/lib/inventoryModels';

// Schema for validation
const UpdateVendorByAdminSchema = z.object({
  shopName: z.string().min(1, "Shop name is required."),
  ownerName: z.string().min(1, "Owner name is required."),
  storeCategory: z.string().min(1, "Store category is required."),
  isActiveOnThru: z.preprocess(val => val === 'on' || val === true, z.boolean()),
});

// Helper types
export type UpdateVendorByAdminFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string[]>;
};

export type DeleteVendorResult = {
  success: boolean;
  error?: string;
  message?: string;
};

// Authentication check
async function verifyAdmin() {
  const session = await getSession();
  if (session.role !== 'admin') {
    throw new Error("You are not authorized to perform this action.");
  }
  return session;
}

// Fetch all vendors
export async function getAllVendors(): Promise<{ vendors?: Vendor[], error?: string }> {
  try {
    await verifyAdmin();
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    const vendors = vendorsSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt,
      } as Vendor;
    });

    return { vendors };
  } catch (err) {
    console.error('[getAllVendors]', err);
    return {
      error: err instanceof Error ? err.message : 'Unknown error occurred.'
    };
  }
}

// Fetch vendor by ID for editing
export async function getVendorForEditing(vendorId: string): Promise<{ vendor?: Vendor; error?: string }> {
  try {
    await verifyAdmin();
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);

    if (!vendorSnap.exists()) {
      return { error: 'Vendor not found.' };
    }

    const data = vendorSnap.data() as Omit<Vendor, 'id'>;

    return {
      vendor: {
        id: vendorSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt,
      } as Vendor
    };
  } catch (err) {
    console.error(`[getVendorForEditing] Error fetching vendor ${vendorId}`, err);
    return {
      error: err instanceof Error ? err.message : 'Unknown error occurred.'
    };
  }
}

// Update vendor
export async function updateVendorByAdmin(
  vendorId: string,
  prevState: UpdateVendorByAdminFormState,
  formData: FormData
): Promise<UpdateVendorByAdminFormState> {
  try {
    await verifyAdmin();

    const parsed = UpdateVendorByAdminSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return {
        error: 'Invalid data submitted.',
        fields: parsed.error.flatten().fieldErrors
      };
    }

    const updates = parsed.data;
    const vendorRef = doc(db, 'vendors', vendorId);
    await updateDoc(vendorRef, {
      ...updates,
      type: updates.storeCategory, // syncing category & type
      updatedAt: Timestamp.now(),
    });

    revalidatePath('/admin');
    revalidatePath(`/admin/${vendorId}/edit`);

    return { success: true, message: 'Vendor updated successfully.' };
  } catch (err) {
    console.error(`[updateVendorByAdmin] Error updating vendor ${vendorId}`, err);
    return {
      error: err instanceof Error ? err.message : 'Unknown error occurred.'
    };
  }
}

// Delete vendor & inventory
export async function deleteVendorAndInventory(vendorId: string): Promise<DeleteVendorResult> {
  try {
    await verifyAdmin();

    if (!vendorId) return { success: false, error: 'Vendor ID is required.' };

    console.log(`[deleteVendorAndInventory] Deleting vendor ${vendorId}`);

    const batch = writeBatch(db);

    const inventoryRef = collection(db, 'vendors', vendorId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    inventorySnapshot.forEach(docSnap => batch.delete(docSnap.ref));

    batch.delete(doc(db, 'vendors', vendorId));

    await batch.commit();

    revalidatePath('/admin');

    return {
      success: true,
      message: `Deleted vendor and ${inventorySnapshot.size} inventory items.`
    };
  } catch (err) {
    console.error(`[deleteVendorAndInventory] Error deleting vendor ${vendorId}`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred.'
    };
  }
}
