
'use server';

import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc, DocumentReference, Timestamp, deleteDoc, orderBy, writeBatch } from 'firebase/firestore';
import type { GlobalItem, VendorInventoryItem } from '@/lib/inventoryModels';
import { extractMenuData, type ExtractMenuInput, type ExtractMenuOutput } from '@/ai/flows/extract-menu-flow';
import { processCsvData, type ProcessCsvInput, type ProcessCsvOutput } from '@/ai/flows/process-csv-flow';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin'; // Using admin for server actions

/**
 * Fetches global items based on their shared type (e.g., "grocery", "medical").
 * This is a server action.
 */
export async function getGlobalItemsByType(itemType: GlobalItem['sharedItemType']): Promise<GlobalItem[]> {
  console.log(`[getGlobalItemsByType] Fetching global items for type: ${itemType}`);
  if (!itemType) return [];

  try {
    const db = adminDb();
    const q = query(
      collection(db, "global_items"),
      where("sharedItemType", "==", itemType),
      orderBy("itemName", "asc")
    );
    const querySnapshot = await getDocs(q);
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
 * This is a server action.
 */
export async function getVendorInventory(vendorId: string): Promise<VendorInventoryItem[]> {
  if (!vendorId || typeof vendorId !== 'string' || vendorId.trim() === '') {
    console.error("[getVendorInventory] Error: vendorId is undefined, empty, or not a string.");
    throw new Error("Vendor ID is missing or invalid. Cannot fetch inventory.");
  }

  console.log(`[getVendorInventory] Constructing query for vendorId: '${vendorId}'`);

  try {
    const db = adminDb();
    const inventoryCollectionRef = collection(db, "vendors", vendorId, "inventory");
    const q = query(
      inventoryCollectionRef,
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
  if (!session?.uid) {
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
  
  const newItemData: Omit<VendorInventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'lastStockUpdate'> & {createdAt: Timestamp, updatedAt: Timestamp, lastStockUpdate: Timestamp} = {
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
    const db = adminDb();
    const inventoryCollectionRef = collection(db, 'vendors', vendorId, 'inventory');
    await addDoc(inventoryCollectionRef, newItemData);
    
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
  const vendorId = session?.uid;
  if (!vendorId) {
    return { error: 'Authentication required.' };
  }

  const validatedFields = LinkGlobalItemSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error("[linkGlobalItemToVendorInventory] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return { error: "Invalid data submitted.", fields: validatedFields.error.flatten().fieldErrors, };
  }

  const { globalItemId, price, stockQuantity } = validatedFields.data;
  console.log(`[linkGlobalItemToVendorInventory] Linking global item ${globalItemId} for vendor ${vendorId} with stock ${stockQuantity}, price ${price}`);

  try {
    const db = adminDb();
    const globalItemRef = doc(db, 'global_items', globalItemId);
    const globalItemSnap = await getDoc(globalItemRef);

    if (!globalItemSnap.exists()) {
      return { success: false, error: 'Global item not found.' };
    }
    const globalItemData = globalItemSnap.data() as GlobalItem;

    const newItemData: any = {
      vendorId, // Keep for denormalization and easier client-side access
      globalItemRef,
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
    
    const inventoryCollectionRef = collection(db, 'vendors', vendorId, 'inventory');
    const docRef = await addDoc(inventoryCollectionRef, newItemData);
    console.log(`[linkGlobalItemToVendorInventory] Successfully created vendor inventory item ${docRef.id}`);
    revalidatePath('/inventory');
    return { success: true, message: `${globalItemData.itemName} added to your inventory.` };
  } catch (error) {
    console.error(`[linkGlobalItemToVendorInventory] Error linking global item ${globalItemId} for vendor ${vendorId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to link item. ${errorMessage}` };
  }
}


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
  imageUrl: z.string().url({ message: "Please enter a valid URL for the image." }).or(z.literal('')).optional(),
}).refine(data => !data.mrp || data.price <= data.mrp, {
    message: "Price cannot be higher than MRP.",
    path: ["price"],
});


export type UpdateItemFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string[]>; // For field-specific errors
};

export async function updateVendorItemDetails(
  prevState: UpdateItemFormState,
  formData: FormData
): Promise<UpdateItemFormState> {
  const session = await getSession();
  if (!session?.uid) {
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

  if (dataToUpdate.description === '') dataToUpdate.description = undefined;
  if (dataToUpdate.imageUrl === '') dataToUpdate.imageUrl = 'https://placehold.co/50x50.png';

  try {
    const db = adminDb();
    const itemRef = doc(db, "vendors", vendorId, "inventory", itemId);
    await updateDoc(itemRef, dataToUpdate as any);
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

export async function deleteVendorItem(prevState: DeleteItemFormState, formData: FormData): Promise<DeleteItemFormState> {
    const session = await getSession();
    if (!session?.uid) {
        return { success: false, error: "Authentication required." };
    }
    const vendorId = session.uid;

    const vendorInventoryItemId = formData.get('itemId') as string;
    if (!vendorInventoryItemId) {
        return { success: false, error: "Item ID is missing for deletion." };
    }
    try {
        const db = adminDb();
        const itemRef = doc(db, "vendors", vendorId, "inventory", vendorInventoryItemId);
        await deleteDoc(itemRef);
        console.log(`[deleteVendorItem] Successfully deleted item ${vendorInventoryItemId}`);
        revalidatePath('/inventory');
        return { success: true, message: "Item deleted successfully." };
    } catch (error) {
        console.error(`[deleteVendorItem] Error deleting item ${vendorInventoryItemId}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error during deletion.";
        return { success: false, error: `Failed to delete item. ${errorMessage}` };
    }
}

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
  const session = await getSession();
  const vendorId = session?.uid;

  if (!vendorId) {
    return { error: 'You must be logged in to upload a menu.' };
  }

  const menuFile = formData.get('menuPdf') as File;
  if (!menuFile || menuFile.size === 0) {
    return { error: 'No PDF file uploaded or file is empty.' };
  }
  if (menuFile.type !== 'application/pdf') {
    return { error: 'Uploaded file is not a PDF.' };
  }

  let menuDataUri = '';
  try {
    const arrayBuffer = await menuFile.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    menuDataUri = `data:application/pdf;base64,${base64String}`;
  } catch (conversionError) {
    return { error: 'Failed to process PDF file content.' };
  }

  const validatedFields = MenuPdfUploadSchema.safeParse({ menuDataUri, vendorId });
  if (!validatedFields.success) {
    return { error: 'Invalid data for menu PDF processing.' };
  }

  const inputData: ExtractMenuInput = validatedFields.data;
  try {
    const result = await extractMenuData(inputData);
    if (!result || !result.extractedItems) {
        return { error: 'AI menu extraction returned an unexpected result.' };
    }
    return { extractedMenu: result, message: `Menu processed. ${result.extractedItems.length} items found.` };
  } catch (error) {
    const errorMessage = error instanceof Error ? `AI processing error: ${error.message}` : 'Failed to process menu PDF with AI.';
    return { error: errorMessage };
  }
}

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
    const vendorId = session?.uid;
    if (!vendorId) {
        return { error: "Vendor ID is missing." };
    }

    try {
        const inventoryItems = await getVendorInventory(vendorId);
        if (inventoryItems.length === 0) {
            return { success: true, message: "Inventory is empty.", duplicatesRemoved: 0 };
        }

        const seenItems = new Map<string, string>();
        const duplicateIdsToDelete: string[] = [];

        for (const item of inventoryItems) {
            const itemKey = `${item.itemName.toLowerCase().trim()}-${item.vendorItemCategory.toLowerCase().trim()}`;
            if (seenItems.has(itemKey)) {
                duplicateIdsToDelete.push(item.id!);
            } else {
                seenItems.set(itemKey, item.id!);
            }
        }

        if (duplicateIdsToDelete.length === 0) {
            return { success: true, message: "No duplicate items found.", duplicatesRemoved: 0 };
        }

        const db = adminDb();
        const batch = writeBatch(db);
        duplicateIdsToDelete.forEach(id => {
            batch.delete(doc(db, "vendors", vendorId, "inventory", id));
        });
        await batch.commit();

        revalidatePath('/inventory');
        return {
            success: true,
            message: `Successfully removed ${duplicateIdsToDelete.length} duplicate items.`,
            duplicatesRemoved: duplicateIdsToDelete.length
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { error: `Failed to remove duplicate items. ${errorMessage}` };
    }
}

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
  const session = await getSession();
  if (!session?.uid) {
    return { error: 'Authentication required.' };
  }
  const vendorId = session.uid;

  const validatedFields = DeleteSelectedItemsSchema.safeParse({
    selectedItemIdsJson: formData.get('selectedItemIdsJson'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid data for deleting items.' };
  }

  const { selectedItemIdsJson } = validatedFields.data;
  const itemIdsToDelete: string[] = JSON.parse(selectedItemIdsJson);

  if (!itemIdsToDelete.length) {
    return { error: 'No items selected for deletion.' };
  }

  try {
    const db = adminDb();
    const batch = writeBatch(db);
    itemIdsToDelete.forEach(itemId => {
      batch.delete(doc(db, 'vendors', vendorId, 'inventory', itemId));
    });
    await batch.commit();
    revalidatePath('/inventory');
    return {
        success: true,
        message: `${itemIdsToDelete.length} item(s) deleted successfully.`,
        itemsDeleted: itemIdsToDelete.length
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? `Firestore error: ${error.message}` : 'Failed to delete items.';
    return { error: errorMessage };
  }
}

export type CsvParseFormState = {
  parsedItems?: ProcessCsvOutput['parsedItems'];
  error?: string;
  message?: string;
};

export async function handleCsvUpload(
  prevState: CsvParseFormState,
  formData: FormData
): Promise<CsvParseFormState> {
  const csvFile = formData.get('csvFile') as File;
  if (!csvFile || csvFile.size === 0) {
    return { error: "CSV file is required." };
  }
  
  try {
    const csvData = await csvFile.text();
    const result = await processCsvData({ csvData });
    
    if (!result || !result.parsedItems) {
      return { error: "AI failed to parse items from the CSV file." };
    }
    
    return { parsedItems: result.parsedItems, message: `Parsed ${result.parsedItems.length} items for preview.` };
  } catch(error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error during AI processing.";
    return { error: errorMessage };
  }
}

export type BulkSaveFormState = {
    success?: boolean;
    error?: string;
    message?: string;
    itemsAdded?: number;
};

async function isAdmin() {
    const session = await getSession();
    return session?.role === 'admin';
}

export async function handleBulkSaveItems(
    prevState: BulkSaveFormState,
    formData: FormData
): Promise<BulkSaveFormState> {
    if (!await isAdmin()) {
        return { error: "You are not authorized to perform this action." };
    }

    const itemsJson = formData.get('itemsJson') as string;
    if (!itemsJson) {
        return { error: "No items to save." };
    }
    const itemsToSave: Omit<GlobalItem, 'id'>[] = JSON.parse(itemsJson);

    if (!itemsToSave.length) {
        return { error: "No items to save." };
    }

    try {
        const db = adminDb();
        const batch = writeBatch(db);
        const now = Timestamp.now();

        itemsToSave.forEach((item) => {
            const newItemRef = doc(collection(db, 'global_items'));
            const newItemData: Omit<GlobalItem, 'id'> = {
                ...item,
                createdAt: now,
                updatedAt: now,
            };
            batch.set(newItemRef, newItemData);
        });

        await batch.commit();

        return { success: true, message: `Added ${itemsToSave.length} items to the global catalog.`, itemsAdded: itemsToSave.length };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { error: `Failed to save items. ${errorMessage}` };
    }
}
