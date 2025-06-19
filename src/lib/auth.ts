
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import type { Vendor } from '@/lib/inventoryModels'; // Import Vendor type

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

// Placeholder for password "hashing" - NOT SECURE FOR PRODUCTION
// In a real app, use a strong hashing library like bcrypt.
function simulateHashPassword(password: string): string {
  // This is a trivial transformation and NOT a real hash.
  // It's only for demonstration purposes to make the flow work.
  // Replace with actual hashing (e.g., bcrypt.hashSync(password, saltRounds))
  return `simulated_hash_${password}_!secure`;
}

function simulateVerifyPassword(password: string, hashedPasswordFromDb: string): boolean {
  // This is a trivial comparison and NOT a real hash verification.
  // Replace with actual hash verification (e.g., bcrypt.compareSync(password, hashedPasswordFromDb))
  return `simulated_hash_${password}_!secure` === hashedPasswordFromDb;
}


export async function loginWithEmailPassword(
  emailInput?: string,
  password?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!emailInput || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const lowercasedEmailInput = emailInput.toLowerCase().trim();

  try {
    const userDocRef = doc(db, 'vendors', lowercasedEmailInput);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.log(`[Auth Login] User not found in Firestore: ${lowercasedEmailInput}`);
      return { success: false, error: 'Invalid email or password.' };
    }

    const userData = userDocSnap.data();
    
    if (!userData.password) {
        console.log(`[Auth Login] User in Firestore has no password field: ${lowercasedEmailInput}`);
        return { success: false, error: 'Authentication error. Please contact support.' };
    }

    // In a real app, verify the hashed password
    const passwordIsValid = simulateVerifyPassword(password, userData.password);

    if (passwordIsValid) {
      cookies().set(AUTH_COOKIE_NAME, userData.email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
      return { success: true, message: 'Login successful!' };
    } else {
      console.log(`[Auth Login] Password mismatch for user: ${lowercasedEmailInput}`);
      return { success: false, error: 'Invalid email or password.' };
    }
  } catch (error) {
    console.error('[Auth Login] Error logging in user from Firestore:', error);
    return { success: false, error: 'An unexpected error occurred during login.' };
  }
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

export async function getSession(): Promise<{
    isAuthenticated: boolean;
    email?: string;
    name?: string; // ownerName
    shopName?: string;
    storeCategory?: Vendor['storeCategory'];
    type?: Vendor['storeCategory']; // For customer app compatibility
    isActiveOnThru?: boolean;
  } | null> {
  const userEmailFromCookie = cookies().get(AUTH_COOKIE_NAME)?.value;

  if (userEmailFromCookie) {
    try {
      const userDocRef = doc(db, 'vendors', userEmailFromCookie);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as Vendor;
        return {
          isAuthenticated: true,
          email: userData.email,
          name: userData.ownerName,
          shopName: userData.shopName,
          storeCategory: userData.storeCategory,
          type: userData.type || userData.storeCategory, // Fallback to storeCategory if type is missing for older docs
          isActiveOnThru: userData.isActiveOnThru,
        };
      } else {
         console.log(`[Auth GetSession] User not found in Firestore during session check: ${userEmailFromCookie}`);
      }
    } catch (error) {
      console.error('[Auth GetSession] Error fetching user for session from Firestore:', error);
      // Fall through to return unauthenticated
    }
  }
  return { isAuthenticated: false };
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session?.isAuthenticated || false;
}

export interface VendorRegistrationData extends Omit<Vendor, 'id' | 'createdAt' | 'shopImageUrl' | 'fullPhoneNumber' | 'isActiveOnThru' | 'type' | 'password'> {
  password?: string;
  shopImage?: any; 
}


export async function registerNewVendor(vendorData: VendorRegistrationData): Promise<{ success: boolean; error?: string; userId?: string }> {
  const trimmedEmail = vendorData.email?.trim();
  if (!trimmedEmail) {
    return { success: false, error: 'Email is required for registration.' };
  }
  if (!vendorData.password) {
    return { success: false, error: 'Password is required for registration.' };
  }

  const lowercasedEmail = trimmedEmail.toLowerCase();
  const fullPhoneNumber = `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`;

  try {
    // Check if email already exists
    const emailQuery = query(collection(db, "vendors"), where("email", "==", lowercasedEmail));
    const emailQuerySnapshot = await getDocs(emailQuery);
    if (!emailQuerySnapshot.empty) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Check if phone number already exists
    const phoneQuery = query(collection(db, "vendors"), where("fullPhoneNumber", "==", fullPhoneNumber));
    const phoneQuerySnapshot = await getDocs(phoneQuery);
    if (!phoneQuerySnapshot.empty) {
      return { success: false, error: 'An account with this phone number already exists.' };
    }
    
    const hashedPassword = simulateHashPassword(vendorData.password);

    // Construct the full Vendor object to save
    const vendorToSave: Omit<Vendor, 'id'> = {
      shopName: vendorData.shopName,
      storeCategory: vendorData.storeCategory,
      ownerName: vendorData.ownerName,
      phoneCountryCode: vendorData.phoneCountryCode,
      phoneNumber: vendorData.phoneNumber,
      email: lowercasedEmail,
      // password field should be part of the Vendor type if we are saving it directly
      // However, VendorRegistrationData excludes password, so we add it here.
      // The type of vendorToSave should accommodate `password`. For simplicity, I'm assuming `Vendor` model has `password`.
      // If not, we need to adjust. Let's assume `Vendor` has an optional `password` for this example.
      password: hashedPassword,
      gender: vendorData.gender,
      city: vendorData.city,
      weeklyCloseOn: vendorData.weeklyCloseOn,
      openingTime: vendorData.openingTime,
      closingTime: vendorData.closingTime,
      shopFullAddress: vendorData.shopFullAddress,
      latitude: vendorData.latitude,
      longitude: vendorData.longitude,
      // shopImageUrl will be undefined if no image, or handled separately
      fullPhoneNumber: fullPhoneNumber,
      createdAt: new Date().toISOString(),
      isActiveOnThru: vendorData.isActiveOnThru ?? true, // Default to true
      type: vendorData.storeCategory, // Set 'type' field to mirror 'storeCategory'
    };
    
    // Handle shopImage - it's not stored directly in this example
    if (!(vendorData.shopImage instanceof File) || vendorData.shopImage.size === 0) {
      // No specific action for shopImage here, but it means shopImageUrl would be undefined
    }


    await setDoc(doc(db, 'vendors', lowercasedEmail), vendorToSave);

    console.log("[Auth Register] New vendor registered in Firestore. Email:", lowercasedEmail, "Shop:", vendorData.shopName);
    return { success: true, userId: lowercasedEmail };

  } catch (error) {
    console.error('[Auth Register] Error registering new vendor in Firestore:', error);
    let errorMessage = 'An unexpected error occurred during registration with Firestore.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}
