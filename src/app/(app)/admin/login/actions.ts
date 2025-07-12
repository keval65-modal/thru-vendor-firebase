
'use server';

import { z } from 'zod';
import { getFirebaseAuth, firebaseAdminApp } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import type { Vendor } from '@/lib/inventoryModels';
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
    // This part runs on the server, but uses the client-facing SDK to check the password.
    // It's a common pattern when you don't want to enable the Identity Platform Admin API.
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // CRITICAL STEP: After password is verified, check for admin role in Firestore using the Admin SDK.
    const db = adminDb();
    if (!db) {
        return { success: false, error: "Server database not configured. Cannot verify role." };
    }
    const userDocRef = doc(db, 'vendors', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists() || userDocSnap.data()?.role !== 'admin') {
      return { success: false, error: 'Access denied. This account does not have admin privileges.' };
    }

    // If role check passes, create the server-side session cookie.
    await createSession(uid);
    return { success: true };

  } catch (error: any) {
    console.error('[Admin Login] Error:', error.code);
    // Provide a generic error to avoid leaking information about which accounts exist.
    return { success: false, error: 'Invalid credentials or access denied.' };
  }
}
