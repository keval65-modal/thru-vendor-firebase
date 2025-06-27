import type { Timestamp } from 'firebase/firestore';

// This is the data structure for a document in the 'orders' collection.
export interface PlacedOrder {
  orderId: string;
  customerInfo?: {
    id?: string;
    name?: string;
    phoneNumber?: string;
  };
  tripStartLocation?: string;
  tripDestination?: string;
  createdAt: string | Timestamp; // Allow both for flexibility
  overallStatus: "Pending Confirmation" | "Confirmed" | "In Progress" | "Ready for Pickup" | "Completed" | "Cancelled";
  paymentStatus: "Paid" | "Pending" | "Failed";
  grandTotal: number;
  platformFee: number;
  paymentGatewayFee: number;
  vendorPortions: VendorOrderPortion[];
  // Firestore might add an 'id' field after fetching
  id?: string; 
}

// Each order document contains an array of these portions, one for each vendor involved.
export interface VendorOrderPortion {
  vendorId: string; 
  vendorName: string;
  vendorAddress?: string;
  vendorType?: string;
  status: "New" | "Preparing" | "Ready for Pickup" | "Picked Up" | "Cancelled"; 
  items: OrderItemDetail[];
  vendorSubtotal: number;
}

// This describes a single item within a vendor's portion of the order.
export interface OrderItemDetail {
  itemId: string;
  name: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  imageUrl?: string;
  dataAiHint?: string;
  details?: string;
}

// A custom type for displaying orders in the vendor app.
// It combines the root order info with the specific vendor's portion.
export interface VendorDisplayOrder extends Omit<PlacedOrder, 'vendorPortions'> {
    vendorPortion: VendorOrderPortion;
}
