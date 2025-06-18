
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
    storeCategory?: Vendor['storeCategory']; // Use type from Vendor
    isActiveOnThru?: boolean;
  } | null> {
  const userEmailFromCookie = cookies().get(AUTH_COOKIE_NAME)?.value;

  if (userEmailFromCookie) {
    try {
      const userDocRef = doc(db, 'vendors', userEmailFromCookie);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as Vendor; // Cast to Vendor
        return {
          isAuthenticated: true,
          email: userData.email,
          name: userData.ownerName,
          shopName: userData.shopName,
          storeCategory: userData.storeCategory,
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

export interface VendorRegistrationData {
  shopName: string;
  storeCategory: Vendor['storeCategory'];
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
  shopImage?: any; // Placeholder for now
  isActiveOnThru?: boolean; // Added for customer app visibility
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
    
    // "Hash" the password (simulated - NOT SECURE)
    const hashedPassword = simulateHashPassword(vendorData.password);

    const vendorDataToSave: Omit<Vendor, 'id' | 'createdAt'> & {password: string; createdAt: string; isActiveOnThru: boolean} = {
      ...vendorData,
      email: lowercasedEmail,
      password: hashedPassword, // Store the "hashed" password
      fullPhoneNumber: fullPhoneNumber,
      isActiveOnThru: vendorData.isActiveOnThru ?? true, // Default to true for now
      createdAt: new Date().toISOString(), // Add a timestamp
    };
    // Remove shopImage if it's not a File or not meant to be stored directly yet
    if (!(vendorData.shopImage instanceof File) || vendorData.shopImage.size === 0) {
        delete (vendorDataToSave as any).shopImage; // Cast to any to delete optional property
    }
    // In a real app, you would handle file uploads separately (e.g., to Firebase Storage)
    // and store the image URL in Firestore. For now, we're omitting direct File storage.


    await setDoc(doc(db, 'vendors', lowercasedEmail), vendorDataToSave);

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

