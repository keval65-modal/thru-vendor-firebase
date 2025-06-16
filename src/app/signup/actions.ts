
'use server';

import { z } from 'zod';

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
    // **DATABASE INTERACTION PLACEHOLDER**
    // In a real application, you would save `vendorData` to your database (e.g., Firestore).
    // This would also involve uploading the `shopImageFile` to a storage service (e.g., Firebase Storage)
    // and storing its URL in the database record.
    
    console.log("Vendor data to be saved:", vendorData);
    if (shopImageFile instanceof File && shopImageFile.name) {
        console.log("Shop image received:", shopImageFile.name, shopImageFile.size, shopImageFile.type);
        // Example: const imageUrl = await uploadToFirebaseStorage(shopImageFile);
        // vendorData.shopImageUrl = imageUrl; 
    }

    // Simulate successful save
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { success: true, data: vendorData };

  } catch (error) {
    console.error('Error registering vendor:', error);
    let errorMessage = 'An unexpected error occurred during registration.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}
