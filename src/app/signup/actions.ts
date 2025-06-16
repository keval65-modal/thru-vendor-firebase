
'use server';

import { z } from 'zod';
import { registerNewVendor } from '@/lib/auth'; // Import the actual registration function

// This schema should ideally match the one in SignupForm.tsx for consistency
// but FormData converts all values to strings or File objects.
// Server-side validation will re-validate and parse.
const registerVendorSchema = z.object({
  shopName: z.string().min(1, "Shop name is required."),
  storeCategory: z.string().min(1, "Store category is required."),
  ownerName: z.string().min(1, "Owner name is required."),
  phoneCountryCode: z.string().min(1, "Country code is required."),
  phoneNumber: z.string().min(1, "Phone number is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  // confirmPassword is validated on client, not strictly needed here if password is sent
  gender: z.string().optional(),
  city: z.string().min(1, "City is required."),
  weeklyCloseOn: z.string().min(1, "Weekly close day is required."),
  shopTiming: z.string().min(1, "Shop timings are required."),
  shopFullAddress: z.string().min(1, "Full address is required."),
  latitude: z.preprocess(val => parseFloat(String(val)), z.number()),
  longitude: z.preprocess(val => parseFloat(String(val)), z.number()),
  shopImage: z.any().optional(), // For file uploads, Zod needs .refine or a custom type for server-side validation of File objects.
});

export async function registerVendor(
  formData: FormData
): Promise<{ success: boolean; error?: string; data?: any }> {
  
  const rawData = Object.fromEntries(formData.entries());

  // Handle file separately if it exists
  const shopImageFile = formData.get('shopImage');
  
  const dataToValidate = { ...rawData };
  if (shopImageFile instanceof File && shopImageFile.size > 0) {
    // If you were to process/validate the file, you'd do it here or pass it along.
    // For now, we're just acknowledging it exists.
    dataToValidate.shopImage = shopImageFile;
  } else {
    delete dataToValidate.shopImage; // Remove if no file or empty file
  }
  // We don't need confirmPassword for server-side validation if password is present
  if ('confirmPassword' in dataToValidate) {
    delete dataToValidate.confirmPassword;
  }


  const validatedFields = registerVendorSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    console.error("Server-side validation errors:", validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      error: "Invalid form data. Please check your inputs.",
      // You could pass back fieldErrors: validatedFields.error.flatten().fieldErrors
    };
  }

  const vendorData = validatedFields.data;

  try {
    // **DATABASE INTERACTION**
    // Pass the validated data (including the plain password) to the auth function.
    // The auth function is responsible for hashing the password before saving.
    const registrationResult = await registerNewVendor(vendorData);

    if (registrationResult.success) {
      // Handle shop image upload here if successful
      if (shopImageFile instanceof File && shopImageFile.name) {
          console.log("Shop image received:", shopImageFile.name, shopImageFile.size, shopImageFile.type);
          // Example: const imageUrl = await uploadToFirebaseStorage(shopImageFile, registrationResult.userId);
          // Then update the vendor record with shopImageUrl: vendorData.shopImageUrl = imageUrl; 
      }
      return { success: true, data: vendorData };
    } else {
      return { success: false, error: registrationResult.error || "Registration failed." };
    }

  } catch (error) {
    console.error('Error registering vendor:', error);
    let errorMessage = 'An unexpected error occurred during registration.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

