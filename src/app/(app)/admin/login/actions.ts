
'use server';

import { z } from 'zod';
import { getFirebaseAuth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin'; // Use the Admin SDK

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
    // 1. Authenticate with Firebase Auth client SDK
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // 2. Verify role using the secure Admin SDK
    const database = adminDb();
    if (!database) {
        throw new Error("Admin database is not configured. Cannot verify role.");
    }
    
    const userDocRef = database.collection('vendors').doc(uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists() || userDocSnap.data()?.role !== 'admin') {
      return { success: false, error: 'Access denied. This account does not have admin privileges.' };
    }

    // 3. If role is 'admin', create the session cookie
    await createSession(uid);
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
    
    // For other errors, like the db not being configured.
    if (error.message.includes("Admin database is not configured")) {
        return { success: false, error: "Server configuration error. Could not verify admin role."}
    }

    return { success: false, error: 'An unexpected error occurred during login.' };
  }
}
