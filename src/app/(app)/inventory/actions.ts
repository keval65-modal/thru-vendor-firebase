
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc, DocumentReference, Timestamp, deleteDoc, orderBy, writeBatch } from 'firebase/firestore';
import type { GlobalItem, VendorInventoryItem } from '@/lib/inventoryModels';
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
  return [];
}

/**
 * Fetches a specific vendor's inventory items.
 */
export async function getVendorInventory(vendorId: string): Promise<VendorInventoryItem[]> {
  console.log(`[getVendorInventory] Attempting to fetch inventory for vendor: ${vendorId}`);
  if (!vendorId || typeof vendorId !== 'string' || vendorId.trim() === '') {
    console.error("[getVendorInventory] Error: vendorId is undefined, empty, or not a string.");
    throw new Error("Vendor ID is missing or invalid. Cannot fetch inventory.");
  }

  console.log(`[getVendorInventory] Constructing query for vendorId: '${vendorId}'`);

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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
        lastStockUpdate: data.lastStockUpdate instanceof Timestamp ? data.lastStockUpdate.toDate().toISOString() : (typeof data.lastStockUpdate === 'string' ? data.lastStockUpdate : new Date().toISOString()),
      } as VendorInventoryItem;
    });
    console.log(`[getVendorInventory] Found ${inventoryItems.length} items for vendor ${vendorId}`);
    return inventoryItems;
  } catch (error) {
    console.error(`[getVendorInventory] Firestore error fetching inventory for vendor ${vendorId}:`, error);
    if (error instanceof Error && (error.message.includes("indexes") || error.message.includes("requires an index") || error.message.includes("The query requires an index"))) {
         console.error("[getVendorInventory] Firestore index missing or not yet active. Please create/check the required composite index in Firebase console on 'vendor_inventory' for (vendorId ASC, itemName ASC). Error details:", error.message);
         throw new Error("Database setup error: Missing index. Please contact support or check Firebase console for index creation link.");
    }
    throw new Error(`Failed to fetch vendor inventory. Database error: ${(error as Error).message}`);
  }
}

interface AddCustomVendorItemData extends Omit<VendorInventoryItem, 'id' | 'vendorId' | 'createdAt' | 'updatedAt' | 'globalItemRef' | 'isCustomItem' | 'lastStockUpdate'> {
}

/**
 * Adds a new custom item to a vendor's inventory.
 * NOTE: This is a placeholder.
 */
export async function addCustomVendorItem(vendorId: string, itemData: AddCustomVendorItemData): Promise<{ success: boolean; itemId?: string; error?: string }> {
  console.log(`Placeholder: Adding custom item for vendor ${vendorId}:`, itemData);
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
  vendorItemCategory?: string
): Promise<{ success: boolean; vendorInventoryItemId?: string; error?: string }> {
  console.log(`Placeholder: Linking global item ${globalItemId} for vendor ${vendorId} with stock ${stockQuantity}, price ${price}`);
  return { success: true, vendorInventoryItemId: "mock_vendor_item_id_linked" };
}

/**
 * Updates the stock quantity of a specific item in vendor's inventory.
 * NOTE: This is a placeholder.
 */
export async function updateVendorItemStock(vendorInventoryItemId: string, newStock: number): Promise<{ success: boolean; error?: string }> {
  console.log(`Placeholder: Updating stock for item ${vendorInventoryItemId} to ${newStock}`);
  return { success: true };
}

/**
 * Updates the price of a specific item in vendor's inventory.
 * NOTE: This is a placeholder.
 */
export async function updateVendorItemPrice(vendorInventoryItemId: string, newPrice: number): Promise<{ success: boolean; error?: string }> {
  console.log(`Placeholder: Updating price for item ${vendorInventoryItemId} to ${newPrice}`);
  return { success: true };
}

/**
 * Updates other details of a vendor inventory item.
 * NOTE: This is a placeholder.
 */
