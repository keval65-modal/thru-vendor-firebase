
'use server';

import { z } from 'zod';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }).toLowerCase(),
});

export type ForgotPasswordFormState = {
  message?: string;
  error?: string;
  fields?: Record<string, string[]>;
};

export async function handlePasswordResetRequest(
  prevState: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const validatedFields = ForgotPasswordSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid email provided.",
      fields: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email } = validatedFields.data;

  try {
    // This is a client SDK action, but it's fine to call from a server action.
    // It does not use the admin SDK.
    await sendPasswordResetEmail(auth, email);
    console.log(`[Password Reset] Sent password reset email to: ${email}`);
    // Return a generic success message to avoid leaking information about which emails are registered.
    return {
      message: "If an account with that email exists, a password reset link has been sent. Please check your inbox.",
    };
  } catch (error: any) {
    console.error('[Password Reset] Error sending password reset email:', error);
    // Also return a generic message on error for the same security reason.
    return {
      message: "If an account with that email exists, a password reset link has been sent. Please check your inbox.",
    };
  }
}
