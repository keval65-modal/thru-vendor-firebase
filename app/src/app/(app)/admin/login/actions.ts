
'use server';

import { redirect } from 'next/navigation';
import { ADMIN_UID } from '@/config/constants';
import { validateUserForSession } from '@/lib/auth';
import { cookies } from 'next/headers';


export type AdminLoginFormState = {
  success?: boolean;
  error?: string;
};

// This server action handles the "Direct Admin Login" button.
// It bypasses the password check, creates a session for the pre-defined admin user, and redirects.
export async function handleAdminLogin(): Promise<AdminLoginFormState> {
  try {
    if (!ADMIN_UID) {
        return { success: false, error: "Admin UID is not configured." };
    }

    // Validate the admin user (bypasses Firestore check)
    const sessionResult = await validateUserForSession(ADMIN_UID);
      
    if (!sessionResult.success) {
        throw new Error(sessionResult.error || "Admin session creation failed.");
    }
    
    // Set the cookie directly in the server action
    cookies().set('thru_vendor_auth_token', ADMIN_UID, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });

  } catch (err) {
      console.error('[Admin Login] Exception during login process:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return { success: false, error: message };
  }

  // Redirect to the admin panel after a successful session creation.
  // This must be called outside the try/catch block.
  redirect('/admin');
}
