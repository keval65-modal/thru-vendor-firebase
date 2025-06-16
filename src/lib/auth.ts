
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

// MOCK DATABASE for users - In a real app, this would be a proper database.
const mockUsers: Array<Record<string, any>> = [
  {
    email: 'vendor@example.com',
    password: 'password123', // In a real app, this MUST be a hashed password
    name: "Test Vendor",
    shopName: "Test Vendor's Shop",
    fullPhoneNumber: "+919876543210", // Retained for vendor data
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
  email?: string,
  password?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const user = mockUsers.find(u => u.email === email);

  if (user && user.password === password) { // In a real app, compare hashed password
    cookies().set(AUTH_COOKIE_NAME, user.email, { // Using email as token for mock simplicity
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
  const userEmail = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (userEmail) {
    const user = mockUsers.find(u => u.email === userEmail);
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
  const fullPhoneNumber = `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`;

  const existingUserByEmail = mockUsers.find(u => u.email === vendorData.email);
  if (existingUserByEmail) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  // Optional: Check for phone number uniqueness if it's still a business requirement,
  // but not for login purposes anymore if login is email/password.
  // const existingUserByPhone = mockUsers.find(u => u.fullPhoneNumber === fullPhoneNumber);
  // if (existingUserByPhone) {
  //   return { success: false, error: 'An account with this phone number already exists.' };
  // }

  // **SECURITY WARNING**: Storing plain text passwords is a major security risk.
  // In a real application, `vendorData.password` MUST be hashed here before saving.
  const newUser = {
    ...vendorData, // Includes all form fields
    password: vendorData.password, // Store password (MUST BE HASHED in real app)
    fullPhoneNumber: fullPhoneNumber, // Store full phone number
  };
  delete newUser.confirmPassword; // Don't store confirmPassword
  // No need to delete phoneCountryCode or phoneNumber as they are part of vendorData

  mockUsers.push(newUser);

  console.log("Mock User DB Updated with new user:", newUser);
  console.log("Current Mock User DB:", mockUsers);

  return { success: true, userId: newUser.email }; // Using email as a mock userId
}
