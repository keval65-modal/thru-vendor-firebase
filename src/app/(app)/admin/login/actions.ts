
'use server';

import { createSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ADMIN_UID } from '@/config/constants';

export type AdminLoginFormState = {
  success?: boolean;
  error?: string;
};

// This server action handles the "Direct Admin Login" button.
// It bypasses the password check and creates a session for the pre-defined admin user.
export async function handleAdminLogin(): Promise<AdminLoginFormState> {
  try {
    const sessionResult = await createSession(ADMIN_UID);

    if (!sessionResult.success) {
      console.error('[Admin Login] Failed to create admin session:', sessionResult.error);
      return {
        success: false,
        error: sessionResult.error || 'Admin login failed. Please contact support.',
      };
    }
    
    // The redirect will be handled by the client upon successful session creation.
    // Returning a success state allows the client to route appropriately.
    return { success: true };

  } catch (err) {
      console.error('[Admin Login] Exception during login process:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return { success: false, error: message };
  }
}
