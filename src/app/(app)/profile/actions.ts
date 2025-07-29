
'use server';

import { z } from 'zod';
import { db, storage } from '@/lib/firebase-admin'; // Correct admin import
import { Timestamp } from 'firebase-admin/firestore';
import type { Vendor } from '@/lib/inventoryModels';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const generateTimeOptions = () => {
    const options = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour12 = h === 0 ? 12 : h % 12 === 0 ? 12 : h % 12;
            const period = h < 12 || h === 24 ? "AM" : "PM";
            const displayHour = hour12 < 10 ? `0${hour12}` : hour12;
            const displayMinute = m < 10 ? `0${m}` : m;
            let timeValue = `${displayHour}:${displayMinute} ${period}`;
            if (h === 0 && m === 0) timeValue = "12:00 AM (Midnight)";
            if (h === 12 && m === 0) timeValue = "12:00 PM (Noon)";
            options.push(timeValue.replace("12:00 AM (Midnight) AM", "12:00 AM (Midnight)").replace("12:00 PM (Noon) PM", "12:00 PM (Noon)"));
        }
    }
    return options;
};
const timeOptions = generateTimeOptions();

// Schema for validating profile updates
const UpdateProfileSchema = z.object({
  shopName: z.string().min(1, "Shop name is required."),
  storeCategory: z.string().min(1, "Store category is required."),
  ownerName: z.string().min(1, "Owner name is required."),
  phoneCountryCode: z.string().min(1, "Country code is required."),
  phoneNumber: z.string().min(1, "Phone number is required.").regex(/^\d{7,15}$/, { message: "Please enter a valid phone number (7-15 digits)." }),
  gender: z.string().optional(),
  city: z.string().min(1, "City is required."),
  weeklyCloseOn: z.string().min(1, "Weekly close day is required."),
  openingTime: z.string().min(1, "Opening time is required."),
  closingTime: z.string().min(1, "Closing time is required."),
  shopFullAddress: z.string().min(1, "Full address is required."),
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


export async function getVendorDetails(): Promise<{ vendor?: Vendor; error?: string }> {
  const session = await getSession();
  if (!session?.isAuthenticated || !session.uid) {
    return { error: "User not authenticated." };
  }

  try {
    const vendorRef = db.collection('vendors').doc(session.uid);
    const vendorSnap = await vendorRef.get();

    if (!vendorSnap.exists) {
      return { error: "Vendor details not found." };
    }
    const vendorData = vendorSnap.data() as Omit<Vendor, 'id'>;
    // Convert Timestamps to ISO strings if they exist for form compatibility
    const serializedData: any = {};
     for (const [key, value] of Object.entries(vendorData)) {
        if (value instanceof Timestamp) {
            serializedData[key] = value.toDate().toISOString();
        } else {
            serializedData[key] = value;
        }
    }
    return { vendor: { ...serializedData, id: vendorSnap.id } };
  } catch (error) {
    console.error("Error fetching vendor details:", error);
    return { error: "Failed to fetch vendor details." };
  }
}

export type UpdateProfileFormState = {
  success?: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string[]>; // For field-specific errors
};

// Helper function to convert FormData to a plain object
function formDataToObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};
  const entries = (formData as unknown as Iterable<[string, FormDataEntryValue]>);

  for (const [key, value] of entries) {
    obj[key] = value;
  }

  return obj;
}

export async function updateVendorProfile(
  prevState: UpdateProfileFormState,
  formData: FormData
): Promise<UpdateProfileFormState> {
  const session = await getSession();
  if (!session?.isAuthenticated || !session.uid) {
    return { error: "User not authenticated. Cannot update profile." };
  }
  const vendorId = session.uid;

  const rawData = formDataToObject(formData);
  const shopImageFile = formData.get('shopImage') as File | null;
  
  const dataToValidate = { ...rawData };
  if (shopImageFile && shopImageFile.size > 0) {
    dataToValidate.shopImage = shopImageFile;
  } else {
    delete dataToValidate.shopImage;
  }

  const validatedFields = UpdateProfileSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    console.error("Profile update validation errors:", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid form data. Please check your inputs.",
      fields: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { shopImage, ...vendorData } = validatedFields.data;
  
  const typedStoreCategory = vendorData.storeCategory as Vendor['storeCategory'];

  // This is the correct way to construct the update object to avoid type conflicts.
  const dataToUpdate: Omit<Partial<Vendor>, 'storeCategory' | 'type'> & { storeCategory: Vendor['storeCategory'], type: Vendor['storeCategory'], updatedAt: Timestamp } = {
    ...vendorData,
    storeCategory: typedStoreCategory,
    type: typedStoreCategory, // Ensure 'type' is updated if 'storeCategory' changes
    fullPhoneNumber: `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`,
    updatedAt: Timestamp.now(),
  };

  try {
    const vendorRef = db.collection('vendors').doc(vendorId);

    if (shopImage && shopImage.size > 0) {
      const bucket = storage.bucket();
      const imagePath = `vendor_shop_images/${vendorId}/shop_image.jpg`;
      const file = bucket.file(imagePath);

      const buffer = Buffer.from(await shopImage.arrayBuffer());
      await file.save(buffer, {
          metadata: { contentType: shopImage.type },
      });
      
      dataToUpdate.shopImageUrl = `https://storage.googleapis.com/${bucket.name}/${imagePath}`;

      console.log(`New shop image URL: ${dataToUpdate.shopImageUrl}`);
    }


    await vendorRef.update(dataToUpdate);
    console.log(`Vendor profile updated successfully for ${vendorId}`);
    revalidatePath('/profile');
    return { success: true, message: "Profile updated successfully!" };

  } catch (error) {
    console.error(`Error updating vendor profile for ${vendorId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to update profile. ${errorMessage}` };
  }
}
