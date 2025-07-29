
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Vendor } from '@/lib/inventoryModels';
import { ADMIN_UID } from '@/config/constants';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

// A type guard to check if an object is a Vendor
function isVendor(data: any): data is Vendor {
    return data && typeof data.shopName === 'string' && typeof data.email === 'string';
}

/**
 * Verifies a user UID and checks for a corresponding vendor profile.
 * Does NOT create a session cookie. This is to be called from Server Actions.
 * @param uid The user's Firebase UID.
 * @returns An object indicating success or failure.
 */
export async function validateUserForSession(uid: string): Promise<{success: boolean, error?: string}> {
  if (!uid) {
    return { success: false, error: 'User ID is required to validate a session.' };
  }

  // For the hardcoded admin user, bypass the Firestore document check.
  if (uid !== ADMIN_UID) {
    try {
        const vendorDocRef = db.collection('vendors').doc(uid);
        const vendorSnap = await vendorDocRef.get();
        
        if (!vendorSnap.exists) {
            console.error(`[validateUserForSession] Validation failed: Vendor profile not found for UID: ${uid}`);
            return { success: false, error: 'Your vendor profile is not yet available. Please try again shortly.' };
        }
    } catch (e) {
        console.error('[validateUserForSession] Firestore check failed during session validation:', e);
        return { success: false, error: 'Could not verify user profile due to a database error.' };
    }
  }
  
  return { success: true };
}


export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

export type SessionData = (Vendor & { 
    id: string; 
    uid: string; 
    isAuthenticated: true;
    role: 'vendor' | 'admin';
}) | { isAuthenticated: false };


export async function getSession(): Promise<SessionData> {
  const userUidFromCookie = cookies().get(AUTH_COOKIE_NAME)?.value;

  if (userUidFromCookie) {
    try {
      const userDocRef = db.collection('vendors').doc(userUidFromCookie);
      const userDocSnap = await userDocRef.get();

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        if (!isVendor(userData)) {
            console.warn(`[getSession] Firestore document for ${userUidFromCookie} is not a valid vendor object.`);
            cookies().delete(AUTH_COOKIE_NAME);
            return { isAuthenticated: false };
        }

        const isKnownAdmin = userDocSnap.id === ADMIN_UID;
        const userRole = isKnownAdmin ? 'admin' : (userData.role || 'vendor');

        // Convert timestamps to ISO strings for serialization
        const serializedData: any = {};
        for (const [key, value] of Object.entries(userData)) {
            if (value instanceof Timestamp) {
                serializedData[key] = value.toDate().toISOString();
            } else {
                serializedData[key] = value;
            }
        }

        return {
          ...serializedData,
          isAuthenticated: true,
          uid: userDocSnap.id,
          id: userDocSnap.id,
          role: userRole,
        };
      } else {
         // This handles the case where the cookie exists but the user doc doesn't.
         // This is a valid case for the admin user.
         if (userUidFromCookie === ADMIN_UID) {
           return {
             isAuthenticated: true,
             uid: ADMIN_UID,
             id: ADMIN_UID,
             role: 'admin',
             email: 'admin@thru.app',
             shopName: 'Thru Platform Admin',
             ownerName: 'Admin',
             storeCategory: 'Other',
             city: 'N/A',
             phoneCountryCode: '+91',
             phoneNumber: '0000000000',
             fullPhoneNumber: '+910000000000',
             weeklyCloseOn: 'Never Closed',
             openingTime: '12:00 AM (Midnight)',
             closingTime: '12:00 AM (Midnight)',
             shopFullAddress: 'N/A',
             latitude: 0,
             longitude: 0,
             isActiveOnThru: true,
             type: 'Other',
             createdAt: new Date().toISOString(),
             updatedAt: new Date().toISOString(),
           } as SessionData;
         }
         console.warn(`[getSession] User with UID from cookie not found in Firestore: ${userUidFromCookie}. Logging out.`);
         cookies().delete(AUTH_COOKIE_NAME);
      }
    } catch (error) {
      console.error('[getSession] Error fetching user for session from Firestore:', error);
    }
  }
  // Always return a valid object, even for unauthenticated users or on error.
  return { isAuthenticated: false };
}
