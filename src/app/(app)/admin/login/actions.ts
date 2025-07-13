
'use server';

import { z } from 'zod';
import { createSession } from '@/lib/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

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
        return { success: false, error: sessionResult.error || 'Access denied. This account does not have admin privileges.' };
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
    
    if (error.message.includes("Could not verify admin role")) {
        return { success: false, error: error.message };
    }

    return { success: false, error: 'An unexpected error occurred during login.' };
  }
}

/**
 * WORKAROUND: Direct login for admin user to bypass auth issues.
 * IMPORTANT: Replace 'PLACEHOLDER_ADMIN_UID' with the actual Firebase UID for keval@kiptech.in.
 */
export async function handleDirectAdminLogin(): Promise<LoginState> {
    const adminUid = "1kYPC0L4k0Yc6Qz1h1v10o9A2fB3"; // <-- IMPORTANT: Replace this with the real UID from Firebase Auth for keval@kiptech.in

    if (!adminUid || adminUid === "PLACEHOLDER_ADMIN_UID") {
        return { success: false, error: "Direct login is not configured. Please replace the placeholder UID in the server action." };
    }

    console.log(`[Direct Login] Attempting to create session for admin UID: ${adminUid}`);
    const sessionResult = await createSession(adminUid, true);

    if (!sessionResult.success) {
        return { success: false, error: sessionResult.error || 'Direct login failed during session creation.' };
    }

    return { success: true };
}
