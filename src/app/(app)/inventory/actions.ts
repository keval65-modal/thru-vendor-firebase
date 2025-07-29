
'use server';

import type { GlobalItem, VendorInventoryItem } from '@/lib/inventoryModels';
import { extractMenuData, type ExtractMenuInput, type ExtractMenuOutput } from '@/ai/flows/extract-menu-flow';
import { processCsvData } from '@/ai/flows/process-csv-flow';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase-admin';
import { Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import Papa from 'papaparse';

// Ensure vendorId is typically the Firebase Auth UID used as doc ID in 'vendors' collection
// Ensure globalItemId is the Firestore document ID from 'global_items'

/**
 * Fetches global items based on their shared type (e.g., "grocery", "medical").
 */
export async function getGlobalItemsByType(itemType: GlobalItem['sharedItemType']): Promise<GlobalItem[]> {
  console.log(`[getGlobalItemsByType] Fetching global items for type: ${itemType}`);
  if (!itemType) return [];

  try {
    const q = db.collection("global_items")
      .where("sharedItemType", "==", itemType)
      .orderBy("itemName", "asc");
    
    const querySnapshot = await q.get();
    const items = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as GlobalItem;
    });
     console.log(`[getGlobalItemsByType] Found ${items.length} global items for type '${itemType}'`);
    return items;
  } catch (error) {
     console.error(`[getGlobalItemsByType] Firestore error fetching global items for type ${itemType}:`, error);
     if (error instanceof Error && (error.message.includes("indexes") || error.message.includes("requires an index"))) {
         console.error("[getGlobalItemsByType] Firestore index missing for 'global_items'. Please create a composite index in your Firebase console for the 'global_items' collection on (sharedItemType ASC, itemName ASC).");
         throw new Error("Database setup error: Missing index for global items. Please contact support or check Firebase console.");
     }
     throw new Error(`Failed to fetch global items. Database error: ${(error as Error).message}`);
  }
}


/**
 * Fetches a specific vendor's inventory items from their subcollection.
 */
export async function getVendorInventory(vendorId: string): Promise<VendorInventoryItem[]> {
  if (!vendorId || typeof vendorId !== 'string' || vendorId.trim() === '') {
    console.error("[getVendorInventory] Error: vendorId is undefined, empty, or not a string.");
    throw new Error("Vendor ID is missing or invalid. Cannot fetch inventory.");
  }

  console.log(`[getVendorInventory] Constructing query for vendorId: '${vendorId}'`);

  try {
    const inventoryCollectionRef = db.collection("vendors").doc(vendorId).collection("inventory");
    const q = inventoryCollectionRef.orderBy("itemName", "asc");
    
    const querySnapshot = await q.get();
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
    // Simple order by on a subcollection does not require a composite index, so the specific error check is removed.
    throw new Error(`Failed to fetch vendor inventory. Database error: ${(error as Error).message}`);
  }
}


const AddCustomItemSchema = z.object({
  itemName: z.string().min(1, "Item name cannot be empty."),
  vendorItemCategory: z.string().min(1, "Category cannot be empty."),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, "Price must be a positive number.")
  ),
  mrp: z.preprocess(
    (val) => val ? parseFloat(String(val)) : undefined,
    z.number().min(0, "MRP must be a positive number.").optional()
  ),
  stockQuantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(0, "Stock must be a non-negative integer.")
  ),
  unit: z.string().min(1, "Unit (e.g., 'piece', 'kg', 'serving') cannot be empty."),
  description: z.string().optional(),
}).refine(data => !data.mrp || data.price <= data.mrp, {
    message: "Price cannot be higher than MRP.",
    path: ["price"],
});

export type AddCustomItemFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string[]>;
};

/**
 * Adds a new custom item to a vendor's inventory subcollection.
 */
