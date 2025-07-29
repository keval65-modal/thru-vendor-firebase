
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_UID } from '@/config/constants';
import { db } from '@/lib/firebase-admin';

export type AdminLoginFormState = {
  success?: boolean;
  error?: string;
};

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

// This server action handles the "Direct Admin Login" button.
// It bypasses the password check, creates a session for the pre-defined admin user, and redirects.
export async function handleAdminLogin(): Promise<AdminLoginFormState> {
  try {
    // Verify admin user exists or is the hardcoded one.
    // This is a simplified check.
    if (ADMIN_UID) {
      cookies().set(AUTH_COOKIE_NAME, ADMIN_UID, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
    } else {
        return { success: false, error: "Admin UID is not configured." };
    }
  } catch (err) {
      console.error('[Admin Login] Exception during login process:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return { success: false, error: message };
  }

  // Redirect to the admin panel after a successful session creation.
  // This must be called outside the try/catch block.
  redirect('/admin');
}
