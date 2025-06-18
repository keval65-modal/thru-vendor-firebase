
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc, DocumentReference } from 'firebase/firestore';
import type { GlobalItem, VendorInventoryItem, Vendor } from '@/lib/inventoryModels';
import { extractMenuData, type ExtractMenuInput, type ExtractMenuOutput } from '@/ai/flows/extract-menu-flow';
import { z } from 'zod';

// Ensure vendorId is typically the email/uid used as doc ID in 'vendors' collection
// Ensure globalItemId is the Firestore document ID from 'global_items'

/**
 * Fetches global items based on their shared type (e.g., "grocery", "medical").
 * NOTE: This is a placeholder. Full implementation requires querying Firestore.
 */
export async function getGlobalItemsByType(itemType: GlobalItem['sharedItemType']): Promise<GlobalItem[]> {
  console.log(`Placeholder: Fetching global items for type: ${itemType}`);
  // Example Firestore query (needs to be implemented fully)
  // const q = query(collection(db, "global_items"), where("sharedItemType", "==", itemType));
  // const querySnapshot = await getDocs(q);
  // return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalItem));
  return [];
}

/**
 * Fetches a specific vendor's inventory items.
 * NOTE: This is a placeholder. Full implementation requires querying Firestore.
 */
export async function getVendorInventory(vendorId: string): Promise<VendorInventoryItem[]> {
  console.log(`Placeholder: Fetching inventory for vendor: ${vendorId}`);
  // Example Firestore query (needs to be implemented fully)
  // const q = query(collection(db, "vendor_inventory"), where("vendorId", "==", vendorId));
  // const querySnapshot = await getDocs(q);
  // return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorInventoryItem));
  return [];
}

interface AddCustomVendorItemData extends Omit<VendorInventoryItem, 'id' | 'vendorId' | 'createdAt' | 'updatedAt' | 'globalItemRef' | 'isCustomItem' | 'lastStockUpdate'> {
  // ensure required fields like itemName, stockQuantity, price, unit, vendorItemCategory are here
}

/**
 * Adds a new custom item to a vendor's inventory.
 * NOTE: This is a placeholder.
 */
export async function addCustomVendorItem(vendorId: string, itemData: AddCustomVendorItemData): Promise<{ success: boolean; itemId?: string; error?: string }> {
  console.log(`Placeholder: Adding custom item for vendor ${vendorId}:`, itemData);
  // const newItemData: Omit<VendorInventoryItem, 'id'> = {
  //   ...itemData,
  //   vendorId,
  //   isCustomItem: true,
  //   createdAt: new Date(), // Firestore server timestamp would be better
  //   updatedAt: new Date(),
  //   lastStockUpdate: new Date(),
  // };
  // const docRef = await addDoc(collection(db, "vendor_inventory"), newItemData);
  // return { success: true, itemId: docRef.id };
  return { success: true, itemId: "mock_item_id_custom" };
}

/**
 * Links a global item to a vendor's inventory, creating a new vendor_inventory entry.
 * NOTE: This is a placeholder.
 */
export async function linkGlobalItemToVendorInventory(
  vendorId: string,
  globalItemId: string,
  stockQuantity: number,
  price: number,
  isAvailableOnThru: boolean,
  vendorItemCategory?: string // Optional: vendor can override category
): Promise<{ success: boolean; vendorInventoryItemId?: string; error?: string }> {
  console.log(`Placeholder: Linking global item ${globalItemId} for vendor ${vendorId} with stock ${stockQuantity}, price ${price}`);
  // const globalItemSnap = await getDoc(doc(db, "global_items", globalItemId));
  // if (!globalItemSnap.exists()) return { success: false, error: "Global item not found." };
  // const globalItemData = globalItemSnap.data() as GlobalItem;
  // const newVendorItem: Omit<VendorInventoryItem, 'id'> = {
  //   vendorId,
  //   globalItemRef: doc(db, "global_items", globalItemId) as DocumentReference<GlobalItem>,
  //   isCustomItem: false,
  //   itemName: globalItemData.itemName, // Default from global
  //   vendorItemCategory: vendorItemCategory || globalItemData.defaultCategory,
  //   stockQuantity,
  //   price,
  //   unit: globalItemData.defaultUnit,
  //   isAvailableOnThru,
  //   imageUrl: globalItemData.defaultImageUrl,
  //   createdAt: new Date(),
  //   updatedAt: new Date(),
  //   lastStockUpdate: new Date(),
  // };
  // const docRef = await addDoc(collection(db, "vendor_inventory"), newVendorItem);
  // return { success: true, vendorInventoryItemId: docRef.id };
  return { success: true, vendorInventoryItemId: "mock_vendor_item_id_linked" };
}

