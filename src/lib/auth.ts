'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase-admin';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Vendor } from '@/lib/inventoryModels';
import { ADMIN_UID } from '@/config/constants';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

// A type guard to check if an object is a Vendor
function isVendor(data: any): data is Vendor {
    return data && typeof data.shopName === 'string' && typeof data.email === 'string';
}

export async function createSession(uid: string, bypassRoleCheck = false): Promise<{success: boolean, error?: string}> {
  if (!uid) {
    return { success: false, error: 'User ID is required to create a session.' };
  }

  try {
      const vendorDocRef = doc(db, 'vendors', uid);
      const vendorSnap = await getDoc(vendorDocRef);
      
      if (!vendorSnap.exists()) {
          console.error(`[createSession] Session creation failed: Vendor profile not found for UID: ${uid}`);
          return { success: false, error: 'Your vendor profile is not yet available. Please try again shortly.' };
      }

      const vendorData = vendorSnap.data();

      // For direct admin login, we trust the caller has verified the admin status.
      if (bypassRoleCheck) {
          if (vendorData?.role !== 'admin' && uid !== ADMIN_UID) {
             console.warn(`[createSession] Bypass role check used for non-admin user ${uid}`);
          }
      } else {
          // For regular login, we could add more role checks if needed, but for now, just existing is enough.
      }
      
  } catch (e) {
      console.error('[createSession] Firestore check failed during session creation:', e);
      return { success: false, error: 'Could not verify user profile due to a database error.' };
  }
  
  cookies().set(AUTH_COOKIE_NAME, uid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });

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
      const userDocRef = doc(db, 'vendors', userUidFromCookie);
      const userDocSnap = await getDoc(userDocRef);

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
