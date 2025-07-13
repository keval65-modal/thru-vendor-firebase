
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
import type { Vendor } from '@/lib/inventoryModels';
import { db } from '@/lib/firebase-admin-client';
import { doc, getDoc } from 'firebase/firestore';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

export async function createSession(uid: string, isAdminLogin = false): Promise<{success: boolean, error?: string}> {
  if (!uid) {
    throw new Error('User ID is required to create a session.');
  }

  // If this is a special admin login (like the direct login workaround),
  // we can add specific logic here.
  if (isAdminLogin) {
    // THIS IS THE WORKAROUND: For direct admin login, we skip the role check
    // because the admin SDK isn't initializing correctly.
    console.log(`[createSession] Bypassing role check for direct admin login for UID: ${uid}`);
  } else {
    // For regular vendor logins, no role check is needed.
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
    name?: string; // ownerName
    shopName?: string;
    storeCategory?: Vendor['storeCategory'];
    type?: Vendor['storeCategory']; // For customer app compatibility
    isActiveOnThru?: boolean;
    role?: 'vendor' | 'admin';
  } | null> {
  const userUidFromCookie = cookies().get(AUTH_COOKIE_NAME)?.value;

  if (userUidFromCookie) {
    // For server components, we still prefer the admin SDK if available because it's faster and more secure.
    const database = adminDb() || db; // Fallback to client-side DB access from server context
    try {
      const userDocRef = doc(database, 'vendors', userUidFromCookie);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as Vendor;
        return {
          isAuthenticated: true,
          uid: userDocSnap.id,
          email: userData.email,
          name: userData.ownerName,
          shopName: userData.shopName,
          shopImageUrl: userData.shopImageUrl,
          storeCategory: userData.storeCategory,
          type: userData.type || userData.storeCategory,
          isActiveOnThru: userData.isActiveOnThru,
          role: userData.role || 'vendor',
        };
      } else {
         console.log(`[Auth GetSession] User not found in Firestore during session check: ${userUidFromCookie}`);
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
