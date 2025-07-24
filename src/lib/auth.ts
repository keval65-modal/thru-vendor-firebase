
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase-admin';
import { doc, getDoc } from 'firebase/firestore';
import type { Vendor } from '@/lib/inventoryModels';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';
const ADMIN_UID = '1kYPC0L4k0Yc6Qz1h1v10o9A2fB3'; // UID for keval@kiptech.in

export async function createSession(uid: string, bypassRoleCheck = false): Promise<{success: boolean, error?: string}> {
  if (!uid) {
    return { success: false, error: 'User ID is required to create a session.' };
  }

  // Enforce that a vendor document must exist before creating a session, unless it's a bypass (e.g., admin).
  try {
      const vendorDocRef = doc(db, 'vendors', uid);
      const vendorSnap = await getDoc(vendorDocRef);
      
      // If we are NOT bypassing the check (i.e. for a regular vendor) and the doc doesn't exist, fail.
      if (!vendorSnap.exists() && !bypassRoleCheck) {
          console.error(`[createSession] Session creation failed: Vendor profile not found for UID: ${uid}`);
          return { success: false, error: 'Your vendor profile is not yet available. Please try again shortly or contact support if this persists.' };
      }
      
       if (!vendorSnap.exists() && bypassRoleCheck) {
          console.warn(`[createSession] Admin user with UID ${uid} does not have a corresponding vendor profile in Firestore. This is not fatal for admin login.`);
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

export async function getSession(): Promise<{
    isAuthenticated: boolean;
    uid?: string;
    email?: string;
    shopImageUrl?: string;
    ownerName?: string; // Mapped from ownerName
    shopName?: string;
    storeCategory?: Vendor['storeCategory'];
    type?: Vendor['storeCategory']; // For customer app compatibility
    isActiveOnThru?: boolean;
    role?: 'vendor' | 'admin';
  } | null> {
  const userUidFromCookie = cookies().get(AUTH_COOKIE_NAME)?.value;

  if (userUidFromCookie) {
    try {
      const userDocRef = doc(db, 'vendors', userUidFromCookie);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as Vendor;
        // Check if the user is the specific admin user.
        const isKnownAdmin = userDocSnap.id === ADMIN_UID;
        // Assign role based on whether it's the admin UID or the role field in the doc.
        const userRole = isKnownAdmin ? 'admin' : userData.role || 'vendor';

        return {
          isAuthenticated: true, // A valid doc means they are authenticated.
          uid: userDocSnap.id,
          email: userData.email,
          ownerName: userData.ownerName,
          shopName: userData.shopName,
          shopImageUrl: userData.shopImageUrl,
          storeCategory: userData.storeCategory,
          type: userData.type || userData.storeCategory,
          isActiveOnThru: userData.isActiveOnThru,
          role: userRole,
        };
      } else {
         console.warn(`[Auth GetSession] User with UID from cookie not found in Firestore: ${userUidFromCookie}. Logging out.`);
         // If user has a cookie but no firestore doc, their account was likely deleted.
         // Force a logout by clearing the cookie.
         cookies().delete(AUTH_COOKIE_NAME);
      }
    } catch (error) {
      console.error('[Auth GetSession] Error fetching user for session from Firestore:', error);
    }
  }
  return { isAuthenticated: false };
}


export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session?.isAuthenticated || false;
}
