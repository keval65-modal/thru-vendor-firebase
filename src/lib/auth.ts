
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
import type { Vendor } from '@/lib/inventoryModels';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

export async function createSession(uid: string, isAdminLogin = false): Promise<{success: boolean, error?: string}> {
  if (!uid) {
    return { success: false, error: 'User ID is required to create a session.' };
  }
  
  const db = adminDb();
  if (!db) {
    return { success: false, error: 'Server configuration error. Cannot verify user role.' };
  }

  // If this is an admin login (direct or standard), we must verify their role.
  if (isAdminLogin) {
      try {
          const userDocRef = db.collection('vendors').doc(uid);
          const userDocSnap = await userDocRef.get();

          if (!userDocSnap.exists || userDocSnap.data()?.role !== 'admin') {
              return { success: false, error: 'Access denied. This account does not have admin privileges.' };
          }
      } catch (error) {
          console.error('[createSession] Admin role check failed:', error);
          return { success: false, error: 'Server configuration error. Could not verify admin role.' };
      }
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
    const db = adminDb();
    if (!db) {
        console.error('[getSession] Admin DB not available. Cannot fetch user details.');
        return { isAuthenticated: false };
    }

    try {
      const userDocRef = db.collection('vendors').doc(userUidFromCookie);
      const userDocSnap = await userDocRef.get();

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
