
'use server';

import { redirect } from 'next/navigation';
import { ADMIN_UID } from '@/config/constants';
import { createSession } from '@/lib/auth';


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

    // Create a server-side session (cookie)
    const sessionResult = await createSession(ADMIN_UID);
      
    if (!sessionResult.success) {
        throw new Error(sessionResult.error || "Admin session creation failed.");
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
