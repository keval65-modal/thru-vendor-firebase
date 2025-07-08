
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Vendor } from '@/lib/inventoryModels';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

export async function createSession(uid: string): Promise<{ success: boolean, error?: string, role?: 'vendor' | 'admin' }> {
  if (!uid) {
    return { success: false, error: 'User ID is required to create a session.' };
  }

  try {
    // Verify the user exists in Firestore and get their role
    const userDocRef = doc(db, 'vendors', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return { success: false, error: 'User profile not found in database.' };
    }
    
    const userData = userDocSnap.data() as Vendor;

    cookies().set(AUTH_COOKIE_NAME, uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    
    return { success: true, role: userData.role || 'vendor' };
  } catch (error) {
    console.error('[Auth CreateSession] Error:', error);
    return { success: false, error: 'An unexpected error occurred during session creation.' };
  }
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

export async function getSession(): Promise<{
    isAuthenticated: boolean;
    uid?: string;
    email?: string;
    name?: string; // ownerName
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
        return {
          isAuthenticated: true,
          uid: userDocSnap.id,
          email: userData.email,
          name: userData.ownerName,
          shopName: userData.shopName,
          storeCategory: userData.storeCategory,
          type: userData.type || userData.storeCategory, // Fallback to storeCategory if type is missing
          isActiveOnThru: userData.isActiveOnThru,
          role: userData.role || 'vendor', // Return the role, default to 'vendor'
        };
      } else {
         console.log(`[Auth GetSession] User not found in Firestore during session check: ${userUidFromCookie}`);
      }
    } catch (error) {
      console.error('[Auth GetSession] Error fetching user for session from Firestore:', error);
      // Fall through to return unauthenticated
    }
  }
  return { isAuthenticated: false };
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session?.isAuthenticated || false;
}
