
'use server';

import { z } from 'zod';
import { createSession } from '@/lib/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { adminDb } from '@/lib/firebase-admin';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required.'),
});

export type LoginState = {
  success: boolean;
  error?: string;
  fields?: Record<string, string[]>;
}

export async function handleAdminLogin(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return { 
      success: false, 
      error: 'Invalid email or password format.',
      fields: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { email, password } = validatedFields.data;
  
  try {
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const sessionResult = await createSession(uid, true);

    if (!sessionResult.success) {
        return { success: false, error: sessionResult.error };
    }

    return { success: true };

  } catch (error: any) {
    console.error('[Admin Login] Error:', error.code, error.message);
    
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      return { success: false, error: 'Invalid credentials. Please check your email and password.' };
    }
    
    return { success: false, error: 'An unexpected error occurred during login.' };
  }
}

/**
 * WORKAROUND: Direct login for admin user to bypass auth issues.
 * This calls `createSession` with `isAdminLogin` set to true, which performs the role check.
 */
export async function handleDirectAdminLogin(): Promise<LoginState> {
    const adminUid = "1kYPC0L4k0Yc6Qz1h1v10o9A2fB3"; // UID for keval@kiptech.in

    if (!adminUid) {
        return { success: false, error: "Direct login is not configured correctly." };
    }

    console.log(`[Direct Login] Attempting to create session for admin UID: ${adminUid}`);
    // The `true` here is critical. It tells createSession to perform the admin role check.
    const sessionResult = await createSession(adminUid, true);

    if (!sessionResult.success) {
        return { success: false, error: sessionResult.error || 'Direct login failed during session creation.' };
    }

    return { success: true };
}
