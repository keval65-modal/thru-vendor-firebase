
'use server';

import { z } from 'zod';
import { createSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin'; 
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
    // We use the client SDK here just to verify the password.
    // The UID it returns is what we trust.
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // NOW we use a server-side function to create the session,
    // which internally uses the Admin SDK to securely check the role.
    const sessionResult = await createSession(uid, true); // Pass `isAdminLogin = true`

    if (!sessionResult.success) {
        // This means the user authenticated but the role check failed.
        return { success: false, error: sessionResult.error || 'Access denied. This account does not have admin privileges.' };
    }

    // If role is verified and session is created, success!
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
    
    // This will catch the "Server configuration error" if the admin SDK fails in createSession
    if (error.message.includes("Could not verify admin role")) {
        return { success: false, error: error.message };
    }

    return { success: false, error: 'An unexpected error occurred during login.' };
  }
}
