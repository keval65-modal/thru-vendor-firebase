
'use server';

import { z } from 'zod';
import { getFirebaseAuth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin'; // Correct: Use the Admin SDK database instance
import { doc, getDoc } from 'firebase/firestore';


const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required.'),
});

export async function handleAdminLogin(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid email or password.' };
  }
  const { email, password } = validatedFields.data;

  try {
    // Step 1: Verify credentials using the client SDK
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Step 2: Verify the user's role on the server BEFORE creating the session cookie.
    // This is the critical authorization check.
    const database = adminDb();
    if (!database) {
        throw new Error("Admin database is not configured. Cannot verify role.");
    }
    
    const userDocRef = doc(database, 'vendors', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists() || userDocSnap.data()?.role !== 'admin') {
      return { success: false, error: 'Access denied. This account does not have admin privileges.' };
    }

    // Step 3: If role check passes, create the server-side session cookie.
    await createSession(uid);
    return { success: true };

  } catch (error: any) {
    console.error('[Admin Login] Error:', error.code, error.message);
    // Provide a generic error to avoid leaking information about which accounts exist.
    return { success: false, error: 'Invalid credentials or access denied.' };
  }
}