export async function updateVendorItemDetails(vendorInventoryItemId: string, updates: Partial<VendorInventoryItem>): Promise<{ success: boolean; error?: string }> {
    console.log(`Placeholder: Updating details for item ${vendorInventoryItemId}:`, updates);
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

export async function addGlobalItem(itemData: Omit<GlobalItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; itemId?: string; error?: string }> {
  console.log("Placeholder: ADMIN - Adding global item:", itemData);
  return { success: true, itemId: "mock_global_item_id" };
}

export async function updateGlobalItem(itemId: string, updates: Partial<GlobalItem>): Promise<{ success: boolean; error?: string }> {
  console.log("Placeholder: ADMIN - Updating global item:", itemId, updates);
  return { success: true };
}

export async function deleteGlobalItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  console.log("Placeholder: ADMIN - Deleting global item:", itemId);
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
    console.log("[handleMenuPdfUpload] Genkit flow successful, result (first 500 chars of rawText if present):",
        result ? {
            extractedItemsCount: result.extractedItems?.length,
            rawTextSample: result.rawText?.substring(0,500)
        } : "No result from Genkit flow."
    );

    if (!result || !result.extractedItems) {
        console.warn("[handleMenuPdfUpload] Genkit flow returned no or malformed result. Full result:", JSON.stringify(result, null, 2));
        const rawTextInfo = result?.rawText ? `Raw text was extracted: ${result.rawText.substring(0, 200)}...` : "No raw text extracted.";
        return {
            error: 'AI menu extraction returned an unexpected result. No structured items found. ' + rawTextInfo,
            extractedMenu: result ? { extractedItems: [], rawText: result.rawText } : { extractedItems: [] }
        };
    }

    return { extractedMenu: result, message: `Menu processed. ${result.extractedItems.length} items found.` };
  } catch (error) {
    console.error('[handleMenuPdfUpload] Error in handleMenuPdfUpload processing with AI:', error);
    let errorMessage = 'Failed to process menu PDF with AI. Please try again.';
    if (error instanceof Error) {
        errorMessage = `AI processing error: ${error.message}`;
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
  extractedItemsJson: z.string().refine( // Changed from extractedItems
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
    extractedItemsJson: formData.get('extractedItemsJson') as string,
  };
  console.log('[handleSaveExtractedMenu] Raw form data:', rawFormData);

  const validatedFields = SaveExtractedMenuSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error("[handleSaveExtractedMenu] Validation error:", validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid data for saving menu. ' + (validatedFields.error.flatten().fieldErrors.extractedItemsJson?.[0] || 'Unknown validation error.'),
    };
  }

  const { vendorId, extractedItemsJson } = validatedFields.data;
  let itemsToSave: ExtractMenuOutput['extractedItems'];
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
        stockQuantity: 0, // Default for menu items
        price: parsePrice(item.price),
        unit: 'serving', // Default for menu items
        isAvailableOnThru: true,
        imageUrl: 'https://placehold.co/50x50.png', // Default placeholder image
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

// --- Remove Duplicate Items ---
export type RemoveDuplicatesFormState = {
    success?: boolean;
    error?: string;
    message?: string;
    duplicatesRemoved?: number;
};

export async function handleRemoveDuplicateItems(
    prevState: RemoveDuplicatesFormState,
    formData: FormData
): Promise<RemoveDuplicatesFormState> {
    const vendorId = formData.get('vendorId') as string;
    console.log(`[handleRemoveDuplicateItems] Starting for vendor: ${vendorId}`);

    if (!vendorId) {
        console.error("[handleRemoveDuplicateItems] Vendor ID is missing.");
        return { error: "Vendor ID is missing." };
    }

    try {
        const inventoryItems = await getVendorInventory(vendorId);
        if (inventoryItems.length === 0) {
            return { success: true, message: "Inventory is empty. No duplicates to remove.", duplicatesRemoved: 0 };
        }

        const seenItems = new Map<string, string>(); // Key: "itemNameLowerCase-categoryLowerCase", Value: itemIdToKeep
        const duplicateIdsToDelete: string[] = [];

        for (const item of inventoryItems) {
            if (!item.id || !item.itemName || !item.vendorItemCategory) { // Ensure necessary fields exist
                console.warn(`[handleRemoveDuplicateItems] Skipping item due to missing id, itemName, or category: ${JSON.stringify(item)}`);
                continue;
            }
            const itemKey = `${item.itemName.toLowerCase().trim()}-${item.vendorItemCategory.toLowerCase().trim()}`;

            if (seenItems.has(itemKey)) {
                // This is a duplicate
                duplicateIdsToDelete.push(item.id);
            } else {
                // First time seeing this item, mark it to be kept
                seenItems.set(itemKey, item.id);
            }
        }

        if (duplicateIdsToDelete.length === 0) {
            return { success: true, message: "No duplicate items found.", duplicatesRemoved: 0 };
        }

        console.log(`[handleRemoveDuplicateItems] Found ${duplicateIdsToDelete.length} duplicates to delete for vendor ${vendorId}. IDs:`, duplicateIdsToDelete);

        const deletePromises = duplicateIdsToDelete.map(id => deleteDoc(doc(db, "vendor_inventory", id)));
        await Promise.all(deletePromises);

        console.log(`[handleRemoveDuplicateItems] Successfully deleted ${duplicateIdsToDelete.length} duplicate items for vendor ${vendorId}.`);
        return {
            success: true,
            message: `Successfully removed ${duplicateIdsToDelete.length} duplicate items.`,
            duplicatesRemoved: duplicateIdsToDelete.length
        };

    } catch (error) {
        console.error(`[handleRemoveDuplicateItems] Error removing duplicates for vendor ${vendorId}:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { error: `Failed to remove duplicate items. ${errorMessage}` };
    }
}

// --- Delete Selected Items ---
const DeleteSelectedItemsSchema = z.object({
  selectedItemIdsJson: z.string().refine(
    (val) => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) && parsed.every(id => typeof id === 'string');
      } catch (e) {
        return false;
      }
    },
    { message: 'Selected item IDs must be a valid JSON array of strings.' }
  ),
});

export type DeleteSelectedItemsFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  itemsDeleted?: number;
};

export async function handleDeleteSelectedItems(
  prevState: DeleteSelectedItemsFormState,
  formData: FormData
): Promise<DeleteSelectedItemsFormState> {
  console.log('[handleDeleteSelectedItems] Server action started.');

  const rawFormData = {
    selectedItemIdsJson: formData.get('selectedItemIdsJson') as string,
  };
  console.log('[handleDeleteSelectedItems] Raw form data:', rawFormData);

  const validatedFields = DeleteSelectedItemsSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error("[handleDeleteSelectedItems] Validation error:", validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid data for deleting items. ' + (validatedFields.error.flatten().fieldErrors.selectedItemIdsJson?.[0] || 'Unknown validation error.'),
    };
  }

  const { selectedItemIdsJson } = validatedFields.data;
  let itemIdsToDelete: string[];
  try {
    itemIdsToDelete = JSON.parse(selectedItemIdsJson);
    console.log(`[handleDeleteSelectedItems] Parsed ${itemIdsToDelete.length} item IDs to delete.`);
  } catch (e) {
    console.error("[handleDeleteSelectedItems] Error parsing selectedItemIds JSON:", e);
    return { error: 'Failed to parse selected item IDs.' };
  }

  if (!Array.isArray(itemIdsToDelete) || itemIdsToDelete.length === 0) {
    return { error: 'No item IDs provided for deletion or format is incorrect.', itemsDeleted: 0 };
  }

  try {
    const batch = writeBatch(db);
    itemIdsToDelete.forEach(itemId => {
      if (itemId && typeof itemId === 'string') {
        const itemRef = doc(db, 'vendor_inventory', itemId);
        batch.delete(itemRef);
      } else {
         console.warn(`[handleDeleteSelectedItems] Invalid item ID found in batch: ${itemId}`);
      }
    });

    await batch.commit();
    console.log(`[handleDeleteSelectedItems] Successfully deleted ${itemIdsToDelete.length} items from Firestore.`);
    return {
        success: true,
        message: `${itemIdsToDelete.length} item(s) deleted successfully.`,
        itemsDeleted: itemIdsToDelete.length
    };

  } catch (error) {
    console.error('[handleDeleteSelectedItems] Error deleting items from Firestore:', error);
    let errorMessage = 'Failed to delete selected items from the database.';
    if (error instanceof Error && error.message) {
      errorMessage = `Firestore error: ${error.message}`;
    }
    return { error: errorMessage };
  }
}

