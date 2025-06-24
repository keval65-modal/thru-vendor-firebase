
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Vendor } from '@/lib/inventoryModels';

export async function createVendorRecord(uid: string, data: Omit<Vendor, 'id' | 'password'>): Promise<{ success: boolean; error?: string }> {
  if (!uid) {
    return { success: false, error: 'User ID is missing.' };
  }

  try {
    const vendorToSave: Omit<Vendor, 'id' | 'password'> = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      type: data.storeCategory, // Ensure 'type' is set on creation
      isActiveOnThru: data.isActiveOnThru ?? true, // Default to active
    };

    await setDoc(doc(db, 'vendors', uid), vendorToSave);

    console.log("[Auth Register] New vendor document created in Firestore. UID:", uid);
    return { success: true };

  } catch (error) {
    console.error('[Auth Register] Error creating vendor document in Firestore:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
}