/**
 * Updates the stock quantity of a specific item in vendor's inventory.
 * NOTE: This is a placeholder.
 */
export async function updateVendorItemStock(vendorInventoryItemId: string, newStock: number): Promise<{ success: boolean; error?: string }> {
  console.log(`Placeholder: Updating stock for item ${vendorInventoryItemId} to ${newStock}`);
  // await updateDoc(doc(db, "vendor_inventory", vendorInventoryItemId), {
  //   stockQuantity: newStock,
  //   lastStockUpdate: new Date(),
  //   updatedAt: new Date(),
  // });
  return { success: true };
}

/**
 * Updates the price of a specific item in vendor's inventory.
 * NOTE: This is a placeholder.
 */
export async function updateVendorItemPrice(vendorInventoryItemId: string, newPrice: number): Promise<{ success: boolean; error?: string }> {
  console.log(`Placeholder: Updating price for item ${vendorInventoryItemId} to ${newPrice}`);
  // await updateDoc(doc(db, "vendor_inventory", vendorInventoryItemId), {
  //   price: newPrice,
  //   updatedAt: new Date(),
  // });
  return { success: true };
}

/**
 * Updates other details of a vendor inventory item.
 * NOTE: This is a placeholder.
 */
export async function updateVendorItemDetails(vendorInventoryItemId: string, updates: Partial<VendorInventoryItem>): Promise<{ success: boolean; error?: string }> {
    console.log(`Placeholder: Updating details for item ${vendorInventoryItemId}:`, updates);
    // const { id, vendorId, globalItemRef, createdAt, ...validUpdates } = updates; // Prevent updating immutable fields
    // await updateDoc(doc(db, "vendor_inventory", vendorInventoryItemId), {
    //   ...validUpdates,
    //   updatedAt: new Date(),
    // });
    return { success: true };
}

/**
 * Deletes an item from a vendor's inventory.
 * NOTE: This is a placeholder.
 */
export async function deleteVendorItem(vendorInventoryItemId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`Placeholder: Deleting item ${vendorInventoryItemId}`);
    // await deleteDoc(doc(db, "vendor_inventory", vendorInventoryItemId));
    return { success: true };
}

// --- Admin Actions for Global Items (Placeholders) ---
// These would typically be in a separate admin actions file and have role-based access control.

export async function addGlobalItem(itemData: Omit<GlobalItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; itemId?: string; error?: string }> {
  console.log("Placeholder: ADMIN - Adding global item:", itemData);
  // const docRef = await addDoc(collection(db, "global_items"), { ...itemData, createdAt: new Date(), updatedAt: new Date() });
  // return { success: true, itemId: docRef.id };
  return { success: true, itemId: "mock_global_item_id" };
}

export async function updateGlobalItem(itemId: string, updates: Partial<GlobalItem>): Promise<{ success: boolean; error?: string }> {
  console.log("Placeholder: ADMIN - Updating global item:", itemId, updates);
  // const { id, createdAt, ...validUpdates } = updates;
  // await updateDoc(doc(db, "global_items", itemId), { ...validUpdates, updatedAt: new Date() });
  return { success: true };
}

export async function deleteGlobalItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  console.log("Placeholder: ADMIN - Deleting global item:", itemId);
  // await deleteDoc(doc(db, "global_items", itemId));
  return { success: true };
}


