
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

// MOCK DATABASE for users - In a real app, this would be a proper database.
// This array is in-memory and will reset if the server restarts.
let mockUsers: Array<Record<string, any>> = [
  {
    email: 'vendor@example.com', // Stored as lowercase
    password: 'password123', // In a real app, this MUST be a hashed password
    shopName: "Test Vendor's Shop",
    storeCategory: "Restaurant",
    ownerName: "Test Vendor Owner",
    phoneCountryCode: "+91",
    phoneNumber: "9876543210",
    fullPhoneNumber: "+919876543210", // For potential OTP login later
    gender: "Prefer not to say",
    city: "Testville",
    openingTime: "09:00 AM",
    closingTime: "06:00 PM",
    weeklyCloseOn: "Sunday",
    shopFullAddress: "123 Test Street, Testville",
    latitude: 12.9716,
    longitude: 77.5946,
    shopImage: undefined,
  }
];

export async function loginWithEmailPassword(
  emailInput?: string,
  password?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  console.log('[Auth Login] Current mockUsers before login attempt:', JSON.stringify(mockUsers.map(u => ({ email: u.email, shopName: u.shopName }))));

  if (!emailInput || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const lowercasedEmailInput = emailInput.toLowerCase().trim();

  const user = mockUsers.find(u => u.email === lowercasedEmailInput);

  if (user && user.password === password) {
    cookies().set(AUTH_COOKIE_NAME, user.email, {
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

export async function getSession(): Promise<{
    isAuthenticated: boolean;
    email?: string;
    name?: string;
    shopName?: string;
    storeCategory?: string;
  } | null> {
  const userEmailFromCookie = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (userEmailFromCookie) {
    const user = mockUsers.find(u => u.email === userEmailFromCookie);
    if (user) {
      return {
        isAuthenticated: true,
        email: user.email,
        name: user.ownerName,
        shopName: user.shopName,
        storeCategory: user.storeCategory
      };
    }
  }
  return { isAuthenticated: false };
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session?.isAuthenticated || false;
}

export interface VendorRegistrationData {
  shopName: string;
  storeCategory: string;
  ownerName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  password?: string;
  gender?: string;
  city: string;
  weeklyCloseOn: string;
  openingTime: string;
  closingTime: string;
  shopFullAddress: string;
  latitude: number;
  longitude: number;
  shopImage?: any;
}


export async function registerNewVendor(vendorData: VendorRegistrationData): Promise<{ success: boolean; error?: string; userId?: string }> {
  const trimmedEmail = vendorData.email?.trim();
  if (!trimmedEmail) {
    return { success: false, error: 'Email is required for registration.' };
  }
  const lowercasedEmail = trimmedEmail.toLowerCase();
  const fullPhoneNumber = `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`;

  const existingUserByEmail = mockUsers.find(u => u.email === lowercasedEmail);
  if (existingUserByEmail) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const existingUserByPhone = mockUsers.find(u => u.fullPhoneNumber === fullPhoneNumber);
  if (existingUserByPhone) {
    return { success: false, error: 'An account with this phone number already exists.' };
  }

  const newUser = {
    ...vendorData,
    email: lowercasedEmail,
    password: vendorData.password, // In a real app, HASH THIS PASSWORD!
    fullPhoneNumber: fullPhoneNumber,
  };

  mockUsers.push(newUser);
  console.log("[Auth Register] New vendor added to mockUsers. Email:", newUser.email, "Shop:", newUser.shopName);
  console.log("[Auth Register] mockUsers size after registration:", mockUsers.length);


  return { success: true, userId: newUser.email };
}
