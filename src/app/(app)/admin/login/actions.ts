
'use server';

import { z } from 'zod';
import { getFirebaseAuth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required.'),
});

export async function handleAdminLogin(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid email or password format.' };
  }
  const { email, password } = validatedFields.data;

  try {
    // Step 1: Verify credentials using the client SDK
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Step 2: Verify the user's role on the server BEFORE creating the session cookie.
    const database = adminDb();
    if (!database) {
        // This is a server configuration error, so it's okay to be specific.
        throw new Error("Admin database is not configured. Cannot verify role.");
    }
    
    const userDocRef = database.collection('vendors').doc(uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists() || userDocSnap.data()?.role !== 'admin') {
      // This is a permissions error.
      return { success: false, error: 'Access denied. This account does not have admin privileges.' };
    }

    // Step 3: If role check passes, create the server-side session cookie.
    await createSession(uid);
    return { success: true };

  } catch (error: any) {
    console.error('[Admin Login] Error:', error.code, error.message);
    
    // Check for common Firebase Auth errors to return a specific message.
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      return { success: false, error: 'Invalid credentials. Please check your email and password.' };
    }

    // For other errors, return a more generic message.
    return { success: false, error: 'An unexpected error occurred during login.' };
  }
}