// --- AI Menu Extraction ---
const MenuPdfUploadSchema = z.object({
  menuDataUri: z.string().startsWith('data:application/pdf;base64,', { message: "Invalid PDF data URI." }),
  vendorId: z.string().min(1, { message: "Vendor ID is required." }),
});

export type MenuUploadFormState = {
  extractedMenu?: ExtractMenuOutput;
  error?: string;
  message?: string;
  isLoading?: boolean; // Added to explicitly track loading for client
};

export async function handleMenuPdfUpload(
  prevState: MenuUploadFormState,
  formData: FormData
): Promise<MenuUploadFormState> {
  console.log("[handleMenuPdfUpload] Server action started.");

  const menuFile = formData.get('menuPdf') as File;
  const vendorId = formData.get('vendorId') as string;
  
  console.log("[handleMenuPdfUpload] Received menuFile:", menuFile?.name, "vendorId:", vendorId);

  if (!menuFile || menuFile.size === 0) {
    console.warn("[handleMenuPdfUpload] No PDF file uploaded or file is empty.");
    return { error: 'No PDF file uploaded or file is empty.', isLoading: false };
  }
  if (!vendorId) {
    console.warn("[handleMenuPdfUpload] Vendor ID is missing.");
    return { error: 'Vendor ID is missing.', isLoading: false };
  }
  if (menuFile.type !== 'application/pdf') {
    console.warn("[handleMenuPdfUpload] Uploaded file is not a PDF. Type:", menuFile.type);
    return { error: 'Uploaded file is not a PDF.', isLoading: false };
  }

  let menuDataUri = '';
  try {
    // Convert file to data URI
    const arrayBuffer = await menuFile.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    menuDataUri = `data:application/pdf;base64,${base64String}`;
    console.log("[handleMenuPdfUpload] PDF converted to data URI (first 100 chars):", menuDataUri.substring(0,100));
  } catch (conversionError) {
    console.error("[handleMenuPdfUpload] Error converting PDF to data URI:", conversionError);
    return { error: 'Failed to process PDF file content.', isLoading: false };
  }


  const validatedFields = MenuPdfUploadSchema.safeParse({ menuDataUri, vendorId });
  console.log("[handleMenuPdfUpload] Zod validation result:", validatedFields);

  if (!validatedFields.success) {
    console.error("[handleMenuPdfUpload] Validation error for menu PDF upload:", validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid data for menu PDF processing. ' + (validatedFields.error.flatten().fieldErrors.menuDataUri?.[0] || validatedFields.error.flatten().fieldErrors.vendorId?.[0] || 'Unknown validation error.'),
      isLoading: false,
    };
  }

  const inputData: ExtractMenuInput = validatedFields.data;
  console.log("[handleMenuPdfUpload] Input data for Genkit flow:", { vendorId: inputData.vendorId, menuDataUriLength: inputData.menuDataUri.length });


  try {
    console.log("[handleMenuPdfUpload] Calling Genkit extractMenuData flow...");
    const result = await extractMenuData(inputData);
    console.log("[handleMenuPdfUpload] Genkit flow successful, result:", result);
    
    if (!result || !result.extractedItems) {
        console.warn("[handleMenuPdfUpload] Genkit flow returned no or malformed result.");
        return { error: 'AI menu extraction returned an unexpected result. No items found.', isLoading: false };
    }

    return { extractedMenu: result, message: 'Menu processed successfully.', isLoading: false };
  } catch (error) {
    console.error('[handleMenuPdfUpload] Error in handleMenuPdfUpload processing with AI:', error);
    let errorMessage = 'Failed to process menu PDF with AI. Please try again.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    // Check for specific Genkit/timeout related messages if possible, though "Gateway Timeout" often comes from infrastructure
    if (errorMessage.includes('deadline') || errorMessage.includes('timeout')) {
        errorMessage = 'The AI processing took too long and timed out. Try a smaller or simpler PDF.';
    }
    return { error: errorMessage, isLoading: false };
  }
}

