
# Project Brief: Thru Vendor Application

## 1. Project Overview

The "Thru Vendor" application is a comprehensive web platform for businesses (vendors) to manage their presence on the "Thru" marketplace. It allows vendors to sign up, manage their inventory and product listings, process customer orders in real-time, and update their shop profiles. The application includes specialized features for different types of vendors (e.g., restaurants, grocery stores, standard retail) and leverages AI for advanced inventory management tasks. It also includes a separate, protected admin panel for platform administrators to manage vendors.

## 2. Technology Stack

*   **Framework**: Next.js 15+ with App Router
*   **Language**: TypeScript
*   **UI Library**: React with ShadCN UI components
*   **Styling**: Tailwind CSS
*   **Backend & Database**: Firebase (Authentication, Firestore, Storage)
*   **AI/Generative Features**: Google's Genkit with Gemini models

## 3. Core Features & Implementation Details

### 3.1. Authentication

*   **Vendor Signup (`/signup`)**:
    *   A multi-field form for new vendors to register. Fields include shop name, owner name, category, email, password, phone, address, business hours, and an optional shop image.
    *   **Frontend**: `src/app/signup/page.tsx` with the `SignupForm` component from `src/components/auth/SignupForm.tsx`.
    *   **Backend**: The form submits to a Server Action `handleSignup` in `src/app/signup/actions.ts`.
    *   **Process**:
        1.  Validate all form fields using Zod.
        2.  Create a new user in Firebase Authentication.
        3.  If a shop image is provided, upload it to Firebase Storage under `vendor_shop_images/{uid}/shop_image.jpg`.
        4.  Create a corresponding vendor document in the `vendors` collection in Firestore. The document ID **must** be the Firebase Auth UID.
        5.  Store all vendor details in this document.
        6.  Create a session cookie for the new user and redirect to `/dashboard`.

*   **Vendor Login (`/login`)**:
    *   A simple email and password form.
    *   **Frontend**: `src/app/login/page.tsx` with the `LoginForm` component.
    *   **Backend**: The form authenticates on the client-side against Firebase Auth, then calls a Server Action `createSession` in `src/lib/auth.ts` to set the session cookie.

*   **Admin Login (`/admin/login`)**:
    *   Uses the same UI as vendor login but has a separate "Direct Admin Login" button.
    *   **Frontend**: `src/app/(app)/admin/login/page.tsx` and `AdminLoginForm.tsx`.
    *   **Backend**: The direct login button triggers `handleAdminLogin` in `src/app/(app)/admin/login/actions.ts` which uses a hardcoded Admin UID to create a session. Regular login also works if the user is an admin.

*   **Session Management**:
    *   Handled by `src/lib/auth.ts`. A session is a simple HTTP-only cookie (`thru_vendor_auth_token`) containing the Firebase Auth UID.
    *   The `getSession` function reads this cookie and fetches user details from the `vendors` Firestore collection to populate session data. It must **always** return an object (`{ isAuthenticated: false }` on failure) to prevent server rendering crashes.
    *   The `useSession` hook in `src/hooks/use-session.ts` provides session data to client components and listens for real-time profile updates.
    *   Middleware in `src/middleware.ts` protects routes and handles redirects for authenticated/unauthenticated users.

### 3.2. Main Application Layout (`/app/(app)/*`)

*   **App Shell**: A persistent sidebar navigation layout defined in `src/components/layout/AppShell.tsx`.
*   **Navigation**: Defined in `src/config/nav.ts`. Includes links to Dashboard, Orders, Inventory, Pickup, Stock Alerts, and Profile.
*   **User Navigation**: A dropdown in the header (`UserNav.tsx`) shows the logged-in user's email and a logout button.

### 3.3. Inventory Management (`/inventory`)

This page has different UI/UX depending on the vendor's `storeCategory`.

