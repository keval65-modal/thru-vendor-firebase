
'use client';

import { useEffect, useState, useActionState, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Search, BookOpen, Package, ShoppingBasket, ListPlus, Edit3, Trash2, UploadCloud, Loader2, AlertTriangle, Save, RefreshCw, Sparkles, Filter } from "lucide-react";
import { getSession } from '@/lib/auth';
import type { Vendor, VendorInventoryItem } from '@/lib/inventoryModels';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    handleMenuPdfUpload, type MenuUploadFormState, 
    handleSaveExtractedMenu, type SaveMenuFormState, 
    getVendorInventory, 
    deleteVendorItem, type DeleteItemFormState,
    handleRemoveDuplicateItems, type RemoveDuplicatesFormState
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface VendorSession extends Pick<Vendor, 'email' | 'shopName' | 'storeCategory'> {
  isAuthenticated: boolean;
}

const initialMenuUploadState: MenuUploadFormState = {};
const initialSaveMenuState: SaveMenuFormState = {};
const initialDeleteItemState: DeleteItemFormState = {};
const initialRemoveDuplicatesState: RemoveDuplicatesFormState = {};

function MenuUploadSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
      Upload & Process Menu
    </Button>
  );
}

function SaveMenuButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-4 bg-green-600 hover:bg-green-700 text-white">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      Confirm & Save Extracted Menu
    </Button>
  );
}

function DeleteItemButton() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction
      type="submit" 
      disabled={pending}
      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
      Delete
    </AlertDialogAction>
  );
}

function RemoveDuplicatesButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Remove Duplicates
        </Button>
    );
}


