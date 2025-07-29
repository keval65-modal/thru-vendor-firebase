
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth as adminAuth } from '@/lib/firebase-admin';
import { validateUserForSession } from '@/lib/auth';

const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginFormState = {
    success: boolean;
    error?: string;
};

// Helper function to convert FormData to a plain object
function formDataToObject(formData: FormData): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const [key, value] of (formData as any).entries()) {
        obj[key] = value;
    }
    return obj;
}


// This is a new Server Action to handle the entire login flow.
export async function handleLogin(
  prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const validatedFields = loginFormSchema.safeParse(
    formDataToObject(formData)
  );

  if (!validatedFields.success) {
    return { success: false, error: "Invalid email or password." };
  }
  
  const { email, password } = validatedFields.data;

  try {
    // NOTE: This flow relies on the client SDK to have verified the password.
    // A robust server-only auth would use a different strategy (e.g. Identity Platform).
    // Here we get the user by email, which confirms they exist.
    const userRecord = await adminAuth.getUserByEmail(email);
    
    // After getting user, validate they have a vendor profile
    const sessionResult = await validateUserForSession(userRecord.uid);
    if (!sessionResult.success) {
        return { success: false, error: sessionResult.error };
    }

    // Set cookie
    cookies().set('thru_vendor_auth_token', userRecord.uid, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });
    
    // Return success, redirect will be handled on the client via useActionState
    return { success: true };

  } catch (error: any) {
    console.error('[Login Action] Error:', error.code, error.message);
    let errorMessage = "Invalid email or password.";
    // Map Firebase Admin SDK auth errors to a generic message
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
    }
    return { success: false, error: errorMessage };
  }
}
