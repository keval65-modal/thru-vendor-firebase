
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc, DocumentReference, Timestamp, deleteDoc, orderBy } from 'firebase/firestore';
import type { GlobalItem, VendorInventoryItem } from '@/lib/inventoryModels';
import { extractMenuData, type ExtractMenuInput, type ExtractMenuOutput, type MenuItemSchema as ExtractedMenuItem } from '@/ai/flows/extract-menu-flow';
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
 */
export async function getVendorInventory(vendorId: string): Promise<VendorInventoryItem[]> {
  console.log(`[getVendorInventory] Fetching inventory for vendor: ${vendorId}`);
  if (!vendorId) {
    console.error("[getVendorInventory] Error: vendorId is undefined or empty.");
    // Instead of returning empty, throw an error that the client can catch and display.
    throw new Error("Vendor ID is missing. Cannot fetch inventory.");
  }
  try {
    const q = query(
      collection(db, "vendor_inventory"), 
      where("vendorId", "==", vendorId),
      orderBy("itemName", "asc") 
    );
    const querySnapshot = await getDocs(q);
    const inventoryItems = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        lastStockUpdate: data.lastStockUpdate instanceof Timestamp ? data.lastStockUpdate.toDate().toISOString() : data.lastStockUpdate,
      } as VendorInventoryItem;
    });
    console.log(`[getVendorInventory] Found ${inventoryItems.length} items for vendor ${vendorId}`);
    return inventoryItems;
  } catch (error) {
    console.error(`[getVendorInventory] Firestore error fetching inventory for vendor ${vendorId}:`, error);
    if (error instanceof Error && error.message.includes("indexes")) {
         console.error("[getVendorInventory] Firestore index missing. Please create the required composite index in Firebase console.");
         throw new Error("Database setup error: Missing index. Please contact support or check Firebase console for index creation link.");
    }
    throw new Error(`Failed to fetch vendor inventory. Database error: ${(error as Error).message}`);
  }
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

export type DeleteItemFormState = {
  success?: boolean;
  error?: string;
  message?: string;
};
/**
 * Deletes an item from a vendor's inventory.
 */
