
import type { Timestamp, DocumentReference } from 'firebase-admin/firestore';

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
  mrp?: number; // Maximum Retail Price
  price?: number; // Selling price
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

/**
 * Represents a specific item in a vendor's inventory.
 * This can be linked to a GlobalItem or be a custom item (e.g., restaurant menu item).
 * Stored in the `vendors/{vendorId}/inventory` subcollection.
 */
export interface VendorInventoryItem {
  id?: string; // Firestore document ID
  vendorId: string; // Reference to the vendor's document ID (Firebase Auth UID)

  globalItemRef?: DocumentReference<GlobalItem>; // Optional link to a global_item
  isCustomItem: boolean;

  itemName: string; // If custom, this is the primary name. If linked, can be an override.
  vendorItemCategory: string; // Vendor's own category for the item.
  
  stockQuantity: number;
  price: number;
  mrp?: number; // Vendor's price should be <= MRP. Stored for reference and for custom items.
  unit: string;

  isAvailableOnThru: boolean; // If true, listed on the Thru customer platform.
  
  imageUrl?: string; // Vendor-specific image for the item.
  description?: string; // Vendor-specific description.

  lastStockUpdate?: Timestamp | string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

/**
 * Represents a vendor.
 * Stored in the `vendors` collection.
 */
export interface Vendor {
  id: string; // The Firebase Auth UID is used as the document ID
  shopName: string;
  storeCategory: "Grocery Store" | "Restaurant" | "Bakery" | "Boutique" | "Electronics" | "Cafe" | "Pharmacy" | "Liquor Shop" | "Pet Shop" | "Gift Shop" | "Other";
  ownerName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  gender?: string;
  city: string;
  weeklyCloseOn: string;
  openingTime: string;
  closingTime: string;
  shopFullAddress: string;
  latitude: number;
  longitude: number;
  shopImageUrl?: string; 
  fullPhoneNumber: string;
  createdAt: Timestamp | string; 
  updatedAt: Timestamp | string;
  
  isActiveOnThru: boolean; 
  type: Vendor['storeCategory'];
  role: 'vendor' | 'admin';
}
