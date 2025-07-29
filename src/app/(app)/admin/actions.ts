
'use server';

import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { Vendor } from '@/lib/inventoryModels';

// Schema for validation
const UpdateVendorByAdminSchema = z.object({
  shopName: z.string().min(1, 'Shop name is required.'),
  ownerName: z.string().min(1, 'Owner name is required.'),
  storeCategory: z.string().min(1, 'Store category is required.'),
  isActiveOnThru: z
    .string()
    .optional()
    .transform((val) => val === 'on'), // Correctly handle checkbox state
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
  if (!session.isAuthenticated || session.role !== 'admin') {
    throw new Error('You are not authorized to perform this action.');
  }
  return session;
}

// Fetch all vendors
export async function getAllVendors(): Promise<{
  vendors?: Vendor[];
  error?: string;
}> {
  try {
    await verifyAdmin();
    const vendorsSnapshot = await db.collection('vendors').get();
    const vendors = vendorsSnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate().toISOString()
            : data.updatedAt,
      } as Vendor;
    });

    return { vendors };
  } catch (err) {
    console.error('[getAllVendors]', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred.';
    return { error: errorMessage };
  }
}

// Fetch vendor by ID for editing
export async function getVendorForEditing(
  vendorId: string
): Promise<{ vendor?: Vendor; error?: string }> {
  try {
    await verifyAdmin();
    const vendorRef = db.collection('vendors').doc(vendorId);
    const vendorSnap = await vendorRef.get();

    if (!vendorSnap.exists) {
      return { vendor: undefined };
    }

    const data = vendorSnap.data() as Omit<Vendor, 'id'>;

    return {
      vendor: {
        id: vendorSnap.id,
        ...data,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate().toISOString()
            : data.updatedAt,
      },
    };
  } catch (err) {
    console.error(`[getVendorForEditing] CRITICAL ERROR fetching vendor ${vendorId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'A database error occurred.';
     // This function is called during server-side rendering, so we return the error
     // instead of throwing it to prevent the entire page from crashing.
    return { error: errorMessage };
  }
}

// Helper function to convert FormData to a plain object
function formDataToObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};
  const entries = (formData as unknown as Iterable<[string, FormDataEntryValue]>);

  for (const [key, value] of entries) {
    obj[key] = value;
  }

  return obj;
}


// Update vendor
export async function updateVendorByAdmin(
  vendorId: string,
  prevState: UpdateVendorByAdminFormState,
  formData: FormData
): Promise<UpdateVendorByAdminFormState> {
  try {
    await verifyAdmin();

    const formDataObject = formDataToObject(formData);
    const parsed = UpdateVendorByAdminSchema.safeParse(formDataObject);
    
    if (!parsed.success) {
      return {
        error: 'Invalid data submitted.',
        fields: parsed.error.flatten().fieldErrors,
      };
    }

    const { shopName, ownerName, storeCategory, isActiveOnThru } = parsed.data;
    const vendorRef = db.collection('vendors').doc(vendorId);
    
    const dataToUpdate = {
      shopName,
      ownerName,
      storeCategory: storeCategory as Vendor['storeCategory'],
      type: storeCategory as Vendor['storeCategory'], // Sync type with category
      isActiveOnThru, // This is now a clean boolean
      updatedAt: Timestamp.now(),
    };
    
    await vendorRef.update(dataToUpdate);

    revalidatePath('/admin');
    revalidatePath(`/admin/${vendorId}/edit`);

    return { success: true, message: 'Vendor updated successfully.' };
  } catch (err) {
    console.error(`[updateVendorByAdmin] Error updating vendor ${vendorId}`, err);
    return {
      error: err instanceof Error ? err.message : 'Unknown error occurred.',
    };
  }
}

// Delete vendor & inventory
export async function deleteVendorAndInventory(
  vendorId: string
): Promise<DeleteVendorResult> {
  try {
    await verifyAdmin();

    if (!vendorId) return { success: false, error: 'Vendor ID is required.' };

    console.log(`[deleteVendorAndInventory] Deleting vendor ${vendorId}`);

    const batch = db.batch();

    const inventoryRef = db.collection('vendors').doc(vendorId).collection('inventory');
    const inventorySnapshot = await inventoryRef.get();
    inventorySnapshot.forEach((docSnap) => batch.delete(docSnap.ref));

    batch.delete(db.collection('vendors').doc(vendorId));

    await batch.commit();

    revalidatePath('/admin');

    return {
      success: true,
      message: `Deleted vendor and ${inventorySnapshot.size} inventory items.`,
    };
  } catch (err) {
    console.error(`[deleteVendorAndInventory] Error deleting vendor ${vendorId}`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred.',
    };
  }
}
