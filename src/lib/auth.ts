
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

// MOCK DATABASE for users - In a real app, this would be a proper database.
const mockUsers: Array<Record<string, any>> = [
  { 
    email: 'vendor@example.com', 
    password: 'password123', 
    name: "Test Vendor", 
    shopName: "Test Vendor's Shop",
    fullPhoneNumber: "+919876543210",
    openingTime: "09:00 AM",
    closingTime: "06:00 PM",
    // Add other fields from signup form as needed for mock user
  }
];

export async function establishPhoneSession(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  if (!phoneNumber) {
    return { success: false, error: 'Phone number is required.' };
  }

  const user = mockUsers.find(u => u.fullPhoneNumber === phoneNumber);

  if (user) {
    cookies().set(AUTH_COOKIE_NAME, phoneNumber, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true };
  } else {
    return { success: false, error: 'Phone number not registered.' };
  }
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

export async function getSession(): Promise<{ isAuthenticated: boolean; email?: string; name?: string; phoneNumber?: string } | null> {
  const tokenPhoneNumber = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (tokenPhoneNumber) {
    const user = mockUsers.find(u => u.fullPhoneNumber === tokenPhoneNumber);
    if (user) {
      return { isAuthenticated: true, email: user.email, name: user.name, phoneNumber: user.fullPhoneNumber };
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

  const existingUserByPhone = mockUsers.find(u => u.fullPhoneNumber === fullPhoneNumber);
  if (existingUserByPhone) {
    return { success: false, error: 'An account with this phone number already exists.' };
  }
  
  // **SECURITY WARNING**: Storing plain text passwords is a major security risk.
  // In a real application, `vendorData.password` MUST be hashed here before saving.
  const newUser = {
    ...vendorData, // Includes all form fields like shopName, ownerName, email, openingTime, closingTime etc.
    password: vendorData.password, 
    fullPhoneNumber: fullPhoneNumber,
  };
  delete newUser.confirmPassword; 
  delete newUser.phoneCountryCode; 
  delete newUser.phoneNumber; 
  
  mockUsers.push(newUser);
  
  console.log("Mock User DB Updated with new user:", newUser);
  console.log("Current Mock User DB:", mockUsers);

  return { success: true, userId: fullPhoneNumber }; 
}
