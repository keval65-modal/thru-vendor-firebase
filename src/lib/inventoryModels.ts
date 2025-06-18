
import type { Timestamp, DocumentReference } from 'firebase/firestore';

/**
 * Represents an item in the global catalog, shared across certain vendor types.
 * Stored in the `global_items` collection.
 */
export interface GlobalItem {
  id?: string; // Firestore document ID
  itemName: string;
  genericName?: string;
  sharedItemType: 'grocery' | 'medical' | 'liquor' | 'other';
  defaultCategory: string;
  defaultUnit: string;
  brand?: string;
  description?: string;
  defaultImageUrl?: string;
  barcode?: string;
  searchKeywords?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Represents a specific item in a vendor's inventory.
 * This can be linked to a GlobalItem or be a custom item (e.g., restaurant menu item).
 * Stored in the `vendor_inventory` collection.
 */
export interface VendorInventoryItem {
  id?: string; // Firestore document ID
  vendorId: string; // Reference to the vendor's document ID (email)

  globalItemRef?: DocumentReference<GlobalItem>; // Optional link to a global_item
  isCustomItem: boolean;

  itemName: string; // If custom, this is the primary name. If linked, can be an override.
  vendorItemCategory: string; // Vendor's own category for the item.
  
  stockQuantity: number;
  price: number;
  costPrice?: number;
  unit: string;

  isAvailableOnThru: boolean; // If true, listed on the Thru customer platform.
  
  vendorSku?: string;
  imageUrl?: string; // Vendor-specific image for the item.
  description?: string; // Vendor-specific description.

  // For items like restaurant dishes or configurable products
  itemAttributes?: Record<string, any>; // e.g., { "spiceLevel": "medium", "isVegetarian": true, "size": "large" }
  
  preparationTimeMinutes?: number; // For prepared items like food.

  lastStockUpdate?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Represents a vendor.
 * Stored in the `vendors` collection.
 * (Extending slightly from auth.ts for clarity on inventory-related fields)
 */
export interface Vendor {
  // Fields from auth.ts VendorRegistrationData
  shopName: string;
  storeCategory: "Grocery Store" | "Restaurant" | "Bakery" | "Boutique" | "Electronics" | "Cafe" | "Pharmacy" | "Liquor Shop" | "Pet Shop" | "Gift Shop" | "Other";
  ownerName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string; // Also used as document ID
  // password is stored but not typically part of this model for client-side
  gender?: string;
  city: string;
  weeklyCloseOn: string;
  openingTime: string;
  closingTime: string;
  shopFullAddress: string;
  latitude: number;
  longitude: number;
  shopImageUrl?: string; // URL from Firebase Storage
  fullPhoneNumber?: string;
  createdAt?: Timestamp | string; // Allow string for data from server action before Firestore conversion
  
  // Additional fields
  menuPdfUrl?: string; // For restaurants/cafes if they upload a PDF
  isActiveOnThru?: boolean; // Overall shop status on Thru
}
