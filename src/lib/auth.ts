
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
import type { Vendor } from '@/lib/inventoryModels';
import { db } from '@/lib/firebase-admin-client';
import { doc, getDoc } from 'firebase/firestore';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

export async function createSession(uid: string): Promise<{ success: boolean, error?: string, role?: 'vendor' | 'admin' }> {
  if (!uid) {
    return { success: false, error: 'User ID is required to create a session.' };
  }
  
  // The client has already authenticated with Firebase.
  // We MUST check their role from the database before setting the cookie to return it.
  const database = adminDb() || db;
  let role: 'vendor' | 'admin' = 'vendor'; // Default to 'vendor'
  
  try {
    const userDocRef = doc(database, 'vendors', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as Vendor;
        role = userData.role || 'vendor';
    } else {
        // This case should be rare, but indicates a user authenticated with Firebase Auth
        // but has no corresponding 'vendors' document.
        return { success: false, error: 'User profile not found in database.' };
    }
  } catch (e) {
     const errorMessage = e instanceof Error ? e.message : 'An unknown database error occurred.';
     console.error(`[Auth CreateSession] Could not fetch role for UID ${uid}. Error: ${errorMessage}`);
     return { success: false, error: `Could not verify user role: ${errorMessage}` };
  }
    
  // If role check was successful, set the session cookie.
  cookies().set(AUTH_COOKIE_NAME, uid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });
  
  // Return success and the determined role for the client to use for redirection.
  return { success: true, role };
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