*   **For Restaurants/Cafes/Bakeries**:
    *   **AI Menu Extraction**: Allows uploading a PDF menu. A Genkit flow (`extractMenuData` in `src/ai/flows/extract-menu-flow.ts`) processes the PDF's data URI to extract items, categories, prices, and descriptions.
    *   **Frontend**: `src/app/(app)/inventory/page.tsx`. The `handleMenuPdfUpload` server action is called.
    *   **Backend**: After AI processing, the extracted items are displayed for confirmation. On confirmation, they are saved as new `VendorInventoryItem` documents in the `vendors/{vendorId}/inventory` subcollection. These are marked as `isCustomItem: true`.
    *   **Manual Management**: Vendors can manually add, edit, and delete their menu items.

*   **For Grocery/Pharmacy/Liquor Stores**:
    *   This flow is primarily based on a **Global Catalog** (`global_items` collection).
    *   **Frontend**: The UI allows searching the global catalog based on the vendor's `sharedItemType`.
    *   **Backend**: `getGlobalItemsByType` in `src/app/(app)/inventory/actions.ts` fetches relevant items.
    *   **Linking**: When a vendor adds an item from the catalog, a new `VendorInventoryItem` is created in their subcollection. This new item stores a `globalItemRef` pointing to the original document in `global_items` and is marked `isCustomItem: false`. The vendor sets their own price and stock quantity.

*   **For General Retail (Boutique, Electronics, etc.)**:
    *   This is a simpler inventory system focused on custom items.
    *   **Frontend**: A table displays all inventory items. A dialog allows adding a new custom product with all details (name, category, price, stock, image, etc.).
    *   **Backend**: `addCustomVendorItem` server action creates a new `VendorInventoryItem` with `isCustomItem: true`.

*   **Common Actions**:
    *   **Editing**: `updateVendorItemDetails` allows updating price, stock, etc.
    *   **Deleting**: `deleteVendorItem` and `handleDeleteSelectedItems` for single/bulk deletion.
    *   **Image Uploads**: When editing an item, a new image can be uploaded. This is handled on the client in the `EditItemDialog`, which uploads directly to Firebase Storage and then passes the new URL to the `updateVendorItemDetails` server action.

### 3.4. Order Management (`/orders`)

*   **Real-time Updates**: The main orders page (`src/app/(app)/orders/page.tsx`) uses `onSnapshot` from the Firebase SDK to listen for new orders in real-time.
*   **Query**: The listener queries the `orders` collection where `vendorIds` array-contains the current vendor's UID and the `overallStatus` is an active status.
*   **UI**: Orders are displayed in tabs: "New", "Preparing", "Ready". Each order is an `OrderCard` component.
*   **Status Updates**:
    *   Vendors can accept/reject new orders. For grocery stores, they must first confirm which items are available.
    *   Accepted orders move to "Preparing".
    *   From "Preparing", they can be marked as "Ready for Pickup".
    *   **Backend**: All status changes call the `updateVendorOrderStatus` server action in `src/app/(app)/orders/actions.ts`, which updates the vendor's portion of the order within the main order document.

### 3.5. Admin Panel (`/admin`)

*   **Layout**: Uses a separate, simple layout defined in `src/app/(app)/admin/layout.tsx`.
*   **Vendor Management**:
    *   The main page (`/admin`) lists all vendors from the `vendors` collection.
    *   Admins can edit a vendor's details (`/admin/[vendorId]/edit`), which uses the `updateVendorByAdmin` server action.
    *   Admins can delete a vendor (`deleteVendorAndInventory`), which triggers a batched write to delete the vendor document and all documents in their inventory subcollection.
*   **AI Bulk Import for Global Items**:
    *   A dialog (`BulkAddDialog`) allows an admin to upload a CSV of products.
    *   **Backend**:
        1.  `handleCsvUpload` action sends the CSV headers to a Genkit flow (`processCsvData`) to get column mappings.
        2.  It then uses these mappings to parse the entire CSV into a list of items.
        3.  The parsed items are returned to the client for preview.
        4.  On confirmation, `handleBulkSaveItems` saves all items as new documents in the `global_items` collection. This action is admin-only.

This prompt should provide a comprehensive starting point for any AI developer to understand and build the application.
