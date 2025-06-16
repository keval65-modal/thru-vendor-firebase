'use server';

// This is a mock authentication system.
// In a real application, use a secure authentication library like NextAuth.js.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';
const MOCK_USER_EMAIL = 'vendor@example.com';
const MOCK_PASSWORD = 'password123';

export async function login(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Simulate database check
  if (email === MOCK_USER_EMAIL && password === MOCK_PASSWORD) {
    cookies().set(AUTH_COOKIE_NAME, email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true };
  } else {
    return { success: false, error: 'Invalid email or password.' };
  }
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

export async function getSession(): Promise<{ isAuthenticated: boolean; email?: string } | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    // In a real app, you'd validate the token and fetch user details
    return { isAuthenticated: true, email: token };
  }
  return { isAuthenticated: false };
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session?.isAuthenticated || false;
}