export default function InventoryPage() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [menuPdfFile, setMenuPdfFile] = useState<File | null>(null);
  const { toast } = useToast();

  const [menuUploadState, menuUploadFormAction, isMenuUploading] = useActionState(handleMenuPdfUpload, initialMenuUploadState);
  const [saveMenuState, saveMenuFormAction, isMenuSaving] = useActionState(handleSaveExtractedMenu, initialSaveMenuState);
  const [deleteItemState, deleteItemFormAction] = useActionState(deleteVendorItem, initialDeleteItemState);
  const [removeDuplicatesState, removeDuplicatesFormAction, isRemovingDuplicates] = useActionState(handleRemoveDuplicateItems, initialRemoveDuplicatesState);


  const [vendorInventory, setVendorInventory] = useState<VendorInventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isRefreshingInventory, setIsRefreshingInventory] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  const uniqueCategories = useMemo(() => {
    const categories = new Set(vendorInventory.map(item => item.vendorItemCategory));
    return ["all", ...Array.from(categories)];
  }, [vendorInventory]);

  const filteredInventory = useMemo(() => {
    if (selectedCategoryFilter === "all") {
      return vendorInventory;
    }
    return vendorInventory.filter(item => item.vendorItemCategory === selectedCategoryFilter);
  }, [vendorInventory, selectedCategoryFilter]);


  const fetchAndSetInventory = async (vendorEmail: string, showToast = false) => {
    if (!vendorEmail) {
      console.warn("[InventoryPage] fetchAndSetInventory called without vendorEmail.");
      return;
    }
    console.log(`[InventoryPage] Fetching inventory for ${vendorEmail}`);
    setIsLoadingInventory(true);
    if (showToast) setIsRefreshingInventory(true); 

    try {
      const items = await getVendorInventory(vendorEmail);
      setVendorInventory(items);
      if (showToast) {
        toast({ title: "Inventory Refreshed", description: `Found ${items.length} items.` });
      }
    } catch (error) {
      console.error("[InventoryPage] Error in fetchAndSetInventory:", error);
      toast({ variant: "destructive", title: "Error fetching inventory", description: (error as Error).message });
    } finally {
      setIsLoadingInventory(false);
      if (showToast) setIsRefreshingInventory(false);
    }
  };

  useEffect(() => {
    async function fetchSessionData() {
      setIsLoadingSession(true);
      console.log("[InventoryPage] Fetching session data...");
      const currentSession = await getSession();
      if (currentSession && currentSession.isAuthenticated && currentSession.storeCategory && currentSession.email && currentSession.shopName) {
        console.log("[InventoryPage] Session data fetched:", currentSession.email);
        setSession({
          isAuthenticated: true,
          email: currentSession.email,
          shopName: currentSession.shopName,
          storeCategory: currentSession.storeCategory as VendorSession['storeCategory'],
        });
        fetchAndSetInventory(currentSession.email);
      } else {
        console.warn("[InventoryPage] Session not authenticated or missing data.");
        setSession(null);
      }
      setIsLoadingSession(false);
    }
    fetchSessionData();
  }, []);

  useEffect(() => {
    if (menuUploadState?.error) {
      toast({ variant: "destructive", title: "Menu Upload Error", description: menuUploadState.error });
    }
    if (menuUploadState?.message && !menuUploadState.error) { 
      toast({ title: "Menu Processing", description: menuUploadState.message });
    }
  }, [menuUploadState, toast]);

  useEffect(() => {
    if (saveMenuState?.error) {
      toast({ variant: "destructive", title: "Save Menu Error", description: saveMenuState.error });
    }
    if (saveMenuState?.success && saveMenuState.message) {
      toast({ title: "Menu Saved", description: saveMenuState.message });
      if (session?.email) {
        fetchAndSetInventory(session.email, true); 
      }
    }
  }, [saveMenuState, toast, session?.email]);

  useEffect(() => {
    if (deleteItemState?.error) {
        toast({ variant: "destructive", title: "Delete Item Error", description: deleteItemState.error });
    }
    if (deleteItemState?.success && deleteItemState.message) {
        toast({ title: "Item Deleted", description: deleteItemState.message });
        if (session?.email) {
            fetchAndSetInventory(session.email, true); 
        }
    }
  }, [deleteItemState, toast, session?.email]);
  
  useEffect(() => {
    if (removeDuplicatesState?.error) {
        toast({ variant: "destructive", title: "Remove Duplicates Error", description: removeDuplicatesState.error });
    }
    if (removeDuplicatesState?.success) {
        toast({ title: "Duplicates Processed", description: removeDuplicatesState.message });
        if (session?.email) {
            fetchAndSetInventory(session.email, true);
        }
    }
  }, [removeDuplicatesState, toast, session?.email]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setMenuPdfFile(file);
      console.log("[InventoryPage] menuPdfFile selected:", file.name);
    } else {
      setMenuPdfFile(null);
      if (file) toast({ variant: "destructive", title: "Invalid File", description: "Please upload a PDF file."});
      console.warn("[InventoryPage] Invalid file type selected or no file.");
    }
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
            <form action={menuUploadFormAction} className="space-y-4 mb-6 p-4 border rounded-md">
              {session?.email && <input type="hidden" name="vendorId" value={session.email} />}
              <Label htmlFor="menuPdf" className="font-semibold">Upload Menu PDF</Label>
              <Input 
                id="menuPdf" 
                name="menuPdf" 
                type="file" 
                accept="application/pdf"
                onChange={handleFileChange} 
                required 
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <MenuUploadSubmitButton />
               <p className="text-xs text-muted-foreground">
                The AI will try to extract items, categories, prices, and descriptions. Results may vary based on PDF quality.
              </p>
            </form>

            {isMenuUploading && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Processing your menu with AI, please wait...</p>
              </div>
            )}

            {menuUploadState?.extractedMenu && menuUploadState.extractedMenu.extractedItems.length > 0 && !saveMenuState?.success && (
              <div className="mt-6 p-4 border rounded-md">
                <h3 className="text-lg font-semibold mb-2 text-foreground">Extracted Menu Items:</h3>
                <p className="text-sm text-muted-foreground mb-2">Review the items below. You can edit them later after saving.</p>
                <div className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96">
                  <pre>
                    {JSON.stringify(menuUploadState.extractedMenu.extractedItems, null, 2)}
                  </pre>
                </div>
                
                <form action={saveMenuFormAction}>
                   {session?.email && <input type="hidden" name="vendorId" value={session.email} />}
                   <input 
                    type="hidden" 
                    name="extractedItemsJson" 
                    value={JSON.stringify(menuUploadState.extractedMenu.extractedItems)} 
                   />
                  <SaveMenuButton />
                </form>
                {isMenuSaving && (
                    <div className="flex items-center mt-2">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Saving menu items...</p>
                    </div>
                )}
              </div>
            )}
            
            {menuUploadState?.extractedMenu && menuUploadState.extractedMenu.extractedItems.length === 0 && !isMenuUploading && (
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Items Extracted</AlertTitle>
                    <AlertDescription>
                        The AI could not extract structured items from the PDF. This might be due to the PDF format or layout.
                        You can try adding items manually or ensure your PDF is text-based and clearly structured.
                        {menuUploadState.extractedMenu.rawText && " Some raw text was extracted: " + menuUploadState.extractedMenu.rawText.substring(0, 200) + "..."}
                    </AlertDescription>
                </Alert>
            )}
            
            <div className="flex justify-between items-center mt-8 mb-4">
                <h4 className="text-md font-semibold">Current Menu Items (from Database)</h4>
                <div className="flex items-center gap-2">
                    {session?.email && vendorInventory.length > 0 && (
                        <form action={removeDuplicatesFormAction}>
                            <input type="hidden" name="vendorId" value={session.email} />
                            <RemoveDuplicatesButton />
                        </form>
                    )}
                    <Button variant="outline" size="sm" onClick={() => session?.email && fetchAndSetInventory(session.email, true)} disabled={isRefreshingInventory || isLoadingInventory || isRemovingDuplicates}>
                        {isRefreshingInventory || isLoadingInventory ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                        Refresh
                    </Button>
                </div>
            </div>
             {vendorInventory.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === "all" ? "All Categories" : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isLoadingInventory && !isRefreshingInventory ? ( 
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length > 0 ? filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.vendorItemCategory}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{item.stockQuantity}</TableCell>
                        <TableCell className="space-x-1 text-right">
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled> 
                                <Edit3 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <form action={deleteItemFormAction}>
                                        <input type="hidden" name="itemId" value={item.id || ''} />
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the item
                                                "{item.itemName}" from your inventory.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <DeleteItemButton />
                                        </AlertDialogFooter>
                                    </form>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {selectedCategoryFilter === "all" 
                            ? "Your menu is empty. Add items manually or upload a PDF."
                            : `No items found in category: "${selectedCategoryFilter}".`}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
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
                 {vendorInventory.length > 0 && (
                  <div className="mb-4 flex items-center gap-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category === "all" ? "All Categories" : category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                 )}
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredInventory.length > 0 ? filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.vendorItemCategory}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{item.stockQuantity}</TableCell>
                        <TableCell className="space-x-1 text-right">
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled> 
                                <Edit3 className="h-4 w-4" />
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <form action={deleteItemFormAction}>
                                        <input type="hidden" name="itemId" value={item.id || ''} />
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the item
                                                "{item.itemName}" from your inventory.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <DeleteItemButton />
                                        </AlertDialogFooter>
                                    </form>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {selectedCategoryFilter === "all" 
                            ? "No inventory items yet. Start by adding products."
                            : `No items found in category: "${selectedCategoryFilter}".`}
                        </TableCell>
                      </TableRow>
                    )}
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
             {vendorInventory.length > 0 && (
                <div className="mb-4 flex items-center gap-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by category..." />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueCategories.map(category => (
                        <SelectItem key={category} value={category}>
                            {category === "all" ? "All Categories" : category}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                )}
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length > 0 ? filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.vendorItemCategory}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{item.stockQuantity}</TableCell>
                        <TableCell className="space-x-1 text-right">
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled> 
                                <Edit3 className="h-4 w-4" />
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <form action={deleteItemFormAction}>
                                        <input type="hidden" name="itemId" value={item.id || ''} />
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the item
                                                "{item.itemName}" from your inventory.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <DeleteItemButton />
                                        </AlertDialogFooter>
                                    </form>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )) : (
                     <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                         {selectedCategoryFilter === "all" 
                            ? "You haven't added any products yet."
                            : `No items found in category: "${selectedCategoryFilter}".`}
                      </TableCell>
                    </TableRow>
                    )}
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

