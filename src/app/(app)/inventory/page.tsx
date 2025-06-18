
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, BookOpen, Package, ShoppingBasket, ListPlus, Edit3, Trash2 } from "lucide-react";
import { getSession } from '@/lib/auth';
import type { Vendor } from '@/lib/inventoryModels'; // Assuming Vendor type includes storeCategory
import { Skeleton } from '@/components/ui/skeleton';
// import { getGlobalItemsByType, getVendorInventory } from './actions'; // Placeholder for actions
// import type { GlobalItem, VendorInventoryItem } from '@/lib/inventoryModels';

// Define a simple type for the session data we expect
interface VendorSession extends Pick<Vendor, 'email' | 'shopName' | 'storeCategory'> {
  isAuthenticated: boolean;
}

export default function InventoryPage() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const [globalItems, setGlobalItems] = useState<GlobalItem[]>([]);
  // const [vendorInventory, setVendorInventory] = useState<VendorInventoryItem[]>([]);
  // const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchSessionData() {
      setIsLoading(true);
      const currentSession = await getSession();
      if (currentSession && currentSession.isAuthenticated && currentSession.storeCategory) {
        setSession({
          isAuthenticated: true,
          email: currentSession.email,
          shopName: currentSession.shopName,
          storeCategory: currentSession.storeCategory as VendorSession['storeCategory'],
        });
      } else {
        // Handle case where session or storeCategory might not be available
        setSession(null);
      }
      setIsLoading(false);
    }
    fetchSessionData();
  }, []);

  // useEffect(() => {
  //   if (session?.email && session.storeCategory) {
  //     // Fetch initial data based on store type - Placeholder logic
  //     const loadData = async () => {
  //       setIsLoading(true);
  //       // if (['Grocery Store', 'Medical', 'Liquor Shop'].includes(session.storeCategory!)) {
  //       //   const items = await getGlobalItemsByType(session.storeCategory!.toLowerCase().replace(' ', '') as any);
  //       //   setGlobalItems(items);
  //       // }
  //       // const inventory = await getVendorInventory(session.email!);
  //       // setVendorInventory(inventory);
  //       setIsLoading(false);
  //     };
  //     loadData();
  //   }
  // }, [session]);

  const renderInventoryContent = () => {
    if (!session || !session.storeCategory) {
      return <p className="text-muted-foreground">Loading inventory information...</p>;
    }

    switch (session.storeCategory) {
      case 'Grocery Store':
      case 'Pharmacy': // Assuming 'Medical' corresponds to 'Pharmacy' category
      case 'Liquor Shop':
        return (
          <div className="space-y-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><ShoppingBasket className="mr-2 h-5 w-5 text-primary" />Add from Global Catalog</CardTitle>
                <CardDescription>Search and add items from a shared catalog for {session.storeCategory}.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input type="text" placeholder="Search global items..." className="flex-grow" />
                  <Button><Search className="mr-2 h-4 w-4" />Search</Button>
                </div>
                {/* Placeholder for search results */}
                <p className="text-sm text-muted-foreground">Global item search results will appear here.</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center"><Package className="mr-2 h-5 w-5 text-primary" />Your Current Inventory</CardTitle>
                    <CardDescription>Manage stock and prices for your listed items.</CardDescription>
                </div>
                <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" />Add Custom Product</Button>
              </CardHeader>
              <CardContent>
                {/* Placeholder for vendor's inventory table */}
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No inventory items yet. Start by adding products.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      case 'Restaurant':
      case 'Cafe':
        return (
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5 text-primary" />Manage Your Menu</CardTitle>
                <CardDescription>Add, edit, and organize your menu items.</CardDescription>
              </div>
              <Button><PlusCircle className="mr-2 h-4 w-4" />Add Menu Item</Button>
            </CardHeader>
            <CardContent>
              {/* Placeholder for menu items list/table */}
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Your menu is empty. Add some items to get started.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        );
      case 'Gift Shop':
      case 'Boutique':
      case 'Electronics':
      case 'Other':
      default:
        return (
          <Card className="shadow-lg">
             <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center"><ListPlus className="mr-2 h-5 w-5 text-primary" />Manage Your Products</CardTitle>
                <CardDescription>Add and update your unique product listings.</CardDescription>
              </div>
              <Button><PlusCircle className="mr-2 h-4 w-4" />Add Product</Button>
            </CardHeader>
            <CardContent>
              {/* Placeholder for general product list/table */}
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        You haven't added any products yet.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-1"/>
            <Skeleton className="h-4 w-3/4"/>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">
            {session?.shopName ? `${session.shopName} (${session.storeCategory})` : 'Manage your products and stock.'}
          </p>
        </div>
        {/* Contextual "Add" button might be better placed within specific sections now */}
      </div>
      {renderInventoryContent()}
       <p className="mt-8 text-center text-sm text-muted-foreground">
        Admin features for managing global item catalogs will be available separately.
      </p>
    </div>
  );
}
