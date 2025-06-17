
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

// MOCK DATABASE for users - In a real app, this would be a proper database.
let mockUsers: Array<Record<string, any>> = [
  {
    email: 'vendor@example.com', // Stored as lowercase
    password: 'password123', // In a real app, this MUST be a hashed password
    shopName: "Test Vendor's Shop",
    storeCategory: "Restaurant", // Added storeCategory
    ownerName: "Test Vendor Owner",
    phoneCountryCode: "+91",
    phoneNumber: "9876543210",
    fullPhoneNumber: "+919876543210",
    gender: "Prefer not to say",
    city: "Testville",
    weeklyCloseOn: "Sunday",
    openingTime: "09:00 AM",
    closingTime: "06:00 PM",
    shopFullAddress: "123 Test Street, Testville",
    latitude: 12.9716,
    longitude: 77.5946,
    shopImage: undefined, // Assuming shopImage is handled elsewhere or is a URL
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

export async function getSession(): Promise<{ 
    isAuthenticated: boolean; 
    email?: string; 
    name?: string; 
    shopName?: string; 
    storeCategory?: string; 
  } | null> {
  const userEmailFromCookie = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (userEmailFromCookie) {
    // Assumes userEmailFromCookie is lowercase
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
  password?: string; // Password is now optional here if handled by OTP, but form sends it
  gender?: string;
  city: string;
  weeklyCloseOn: string;
  openingTime: string;
  closingTime: string;
  shopFullAddress: string;
  latitude: number;
  longitude: number;
  shopImage?: any; // For file uploads, Zod needs .refine or a custom type. Store as URL/path eventually.
  // confirmPassword is not needed on server if password exists and is validated
}


export async function registerNewVendor(vendorData: VendorRegistrationData): Promise<{ success: boolean; error?: string; userId?: string }> {
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
  
  // Check for existing user by phone number
  const existingUserByPhone = mockUsers.find(u => u.fullPhoneNumber === fullPhoneNumber);
  if (existingUserByPhone) {
    return { success: false, error: 'An account with this phone number already exists.' };
  }

  // **SECURITY WARNING**: Storing plain text passwords is a major security risk.
  // In a real application, `vendorData.password` MUST be hashed here before saving.
  const newUser = {
    ...vendorData,
    email: lowercasedEmail, // Store email as lowercase
    password: vendorData.password, // Storing plain password - HASH IN PRODUCTION!
    fullPhoneNumber: fullPhoneNumber,
  };
  // delete newUser.confirmPassword; // Not needed for storage if it was ever there

  mockUsers.push(newUser);
  console.log("Mock User DB Updated with new user:", newUser.shopName, newUser.email);
  console.log("Current Mock User DB Size:", mockUsers.length);


  return { success: true, userId: newUser.email }; // Using email as a mock userId
}