export async function deleteVendorItem(prevState: DeleteItemFormState, formData: FormData): Promise<DeleteItemFormState> {
    const vendorInventoryItemId = formData.get('itemId') as string;
    console.log(`[deleteVendorItem] Attempting to delete item ${vendorInventoryItemId}`);
    if (!vendorInventoryItemId) {
        console.error("[deleteVendorItem] Item ID is missing for deletion.");
        return { success: false, error: "Item ID is missing for deletion." };
    }
    try {
        await deleteDoc(doc(db, "vendor_inventory", vendorInventoryItemId));
        console.log(`[deleteVendorItem] Successfully deleted item ${vendorInventoryItemId}`);
        return { success: true, message: "Item deleted successfully." };
    } catch (error) {
        console.error(`[deleteVendorItem] Error deleting item ${vendorInventoryItemId}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error during deletion.";
        return { success: false, error: `Failed to delete item. ${errorMessage}` };
    }
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
    return { error: 'No PDF file uploaded or file is empty.' };
  }
  if (!vendorId) {
    console.warn("[handleMenuPdfUpload] Vendor ID is missing.");
    return { error: 'Vendor ID is missing.' };
  }
  if (menuFile.type !== 'application/pdf') {
    console.warn("[handleMenuPdfUpload] Uploaded file is not a PDF. Type:", menuFile.type);
    return { error: 'Uploaded file is not a PDF.' };
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
    return { error: 'Failed to process PDF file content.' };
  }


  const validatedFields = MenuPdfUploadSchema.safeParse({ menuDataUri, vendorId });
  console.log("[handleMenuPdfUpload] Zod validation result:", validatedFields);

  if (!validatedFields.success) {
    console.error("[handleMenuPdfUpload] Validation error for menu PDF upload:", validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid data for menu PDF processing. ' + (validatedFields.error.flatten().fieldErrors.menuDataUri?.[0] || validatedFields.error.flatten().fieldErrors.vendorId?.[0] || 'Unknown validation error.'),
    };
  }

  const inputData: ExtractMenuInput = validatedFields.data;
  console.log("[handleMenuPdfUpload] Input data for Genkit flow:", { vendorId: inputData.vendorId, menuDataUriLength: inputData.menuDataUri.length });


  try {
    console.log("[handleMenuPdfUpload] Calling Genkit extractMenuData flow...");
    const result = await extractMenuData(inputData);
    console.log("[handleMenuPdfUpload] Genkit flow successful, result:", JSON.stringify(result, null, 2));
    
    if (!result || !result.extractedItems) {
        console.warn("[handleMenuPdfUpload] Genkit flow returned no or malformed result. Full result:", JSON.stringify(result, null, 2));
        return { error: 'AI menu extraction returned an unexpected result. No items found.', extractedMenu: result }; // Pass along result even if items are missing
    }

    return { extractedMenu: result, message: 'Menu processed successfully.' };
  } catch (error) {
    console.error('[handleMenuPdfUpload] Error in handleMenuPdfUpload processing with AI:', error);
    let errorMessage = 'Failed to process menu PDF with AI. Please try again.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    if (errorMessage.includes('deadline') || errorMessage.includes('timeout') || errorMessage.includes('504')) {
        errorMessage = 'The AI processing took too long and timed out. Try a smaller or simpler PDF, or check the AI service status.';
    }
    return { error: errorMessage };
  }
}

// --- Save Extracted Menu Items ---

const SaveExtractedMenuSchema = z.object({
  vendorId: z.string().min(1, { message: "Vendor ID is required." }),
  extractedItems: z.string().refine(
    (val) => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed); 
      } catch (e) {
        return false;
      }
    },
    { message: 'Extracted items must be a valid JSON array string.' }
  ),
});

export type SaveMenuFormState = {
  success?: boolean;
  error?: string;
  message?: string;
};

function parsePrice(priceString: string): number {
  if (!priceString) return 0;
  const cleanedString = priceString.replace(/[$,£€₹,]/g, '').trim();
  const price = parseFloat(cleanedString);
  return isNaN(price) ? 0 : price;
}

export async function handleSaveExtractedMenu(
  prevState: SaveMenuFormState,
  formData: FormData
): Promise<SaveMenuFormState> {
  console.log('[handleSaveExtractedMenu] Server action started.');
  
  const rawFormData = {
    vendorId: formData.get('vendorId') as string,
    extractedItems: formData.get('extractedItemsJson') as string,
  };
  console.log('[handleSaveExtractedMenu] Raw form data:', rawFormData);

  const validatedFields = SaveExtractedMenuSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error("[handleSaveExtractedMenu] Validation error:", validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid data for saving menu. ' + (validatedFields.error.flatten().fieldErrors.extractedItems?.[0] || 'Unknown validation error.'),
    };
  }

  const { vendorId, extractedItems: extractedItemsJson } = validatedFields.data;
  let itemsToSave: ExtractedMenuItem[];
  try {
    itemsToSave = JSON.parse(extractedItemsJson);
     console.log(`[handleSaveExtractedMenu] Parsed ${itemsToSave.length} items to save for vendor: ${vendorId}`);
  } catch (e) {
    console.error("[handleSaveExtractedMenu] Error parsing extractedItems JSON:", e);
    return { error: 'Failed to parse extracted menu items.' };
  }

  if (!Array.isArray(itemsToSave) || itemsToSave.length === 0) {
    return { error: 'No items to save or items format is incorrect.' };
  }

  try {
    const now = Timestamp.now();
    const batchPromises = itemsToSave.map(item => {
      const newItemData: Omit<VendorInventoryItem, 'id'> = {
        vendorId: vendorId,
        isCustomItem: true, 
        itemName: item.itemName,
        vendorItemCategory: item.category,
        stockQuantity: 0, 
        price: parsePrice(item.price),
        unit: 'serving', 
        isAvailableOnThru: true, 
        createdAt: now,
        updatedAt: now,
        lastStockUpdate: now, 
        ...(item.description !== undefined && { description: item.description }),
      };
      return addDoc(collection(db, 'vendor_inventory'), newItemData);
    });

    await Promise.all(batchPromises);
    console.log(`[handleSaveExtractedMenu] Successfully saved ${itemsToSave.length} menu items for vendor ${vendorId} to Firestore.`);
    return { success: true, message: `${itemsToSave.length} menu items saved successfully!` };

  } catch (error) {
    console.error('[handleSaveExtractedMenu] Error saving menu items to Firestore:', error);
    let errorMessage = 'Failed to save menu items to the database.';
    if (error instanceof Error && error.message) {
      errorMessage = `Firestore error: ${error.message}`;
    }
    return { error: errorMessage };
  }
}
