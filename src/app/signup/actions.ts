
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { db, auth, storage } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Vendor } from '@/lib/inventoryModels';
import { createSession } from '@/lib/auth';

const timeOptions = [
    "12:00 AM (Midnight)", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM",
    "03:00 AM", "03:30 AM", "04:00 AM", "04:30 AM", "05:00 AM", "05:30 AM",
    "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM (Noon)", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
    "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
];

const signupFormSchema = z.object({
  shopName: z.string().min(2),
  storeCategory: z.string().min(1),
  ownerName: z.string().min(2),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  phoneCountryCode: z.string().min(1),
  phoneNumber: z.string().regex(/^\d{7,15}$/),
  gender: z.string().optional(),
  city: z.string().min(2),
  weeklyCloseOn: z.string().min(1),
  openingTime: z.string().min(1),
  closingTime: z.string().min(1),
  shopFullAddress: z.string().min(10),
  latitude: z.preprocess(val => parseFloat(String(val)), z.number()),
  longitude: z.preprocess(val => parseFloat(String(val)), z.number()),
  shopImage: z.any().optional(),
}).refine(data => {
    if(data.openingTime && data.closingTime) {
        const openTimeIndex = timeOptions.indexOf(data.openingTime);
        const closeTimeIndex = timeOptions.indexOf(data.closingTime);
        if (data.openingTime === "12:00 AM (Midnight)" && data.closingTime === "12:00 AM (Midnight)") return true;
        return closeTimeIndex > openTimeIndex;
    }
    return true;
}, { message: "Closing time must be after opening time.", path: ["closingTime"]});

export type SignupFormState = {
  success: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string[]>;
};

export async function handleSignup(
  prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const rawData: Record<string, any> = Object.fromEntries(formData);
  const shopImageFile = formData.get('shopImage') as File | null;
  
  const dataToValidate = { ...rawData };
  if (shopImageFile && shopImageFile.size > 0) {
    dataToValidate.shopImage = shopImageFile;
  } else {
    delete dataToValidate.shopImage;
  }

  const validatedFields = signupFormSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    console.error("Signup validation errors:", validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      error: "Invalid form data. Please check your inputs.",
      fields: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password, shopImage, ...vendorData } = validatedFields.data;
  
  try {
    // 1. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: vendorData.ownerName,
      emailVerified: false,
    });
    const uid = userRecord.uid;
    console.log(`Successfully created new user: ${email} (${uid})`);

    // Explicitly cast storeCategory to the specific Vendor type
    const typedStoreCategory = vendorData.storeCategory as Vendor['storeCategory'];

    const dataToSave: Omit<Vendor, 'id'> = {
        ...vendorData,
        storeCategory: typedStoreCategory, // Use the correctly typed category
        email: email,
        fullPhoneNumber: `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`,
        isActiveOnThru: true,
        role: 'vendor',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        type: typedStoreCategory, // Also assign the typed category here
    };

    // 2. Upload image to Storage if it exists
    if (shopImage && shopImage.size > 0) {
        const bucket = storage.bucket();
        const imagePath = `vendor_shop_images/${uid}/shop_image.jpg`;
        const file = bucket.file(imagePath);
        const buffer = Buffer.from(await shopImage.arrayBuffer());
        
        await file.save(buffer, { metadata: { contentType: shopImage.type } });
        
        dataToSave.shopImageUrl = `https://storage.googleapis.com/${bucket.name}/${imagePath}`;
        console.log(`Image uploaded and public URL set for ${uid}: ${dataToSave.shopImageUrl}`);
    } else {
        dataToSave.shopImageUrl = `https://placehold.co/150x100.png?text=${encodeURIComponent(vendorData.shopName.substring(0,10))}`;
    }

    // 3. Create vendor document in Firestore with the same UID
    await db.collection('vendors').doc(uid).set(dataToSave);
    console.log(`Successfully created vendor document for ${uid}`);

    // 4. Create session cookie
    const sessionResult = await createSession(uid);
    if (!sessionResult.success) {
        console.error(`CRITICAL: User ${uid} created but session failed: ${sessionResult.error}`);
        // Even if session fails, we return here to avoid redirecting. The user can log in manually.
        return { success: false, error: "Account created, but failed to log in. Please try logging in manually." };
    }
  
    // 5. Redirect to dashboard on success. MUST be called after all successful async operations inside the try block.
    redirect('/dashboard');

  } catch (error: any) {
    console.error('Error during signup process:', error);
    
    let errorMessage = "An unexpected error occurred during signup.";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = "An account with this email address already exists. Please login instead.";
    }
    return { success: false, error: errorMessage };
  }
}