export async function addCustomVendorItem(
  prevState: AddCustomItemFormState,
  formData: FormData
): Promise<AddCustomItemFormState> {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return { error: 'Authentication required.' };
  }
  const vendorId = session.uid;

  const validatedFields = AddCustomItemSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      error: "Invalid data submitted.",
      fields: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { ...itemData } = validatedFields.data;
  
  const newItemData: Omit<VendorInventoryItem, 'id'> = {
    vendorId,
    isCustomItem: true,
    itemName: itemData.itemName,
    vendorItemCategory: itemData.vendorItemCategory,
    stockQuantity: itemData.stockQuantity,
    price: itemData.price,
    mrp: itemData.mrp,
    unit: itemData.unit,
    description: itemData.description,
    isAvailableOnThru: true,
    imageUrl: `https://placehold.co/50x50.png?text=${encodeURIComponent(itemData.itemName.substring(0,10))}`,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastStockUpdate: Timestamp.now(),
  };
  
  try {
    const inventoryCollectionRef = db.collection('vendors').doc(vendorId).collection('inventory');
    await inventoryCollectionRef.add(newItemData);
    
    revalidatePath('/inventory');
    return { success: true, message: `${itemData.itemName} added successfully.` };
  } catch (error) {
    console.error(`[addCustomVendorItem] Error adding custom item for vendor ${vendorId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to add item. ${errorMessage}` };
  }
}


const LinkGlobalItemSchema = z.object({
  globalItemId: z.string().min(1, "Global Item ID is required."),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, "Price must be a positive number.")
  ),
  stockQuantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(0, "Stock must be a non-negative integer.")
  ),
  mrp: z.preprocess(
    (val) => val ? parseFloat(String(val)) : undefined,
    z.number().optional()
  ),
}).refine(data => !data.mrp || data.price <= data.mrp, {
    message: "Price cannot be higher than MRP.",
    path: ["price"],
});

export type LinkGlobalItemFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string[]>;
};

/**
 * Links a global item to a vendor's inventory, creating a new entry in their inventory subcollection.
 */
export async function linkGlobalItemToVendorInventory(
  prevState: LinkGlobalItemFormState,
  formData: FormData
): Promise<LinkGlobalItemFormState> {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return { error: 'Authentication required.' };
  }
  const vendorId = session.uid;

  const validatedFields = LinkGlobalItemSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error("[linkGlobalItemToVendorInventory] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return { error: "Invalid data submitted.", fields: validatedFields.error.flatten().fieldErrors, };
  }

  const { globalItemId, price, stockQuantity } = validatedFields.data;
  console.log(`[linkGlobalItemToVendorInventory] Linking global item ${globalItemId} for vendor ${vendorId} with stock ${stockQuantity}, price ${price}`);

  try {
    const globalItemRef = db.collection('global_items').doc(globalItemId) as DocumentReference<GlobalItem>;
    const globalItemSnap = await globalItemRef.get();

    if (!globalItemSnap.exists) {
      return { success: false, error: 'Global item not found.' };
    }
    const globalItemData = globalItemSnap.data() as GlobalItem;

    const newItemData: Omit<VendorInventoryItem, 'id'> = {
      vendorId, // Keep for denormalization and easier client-side access
      globalItemRef: globalItemRef,
      isCustomItem: false,
      itemName: globalItemData.itemName,
      vendorItemCategory: globalItemData.defaultCategory,
      stockQuantity,
      price,
      mrp: globalItemData.mrp, // Carry over MRP from global item
      unit: globalItemData.defaultUnit,
      isAvailableOnThru: true,
      imageUrl: globalItemData.defaultImageUrl || `https://placehold.co/50x50.png?text=${globalItemData.itemName.substring(0,10)}`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastStockUpdate: Timestamp.now(),
    };
    
    const inventoryCollectionRef = db.collection('vendors').doc(vendorId).collection('inventory');
    const docRef = await inventoryCollectionRef.add(newItemData);
    console.log(`[linkGlobalItemToVendorInventory] Successfully created vendor inventory item ${docRef.id}`);
    revalidatePath('/inventory');
    return { success: true, message: `${globalItemData.itemName} added to your inventory.` };
  } catch (error) {
    console.error(`[linkGlobalItemToVendorInventory] Error linking global item ${globalItemId} for vendor ${vendorId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to link item. ${errorMessage}` };
  }
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


export type UpdateItemFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string[]>; // For field-specific errors
};

