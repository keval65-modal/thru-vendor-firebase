
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

// MOCK DATABASE for users - In a real app, this would be a proper database.
const mockUsers: Array<Record<string, any>> = [
  {
    email: 'vendor@example.com', // Stored as lowercase
    password: 'password123', // In a real app, this MUST be a hashed password
    name: "Test Vendor",
    shopName: "Test Vendor's Shop",
    fullPhoneNumber: "+919876543210",
    openingTime: "09:00 AM",
    closingTime: "06:00 PM",
    shopImage: undefined,
    storeCategory: "Restaurant",
    ownerName: "Test Vendor Owner",
    gender: "Prefer not to say",
    city: "Testville",
    weeklyCloseOn: "Sunday",
    shopFullAddress: "123 Test Street, Testville",
    latitude: 12.9716,
    longitude: 77.5946,
  }
];

export async function loginWithEmailPassword(
  emailInput?: string,
  password?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!emailInput || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const lowercasedEmailInput = emailInput.toLowerCase().trim();

  // Assumes emails in mockUsers are already stored in lowercase
  const user = mockUsers.find(u => u.email === lowercasedEmailInput);

  if (user && user.password === password) { // Password comparison is exact
    cookies().set(AUTH_COOKIE_NAME, user.email, { // user.email is already lowercase
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true, message: 'Login successful!' };
  } else {
    return { success: false, error: 'Invalid email or password.' };
  }
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

export async function getSession(): Promise<{ isAuthenticated: boolean; email?: string; name?: string; shopName?: string } | null> {
  const userEmailFromCookie = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (userEmailFromCookie) {
    // Assumes userEmailFromCookie is lowercase (because it was stored as such)
    // and emails in mockUsers are lowercase.
    const user = mockUsers.find(u => u.email === userEmailFromCookie);
    if (user) {
      return { isAuthenticated: true, email: user.email, name: user.name, shopName: user.shopName };
    }
  }
  return { isAuthenticated: false };
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session?.isAuthenticated || false;
}

export async function registerNewVendor(vendorData: any): Promise<{ success: boolean; error?: string; userId?: string }> {
  const trimmedEmail = vendorData.email?.trim();
  if (!trimmedEmail) {
    return { success: false, error: 'Email is required for registration.' };
  }
  const lowercasedEmail = trimmedEmail.toLowerCase();
  
  const fullPhoneNumber = `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`;

  // Check for existing user by email (case-insensitive)
  const existingUserByEmail = mockUsers.find(u => u.email === lowercasedEmail);
  if (existingUserByEmail) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  // **SECURITY WARNING**: Storing plain text passwords is a major security risk.
  // In a real application, `vendorData.password` MUST be hashed here before saving.
  const newUser = {
    ...vendorData,
    email: lowercasedEmail, // Store email as lowercase
    password: vendorData.password, 
    fullPhoneNumber: fullPhoneNumber,
  };
  delete newUser.confirmPassword;

  mockUsers.push(newUser);
  console.log("Mock User DB Updated with new user:", newUser);
  console.log("Current Mock User DB:", mockUsers);

  return { success: true, userId: newUser.email }; // Using email as a mock userId
}
