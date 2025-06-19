
'use client';

import { useEffect, useState, useActionState, useMemo, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { PlusCircle, Search, BookOpen, Package, ShoppingBasket, ListPlus, Edit3, Trash2, UploadCloud, Loader2, AlertTriangle, Save, RefreshCw, Sparkles, Filter, ImageIcon, Upload } from "lucide-react"; // Added Upload
import { getSession } from '@/lib/auth';
import type { Vendor, VendorInventoryItem } from '@/lib/inventoryModels';
import { Skeleton } from '@/components/ui/skeleton';
import {
    handleMenuPdfUpload, type MenuUploadFormState,
    handleSaveExtractedMenu, type SaveMenuFormState,
    getVendorInventory,
    deleteVendorItem, type DeleteItemFormState,
    handleRemoveDuplicateItems, type RemoveDuplicatesFormState,
    handleDeleteSelectedItems, type DeleteSelectedItemsFormState,
    updateVendorItemDetails, type UpdateItemFormState
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { storage } from '@/lib/firebase'; // Firebase storage
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';


interface VendorSession extends Pick<Vendor, 'email' | 'shopName' | 'storeCategory'> {
  isAuthenticated: boolean;
}

const initialMenuUploadState: MenuUploadFormState = {};
const initialSaveMenuState: SaveMenuFormState = {};
const initialDeleteItemState: DeleteItemFormState = {};
const initialRemoveDuplicatesState: RemoveDuplicatesFormState = {};
const initialDeleteSelectedItemsState: DeleteSelectedItemsFormState = {};
const initialUpdateItemState: UpdateItemFormState = {};


const EditItemFormSchema = z.object({
  itemName: z.string().min(1, "Item name cannot be empty."),
  vendorItemCategory: z.string().min(1, "Category cannot be empty."),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({invalid_type_error: "Price must be a number."}).min(0, "Price must be a positive number.")
  ),
  stockQuantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number({invalid_type_error: "Stock must be an integer."}).int().min(0, "Stock must be a non-negative integer.")
  ),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).or(z.literal('')).optional(),
});


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

function DeleteSelectedButton() {
    const { pending } = useFormStatus();
    return (
        <AlertDialogAction
            type="submit"
            disabled={pending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Selected
        </AlertDialogAction>
    );
}

function UpdateItemSubmitButton({ isUploadingFile }: { isUploadingFile: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending || isUploadingFile} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {pending || isUploadingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isUploadingFile ? 'Uploading...' : (pending ? 'Saving...' : 'Save Changes')}
        </Button>
    );
}

interface EditItemDialogProps {
  item: VendorInventoryItem | null;
  vendorId: string | null; // For Firebase Storage path
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  updateItemAction: (payload: FormData) => void;
  initialState: UpdateItemFormState;
}