// Schema for updating item details
const UpdateVendorItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required."),
  itemName: z.string().min(1, "Item name cannot be empty."),
  vendorItemCategory: z.string().min(1, "Category cannot be empty."),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, "Price must be a positive number.")
  ),
  mrp: z.preprocess(
    (val) => val ? parseFloat(String(val)) : undefined,
    z.number().min(0, "MRP must be a positive number.").optional()
  ),
  stockQuantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(0, "Stock must be a non-negative integer.")
  ),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).or(z.literal('')).optional(),
}).refine(data => !data.mrp || data.price <= data.mrp, {
    message: "Price cannot be higher than MRP.",
    path: ["price"],
});


export async function updateVendorItemDetails(
  prevState: UpdateItemFormState,
  formData: FormData
): Promise<UpdateItemFormState> {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return { error: 'Authentication required.' };
  }
  const vendorId = session.uid;

  const rawData = Object.fromEntries(formData.entries());
  console.log('[updateVendorItemDetails] Received raw form data:', rawData);

  const validatedFields = UpdateVendorItemSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.error("[updateVendorItemDetails] Validation error:", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid data for updating item. Please check your inputs.",
      fields: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { itemId, ...updates } = validatedFields.data;
  
  const dataToUpdate: Partial<VendorInventoryItem> & { updatedAt: Timestamp } = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  // Ensure optional fields are not set to undefined if they are empty strings
  if (dataToUpdate.description === '') dataToUpdate.description = undefined;
  if (dataToUpdate.imageUrl === '') {
      dataToUpdate.imageUrl = `https://placehold.co/50x50.png?text=${encodeURIComponent(updates.itemName.substring(0,10))}`;
  }


  try {
    const itemRef = db.collection("vendors").doc(vendorId).collection("inventory").doc(itemId);
    await itemRef.update(dataToUpdate as { [key: string]: any }); 
    console.log(`[updateVendorItemDetails] Successfully updated item ${itemId} for vendor ${vendorId}`);
    revalidatePath('/inventory');
    return { success: true, message: "Item details updated successfully." };
  } catch (error) {
    console.error(`[updateVendorItemDetails] Error updating item ${itemId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during update.";
    return { success: false, error: `Failed to update item. ${errorMessage}` };
  }
}


export type DeleteItemFormState = {
  success?: boolean;
  error?: string;
  message?: string;
};
/**
 * Deletes an item from a vendor's inventory subcollection.
 */
export async function deleteVendorItem(prevState: DeleteItemFormState, formData: FormData): Promise<DeleteItemFormState> {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return { success: false, error: "Authentication required." };
    }
    const vendorId = session.uid;

    const vendorInventoryItemId = formData.get('itemId') as string;
    console.log(`[deleteVendorItem] Attempting to delete item ${vendorInventoryItemId} for vendor ${vendorId}`);
    if (!vendorInventoryItemId) {
        console.error("[deleteVendorItem] Item ID is missing for deletion.");
        return { success: false, error: "Item ID is missing for deletion." };
    }
    try {
        const itemRef = db.collection("vendors").doc(vendorId).collection("inventory").doc(vendorInventoryItemId);
        await itemRef.delete();
        console.log(`[deleteVendorItem] Successfully deleted item ${vendorInventoryItemId}`);
        revalidatePath('/inventory');
        return { success: true, message: "Item deleted successfully." };
    } catch (error) {
        console.error(`[deleteVendorItem] Error deleting item ${vendorInventoryItemId}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error during deletion.";
        return { success: false, error: `Failed to delete item. ${errorMessage}` };
    }
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
  const session = await getSession();

  if (!session.isAuthenticated) {
    return { error: 'You must be logged in to upload a menu.' };
  }
  const vendorId = session.uid;

  const menuFile = formData.get('menuPdf') as File;
  console.log("[handleMenuPdfUpload] Received menuFile:", menuFile?.name, "vendorId:", vendorId);

  if (!menuFile || menuFile.size === 0) {
    console.warn("[handleMenuPdfUpload] No PDF file uploaded or file is empty.");
    return { error: 'No PDF file uploaded or file is empty.' };
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
    const session = await getSession();
    if (!session.isAuthenticated) {
        console.error("[handleRemoveDuplicateItems] Vendor not authenticated.");
        return { error: "Authentication required." };
    }
    const vendorId = session.uid;
    console.log(`[handleRemoveDuplicateItems] Starting for vendor: ${vendorId}`);

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
        
        const batch = db.batch();
        const inventoryCollectionRef = db.collection('vendors').doc(vendorId).collection('inventory');
        duplicateIdsToDelete.forEach(id => {
            batch.delete(inventoryCollectionRef.doc(id));
        });
        await batch.commit();

        console.log(`[handleRemoveDuplicateItems] Successfully deleted ${duplicateIdsToDelete.length} duplicate items for vendor ${vendorId}.`);
        revalidatePath('/inventory');
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
  const session = await getSession();
  if (!session.isAuthenticated) {
    return { error: 'Authentication required.' };
  }
  const vendorId = session.uid;

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
    const batch = db.batch();
    itemIdsToDelete.forEach(itemId => {
      if (itemId && typeof itemId === 'string') {
        const itemRef = db.collection('vendors').doc(vendorId).collection('inventory').doc(itemId);
        batch.delete(itemRef);
      } else {
         console.warn(`[handleDeleteSelectedItems] Invalid item ID found in batch: ${itemId}`);
      }
    });

    await batch.commit();
    console.log(`[handleDeleteSelectedItems] Successfully deleted ${itemIdsToDelete.length} items from Firestore.`);
    revalidatePath('/inventory');
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


// --- AI Bulk Add Global Items ---

const ParsedItemSchema = z.object({
  itemName: z.string().describe("The name of the product."),
  sharedItemType: z.enum(['grocery', 'medical', 'liquor', 'other']).describe("The high-level type of the item."),
  defaultCategory: z.string().describe("A specific category for the item."),
  defaultUnit: z.string().describe("The unit of measurement or sale."),
  brand: z.string().optional().describe("The brand name of the product."),
  mrp: z.number().optional().describe("The Maximum Retail Price."),
  price: z.number().optional().describe("The actual selling price."),
  defaultImageUrl: z.string().url().optional().describe("A URL for the product's image."),
  description: z.string().optional().describe("A brief description of the product."),
  barcode: z.string().optional().describe("The barcode or UPC of the product."),
});


export type CsvParseFormState = {
  parsedItems?: z.infer<typeof ParsedItemSchema>[];
  error?: string;
  message?: string;
};


export async function handleCsvUpload(
  prevState: CsvParseFormState,
  formData: FormData
): Promise<CsvParseFormState> {
  console.log('DEBUG: [handleCsvUpload] ----------------- ACTION STARTED -----------------');
  const csvFile = formData.get('csvFile') as File;

  if (!csvFile || csvFile.size === 0) {
    console.error('DEBUG: [handleCsvUpload] No CSV file found or file is empty.');
    return { error: "CSV file is required." };
  }
  
  try {
    const csvData = await csvFile.text();
    const parseResult = Papa.parse<Record<string, string>>(csvData, { header: true, skipEmptyLines: true });
    
    if (parseResult.errors.length > 0) {
        console.error('DEBUG: [handleCsvUpload] PapaParse errors:', parseResult.errors);
        return { error: `Failed to parse CSV file: ${parseResult.errors[0].message}` };
    }
    
    const headers = parseResult.meta.fields;
    if (!headers || headers.length === 0) {
        return { error: 'CSV file appears to be empty or missing headers. Please check the file for empty lines before the header row.' };
    }
    const csvSample = headers.join(',');
    
    console.log(`DEBUG: [handleCsvUpload] Sending headers to AI for mapping: ${csvSample}`);
    
    let mappings;
    try {
        const mappingResult = await processCsvData({ csvSample });
        mappings = mappingResult.mappings;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI mapping.";
        console.error('DEBUG: [handleCsvUpload] AI mapping failed:', errorMessage);
        return { error: `AI mapping failed: ${errorMessage}` };
    }
    
    if (!mappings) {
        console.error('DEBUG: [handleCsvUpload] AI failed to return mappings.');
        return { error: 'The AI could not determine column mappings from your CSV headers. Please ensure they are clear (e.g., "Name", "Price").' };
    }
    console.log('DEBUG: [handleCsvUpload] AI returned mappings:', mappings);

    // Apply mappings to the full dataset
    const processedItems = parseResult.data.map(row => {
        const getNum = (colName: string | undefined) => {
             if (!colName || !row[colName]) return undefined;
             const cleaned = String(row[colName]).replace(/[^0-9.-]+/g, "");
             const num = parseFloat(cleaned);
             return isNaN(num) ? undefined : num;
        };
        const getString = (colName: string | undefined) => colName ? row[colName] : undefined;

        const category = getString(mappings.sharedItemType);

        return {
            itemName: getString(mappings.itemName) || 'Unnamed Item',
            sharedItemType: (category && category.toLowerCase().includes('grocery')) ? 'grocery' : 'other',
            defaultCategory: getString(mappings.defaultCategory) || 'Uncategorized',
            defaultUnit: getString(mappings.defaultUnit) || 'unit',
            brand: getString(mappings.brand),
            mrp: getNum(mappings.mrp),
            price: getNum(mappings.price),
            description: getString(mappings.description),
            barcode: getString(mappings.barcode),
        } as z.infer<typeof ParsedItemSchema>;
    }).filter(item => item.itemName !== 'Unnamed Item');

    console.log(`DEBUG: [handleCsvUpload] Successfully processed ${processedItems.length} items.`);
    return { parsedItems: processedItems, message: `Successfully parsed ${processedItems.length} items for preview.` };

  } catch(error) {
    console.error('DEBUG: [handleCsvUpload] CRITICAL ERROR during processing:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during processing.";
    return { error: errorMessage };
  }
}

export type BulkSaveFormState = {
    success?: boolean;
    error?: string;
    message?: string;
    itemsAdded?: number;
};

export async function handleBulkSaveItems(
    prevState: BulkSaveFormState,
    formData: FormData
): Promise<BulkSaveFormState> {
    console.log('DEBUG: handleBulkSaveItems server action started.');
    const session = await getSession();
    if (!session.isAuthenticated || session.role !== 'admin') {
        console.error('DEBUG: handleBulkSaveItems - Authorization failed. User is not an admin.');
        return { error: "You are not authorized to perform this action." };
    }
    console.log('DEBUG: handleBulkSaveItems - Admin check passed.');

    const itemsJson = formData.get('itemsJson') as string;
    if (!itemsJson) {
        console.error('DEBUG: handleBulkSaveItems - No itemsJson found in form data.');
        return { error: "No items to save." };
    }
    console.log(`DEBUG: handleBulkSaveItems - Received itemsJson with length: ${itemsJson.length}`);

    let itemsToSave: Omit<GlobalItem, 'id'>[];
    try {
        itemsToSave = JSON.parse(itemsJson);
        console.log(`DEBUG: handleBulkSaveItems - Successfully parsed ${itemsToSave.length} items from JSON.`);
    } catch(e) {
        console.error('DEBUG: handleBulkSaveItems - Failed to parse itemsJson.', e);
        return { error: "Invalid items format." };
    }

    if (!Array.isArray(itemsToSave) || itemsToSave.length === 0) {
        console.error('DEBUG: handleBulkSaveItems - itemsToSave is not an array or is empty.');
        return { error: "No items to save." };
    }

    try {
        const batch = db.batch();
        const now = Timestamp.now();
        console.log(`DEBUG: handleBulkSaveItems - Preparing batch write for ${itemsToSave.length} items.`);

        itemsToSave.forEach((item, index) => {
            const newItemRef = db.collection('global_items').doc();
            const newItemData: Omit<GlobalItem, 'id'> = {
                ...item,
                createdAt: now,
                updatedAt: now,
            };
            batch.set(newItemRef, newItemData);
            if (index < 5) { // Log first few items to be saved
                 console.log(`DEBUG: Staging item ${index + 1}:`, JSON.stringify(newItemData));
            }
        });

        await batch.commit();
        console.log(`DEBUG: handleBulkSaveItems - Batch commit successful.`);

        return { success: true, message: `Successfully added ${itemsToSave.length} items to the global catalog.`, itemsAdded: itemsToSave.length };
    } catch (error) {
        console.error('DEBUG: handleBulkSaveItems - CRITICAL ERROR saving items to Firestore:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { error: `Failed to save items. ${errorMessage}` };
    }
}
