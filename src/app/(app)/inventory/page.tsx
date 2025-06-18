
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, BookOpen, Package, ShoppingBasket, ListPlus, Edit3, Trash2, UploadCloud, Loader2, AlertTriangle } from "lucide-react";
import { getSession } from '@/lib/auth';
import type { Vendor } from '@/lib/inventoryModels';
import { Skeleton } from '@/components/ui/skeleton';
import { handleMenuPdfUpload, type MenuUploadFormState } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface VendorSession extends Pick<Vendor, 'email' | 'shopName' | 'storeCategory'> {
  isAuthenticated: boolean;
}

const initialMenuFormState: MenuUploadFormState = { isLoading: false };

function MenuUploadSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
      Upload & Process Menu
    </Button>
  );
}

export default function InventoryPage() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [menuPdfFile, setMenuPdfFile] = useState<File | null>(null);
  const { toast } = useToast();

  const [menuFormState, menuFormAction] = useFormState(handleMenuPdfUpload, initialMenuFormState);
  const [isMenuProcessing, startMenuTransition] = useTransition();


  useEffect(() => {
    async function fetchSessionData() {
      setIsLoadingSession(true);
      const currentSession = await getSession();
      if (currentSession && currentSession.isAuthenticated && currentSession.storeCategory) {
        setSession({
          isAuthenticated: true,
          email: currentSession.email,
          shopName: currentSession.shopName,
          storeCategory: currentSession.storeCategory as VendorSession['storeCategory'],
        });
      } else {
        setSession(null);
      }
      setIsLoadingSession(false);
    }
    fetchSessionData();
  }, []);

  useEffect(() => {
    if (menuFormState?.error) {
      toast({ variant: "destructive", title: "Menu Upload Error", description: menuFormState.error });
    }
    if (menuFormState?.message) {
      toast({ title: "Menu Processing", description: menuFormState.message });
    }
  }, [menuFormState, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setMenuPdfFile(file);
    } else {
      setMenuPdfFile(null);
      if (file) toast({ variant: "destructive", title: "Invalid File", description: "Please upload a PDF file."});
    }
  };

  const onMenuFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!menuPdfFile || !session?.email) {
        toast({ variant: "destructive", title: "Missing Information", description: "Please select a PDF menu and ensure you are logged in."});
        return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set('vendorId', session.email); // Add vendorId to formData
    
    startMenuTransition(() => {
        menuFormAction(formData);
    });
  };


  const renderRestaurantCafeContent = () => {
    return (
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5 text-primary" />Manage Your Menu</CardTitle>
              <CardDescription>Add, edit, and organize your menu items. You can upload a PDF menu to get started.</CardDescription>
            </div>
            <Button><PlusCircle className="mr-2 h-4 w-4" />Add Menu Item Manually</Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={onMenuFormSubmit} className="space-y-4 mb-6 p-4 border rounded-md">
              <Label htmlFor="menuPdf" className="font-semibold">Upload Menu PDF</Label>
              <Input 
                id="menuPdf" 
                name="menuPdf" 
                type="file" 
                accept="application/pdf"
                onChange={handleFileChange} 
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <MenuUploadSubmitButton />
               <p className="text-xs text-muted-foreground">
                The AI will try to extract items, categories, prices, and descriptions. Results may vary based on PDF quality.
              </p>
            </form>

            {(isMenuProcessing || menuFormState?.isLoading) && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Processing your menu with AI, please wait...</p>
              </div>
            )}

            {menuFormState?.extractedMenu && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Extracted Menu Items:</h3>
                <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(menuFormState.extractedMenu, null, 2)}
                </pre>
                {menuFormState.extractedMenu.extractedItems.length === 0 && !menuFormState.extractedMenu.rawText && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>No Items Extracted</AlertTitle>
                        <AlertDescription>
                            The AI could not extract structured items from the PDF. This might be due to the PDF format or layout.
                            You can try adding items manually or ensure your PDF is text-based and clearly structured.
                            {menuFormState.extractedMenu.rawText && " Some raw text was extracted if that helps."}
                        </AlertDescription>
                    </Alert>
                )}
                 <Button className="mt-4">Review & Save Menu (Placeholder)</Button>
              </div>
            )}
            
            <h4 className="text-md font-semibold mt-8 mb-2">Current Menu Items</h4>
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
                    Your menu is empty. Add items manually or upload a PDF.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };


  const renderInventoryContent = () => {
    if (!session || !session.storeCategory) {
      return <p className="text-muted-foreground">Loading inventory information...</p>;
    }

    switch (session.storeCategory) {
      case 'Grocery Store':
      case 'Pharmacy':
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
        return renderRestaurantCafeContent();
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

  if (isLoadingSession) {
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
      </div>
      {renderInventoryContent()}
       <p className="mt-8 text-center text-sm text-muted-foreground">
        Admin features for managing global item catalogs will be available separately.
      </p>
    </div>
  );
}