function EditItemDialog({ item, vendorId, isOpen, onOpenChange, updateItemAction, initialState }: EditItemDialogProps) {
  const [updateState, formAction, isSaving] = useActionState(updateItemAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<z.infer<typeof EditItemFormSchema>>({
    resolver: zodResolver(EditItemFormSchema),
    defaultValues: {
      itemName: item?.itemName || '',
      vendorItemCategory: item?.vendorItemCategory || '',
      price: item?.price || 0,
      stockQuantity: item?.stockQuantity || 0,
      description: item?.description || '',
      imageUrl: item?.imageUrl || '',
    }
  });

  useEffect(() => {
    if (item) {
      form.reset({
        itemName: item.itemName || '',
        vendorItemCategory: item.vendorItemCategory || '',
        price: item.price || 0,
        stockQuantity: item.stockQuantity || 0,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
      });
      setImagePreviewUrl(item.imageUrl || null);
      setSelectedFile(null);
      setUploadProgress(null);
      setIsUploadingFile(false);
    }
  }, [item, form, isOpen]); // Reset when dialog opens with a new item or is re-opened

  useEffect(() => {
    if (updateState?.success && !isSaving) {
      toast({ title: "Item Updated", description: updateState.message });
      onOpenChange(false);
    }
    if (updateState?.error && !isSaving) {
      toast({ variant: "destructive", title: "Update Failed", description: updateState.error });
    }
  }, [updateState, toast, onOpenChange, isSaving]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      form.setValue('imageUrl', ''); // Clear any pasted URL if a file is chosen
    }
  };

  const currentImageUrlForDisplay = selectedFile ? imagePreviewUrl : form.watch('imageUrl');

  const onSubmit = async (values: z.infer<typeof EditItemFormSchema>) => {
    if (!item?.id || !vendorId) {
        toast({ variant: "destructive", title: "Error", description: "Item ID or Vendor ID is missing."});
        return;
    }

    const formData = new FormData();
    formData.append('itemId', item.id);

    let finalImageUrl = values.imageUrl;

    if (selectedFile) {
        setIsUploadingFile(true);
        setUploadProgress(0);
        const filePath = `vendor_inventory_images/${vendorId}/${item.id}/${Date.now()}-${selectedFile.name}`;
        const fileStorageRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);

        try {
            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => {
                        console.error("Upload failed:", error);
                        toast({ variant: "destructive", title: "Image Upload Failed", description: error.message });
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        finalImageUrl = downloadURL;
                        resolve();
                    }
                );
            });
        } catch (error) {
            setIsUploadingFile(false);
            setUploadProgress(null);
            return; // Stop form submission if upload fails
        }
        setIsUploadingFile(false);
        setUploadProgress(null);
    }
    
    // Append all values to formData, using finalImageUrl
    Object.entries(values).forEach(([key, value]) => {
        if (key === 'imageUrl') {
            formData.append(key, finalImageUrl || '');
        } else if (value !== undefined) {
            formData.append(key, String(value));
        }
    });
    formAction(formData);
  };


  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (isUploadingFile || isSaving) return; // Prevent closing while operations are in progress
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item: {item.itemName}</DialogTitle>
          <DialogDescription>Make changes to your inventory item here. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="itemName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl><Input {...field} disabled={isUploadingFile || isSaving} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="vendorItemCategory"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl><Input {...field} disabled={isUploadingFile || isSaving} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Price (₹)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} disabled={isUploadingFile || isSaving} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl><Input type="number" step="1" {...field} disabled={isUploadingFile || isSaving}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl><Textarea {...field} rows={3} disabled={isUploadingFile || isSaving}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                {/* Image URL and Upload Section */}
                <FormItem>
                    <FormLabel>Item Image</FormLabel>
                    {currentImageUrlForDisplay && (
                        <Image src={currentImageUrlForDisplay} alt="Current item image" width={100} height={100} className="mt-2 rounded object-cover" data-ai-hint="item current image" />
                    )}
                     <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                            <FormItem className="mt-2">
                                <FormLabel className="text-xs">Image URL (or upload new below)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="url" 
                                        placeholder="https://example.com/image.png" 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            setSelectedFile(null); // Clear selected file if URL is manually changed
                                            setImagePreviewUrl(e.target.value);
                                        }}
                                        disabled={isUploadingFile || isSaving}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="mt-2">
                        <Label htmlFor="newImageFile" className="text-xs">Upload New Image</Label>
                        <Input 
                            id="newImageFile" 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            ref={fileInputRef}
                            className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            disabled={isUploadingFile || isSaving}
                        />
                    </div>
                    {isUploadingFile && uploadProgress !== null && (
                        <div className="mt-2 space-y-1">
                            <Progress value={uploadProgress} className="w-full h-2" />
                            <p className="text-xs text-muted-foreground text-center">Uploading: {Math.round(uploadProgress)}%</p>
                        </div>
                    )}
                </FormItem>

                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isUploadingFile || isSaving}>Cancel</Button></DialogClose>
                    <UpdateItemSubmitButton isUploadingFile={isUploadingFile} />
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function InventoryPage() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [menuPdfFile, setMenuPdfFile] = useState<File | null>(null);
  const { toast } = useToast();

  const [menuUploadState, menuUploadFormAction, isMenuUploading] = useActionState(handleMenuPdfUpload, initialMenuUploadState);
  const [saveMenuState, saveMenuFormAction, isMenuSaving] = useActionState(handleSaveExtractedMenu, initialSaveMenuState);
  const [deleteItemState, deleteItemFormAction, isDeletingItem] = useActionState(deleteVendorItem, initialDeleteItemState);
  const [removeDuplicatesState, removeDuplicatesFormAction, isRemovingDuplicates] = useActionState(handleRemoveDuplicateItems, initialRemoveDuplicatesState);
  const [deleteSelectedItemsState, deleteSelectedItemsFormAction] = useActionState(handleDeleteSelectedItems, initialDeleteSelectedItemsState);
  const [updateItemGlobalState, updateItemFormAction] = useActionState(updateVendorItemDetails, initialUpdateItemState);


  const [vendorInventory, setVendorInventory] = useState<VendorInventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isRefreshingInventory, setIsRefreshingInventory] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [editingItem, setEditingItem] = useState<VendorInventoryItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);


  const uniqueCategories = useMemo(() => {
    const categories = new Set(vendorInventory.map(item => item.vendorItemCategory).filter(Boolean) as string[]);
    return ["all", ...Array.from(categories).sort()];
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
      setSelectedItems([]);
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
      // Clear menu upload state after successful save
      // This assumes menuUploadState is being managed by a form action that resets or provides a mechanism to clear it
      // For now, we'll just rely on the user not re-submitting the same extracted data
    }
  }, [saveMenuState, toast, session?.email]);

  useEffect(() => {
    if (deleteItemState?.error && !isDeletingItem) { 
        toast({ variant: "destructive", title: "Delete Item Error", description: deleteItemState.error });
    }
    if (deleteItemState?.success && deleteItemState.message) {
        toast({ title: "Item Deleted", description: deleteItemState.message });
        if (session?.email) {
            fetchAndSetInventory(session.email, true);
        }
    }
  }, [deleteItemState, toast, session?.email, isDeletingItem]);

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

  useEffect(() => {
    if (deleteSelectedItemsState?.error) {
        toast({ variant: "destructive", title: "Delete Selected Error", description: deleteSelectedItemsState.error });
    }
    if (deleteSelectedItemsState?.success && deleteSelectedItemsState.message) {
        toast({ title: "Items Deleted", description: deleteSelectedItemsState.message });
        if (session?.email) {
            fetchAndSetInventory(session.email, true); 
        }
    }
  }, [deleteSelectedItemsState, toast, session?.email]);

  useEffect(() => {
    if (updateItemGlobalState?.success) {
        if (session?.email) {
            fetchAndSetInventory(session.email, true);
        }
    }
  }, [updateItemGlobalState, session?.email]);


  const handlePdfFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedItems(filteredInventory.map(item => item.id || ''));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const openEditDialog = (item: VendorInventoryItem) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const isAllSelected = filteredInventory.length > 0 && selectedItems.length === filteredInventory.length;
  const isSomeSelected = selectedItems.length > 0 && selectedItems.length < filteredInventory.length;


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
                onChange={handlePdfFileChange}
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
                     {selectedItems.length > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete ({selectedItems.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <form action={deleteSelectedItemsFormAction}>
                                    <input type="hidden" name="selectedItemIdsJson" value={JSON.stringify(selectedItems)} />
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the selected {selectedItems.length} item(s) from your inventory.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <DeleteSelectedButton />
                                    </AlertDialogFooter>
                                </form>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
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
                    {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                         <Checkbox
                            checked={isAllSelected || (isSomeSelected ? 'indeterminate' : false)}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all items"
                            disabled={filteredInventory.length === 0}
                          />
                      </TableHead>
                      <TableHead className="w-[60px]">Image</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length > 0 ? filteredInventory.map((item) => (
                      <TableRow key={item.id} data-state={selectedItems.includes(item.id || '') ? "selected" : ""}>
                        <TableCell>
                           <Checkbox
                              checked={selectedItems.includes(item.id || '')}
                              onCheckedChange={(checked) => item.id && handleSelectItem(item.id, checked)}
                              aria-label={`Select item ${item.itemName}`}
                            />
                        </TableCell>
                        <TableCell>
                          <Image
                            src={item.imageUrl || 'https://placehold.co/50x50.png'}
                            alt={item.itemName}
                            width={40}
                            height={40}
                            className="rounded object-cover aspect-square"
                            data-ai-hint={`${item.itemName.split(' ').slice(0,2).join(' ')} food`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.vendorItemCategory}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{item.stockQuantity}</TableCell>
                        <TableCell className="space-x-1 text-right">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)}>
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
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
      case 'Pet Shop': 
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
                 <div className="flex items-center gap-2">
                     {selectedItems.length > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete ({selectedItems.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <form action={deleteSelectedItemsFormAction}>
                                    <input type="hidden" name="selectedItemIdsJson" value={JSON.stringify(selectedItems)} />
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the selected {selectedItems.length} item(s) from your inventory.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <DeleteSelectedButton />
                                    </AlertDialogFooter>
                                </form>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Custom Product</Button>
                </div>
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
                {isLoadingInventory && !isRefreshingInventory ? (
                    <div className="space-y-2">
                         {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : (
                 <Table>
                  <TableHeader>
                    <TableRow>
                       <TableHead className="w-[50px]">
                         <Checkbox
                            checked={isAllSelected || (isSomeSelected ? 'indeterminate' : false)}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all items"
                            disabled={filteredInventory.length === 0}
                          />
                      </TableHead>
                      <TableHead className="w-[60px]">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredInventory.length > 0 ? filteredInventory.map((item) => (
                      <TableRow key={item.id} data-state={selectedItems.includes(item.id || '') ? "selected" : ""}>
                        <TableCell>
                           <Checkbox
                              checked={selectedItems.includes(item.id || '')}
                              onCheckedChange={(checked) => item.id && handleSelectItem(item.id, checked)}
                              aria-label={`Select item ${item.itemName}`}
                            />
                        </TableCell>
                        <TableCell>
                           <Image
                            src={item.imageUrl || 'https://placehold.co/50x50.png'}
                            alt={item.itemName}
                            width={40}
                            height={40}
                            className="rounded object-cover aspect-square"
                            data-ai-hint={`${item.itemName.split(' ').slice(0,2).join(' ')} product`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.vendorItemCategory}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{item.stockQuantity}</TableCell>
                        <TableCell className="space-x-1 text-right">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)}>
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
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {selectedCategoryFilter === "all"
                            ? "No inventory items yet. Start by adding products."
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
      case 'Restaurant':
      case 'Cafe':
      case 'Bakery':
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
              <div className="flex items-center gap-2">
                  {selectedItems.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete ({selectedItems.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <form action={deleteSelectedItemsFormAction}>
                                <input type="hidden" name="selectedItemIdsJson" value={JSON.stringify(selectedItems)} />
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the selected {selectedItems.length} item(s) from your inventory.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <DeleteSelectedButton />
                                </AlertDialogFooter>
                            </form>
                        </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Product</Button>
              </div>
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
              {isLoadingInventory && !isRefreshingInventory ? (
                <div className="space-y-2">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
                ) : (
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                         <Checkbox
                            checked={isAllSelected || (isSomeSelected ? 'indeterminate' : false)}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all items"
                            disabled={filteredInventory.length === 0}
                          />
                      </TableHead>
                      <TableHead className="w-[60px]">Image</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length > 0 ? filteredInventory.map((item) => (
                      <TableRow key={item.id} data-state={selectedItems.includes(item.id || '') ? "selected" : ""}>
                        <TableCell>
                           <Checkbox
                              checked={selectedItems.includes(item.id || '')}
                              onCheckedChange={(checked) => item.id && handleSelectItem(item.id, checked)}
                              aria-label={`Select item ${item.itemName}`}
                            />
                        </TableCell>
                        <TableCell>
                           <Image
                            src={item.imageUrl || 'https://placehold.co/50x50.png'}
                            alt={item.itemName}
                            width={40}
                            height={40}
                            className="rounded object-cover aspect-square"
                            data-ai-hint={`${item.itemName.split(' ').slice(0,2).join(' ')} product`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.vendorItemCategory}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{item.stockQuantity}</TableCell>
                        <TableCell className="space-x-1 text-right">
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)}>
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                         {selectedCategoryFilter === "all"
                            ? "You haven't added any products yet."
                            : `No items found in category: "${selectedCategoryFilter}".`}
                      </TableCell>
                    </TableRow>
                    )}
                  </TableBody>
                </Table>
                )}
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
      <EditItemDialog
        item={editingItem}
        vendorId={session?.email || null}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        updateItemAction={updateVendorItemDetails} 
        initialState={initialUpdateItemState} 
      />
       <p className="mt-8 text-center text-sm text-muted-foreground">
        Admin features for managing global item catalogs will be available separately.
      </p>
    </div>
  );
}

