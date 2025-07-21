
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Search, BookOpen, Package, ShoppingBasket, ListPlus, Edit3, Trash2, UploadCloud, Loader2, AlertTriangle, Save, RefreshCw, Sparkles, Filter, Upload, Globe, X, FileUp, Info } from "lucide-react";
import { getSession } from '@/lib/auth';
import type { Vendor, VendorInventoryItem, GlobalItem } from '@/lib/inventoryModels';
import type { ExtractMenuOutput } from '@/ai/flows/extract-menu-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';

import {
    handleMenuPdfUpload, type MenuUploadFormState,
    getVendorInventory,
    deleteVendorItem, type DeleteItemFormState,
    handleRemoveDuplicateItems, type RemoveDuplicatesFormState,
    handleDeleteSelectedItems, type DeleteSelectedItemsFormState,
    updateVendorItemDetails, type UpdateItemFormState,
    getGlobalItemsByType,
    linkGlobalItemToVendorInventory, type LinkGlobalItemFormState,
    addCustomVendorItem, type AddCustomItemFormState,
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { BulkAddDialog } from '@/components/inventory/BulkAddDialog';


interface VendorSession extends Pick<Vendor, 'email' | 'shopName' | 'storeCategory'> {
  isAuthenticated: boolean;
  uid?: string;
}

const initialMenuUploadState: MenuUploadFormState = {};
const initialDeleteItemState: DeleteItemFormState = {};
const initialRemoveDuplicatesState: RemoveDuplicatesFormState = {};
const initialDeleteSelectedItemsState: DeleteSelectedItemsFormState = {};
const initialUpdateItemState: UpdateItemFormState = {};
const initialLinkGlobalItemState: LinkGlobalItemFormState = {};
const initialAddCustomItemState: AddCustomItemFormState = {};


const EditItemFormSchema = z.object({
  itemName: z.string().min(1, "Item name cannot be empty."),
  vendorItemCategory: z.string().min(1, "Category cannot be empty."),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({invalid_type_error: "Price must be a number."}).min(0, "Price must be a positive number.")
  ),
  mrp: z.preprocess(
    (val) => val ? parseFloat(String(val)) : undefined,
    z.number().min(0, "MRP must be a positive number.").optional()
  ),
  stockQuantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number({invalid_type_error: "Stock must be an integer."}).int().min(0, "Stock must be a non-negative integer.")
  ),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).or(z.literal('')).optional(),
}).refine(data => !data.mrp || data.price <= data.mrp, {
    message: "Price cannot be higher than MRP.",
    path: ["price"],
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

function SaveMenuButton({ onClick, isSaving }: { onClick: () => void; isSaving: boolean }) {
  return (
    <Button onClick={onClick} disabled={isSaving} className="mt-4 bg-green-600 hover:bg-green-700 text-white">
      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
  vendorId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onItemUpdate: () => void;
}

function EditItemDialog({ item, vendorId, isOpen, onOpenChange, onItemUpdate }: EditItemDialogProps) {
  const { storage } = useFirebaseAuth();
  const [updateState, setUpdateState] = useState<UpdateItemFormState>({});
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      mrp: item?.mrp || undefined,
      stockQuantity: item?.stockQuantity || 0,
      description: item?.description || '',
      imageUrl: item?.imageUrl || '',
    }
  });

  useEffect(() => {
    if (item && isOpen) {
      form.reset({
        itemName: item.itemName || '',
        vendorItemCategory: item.vendorItemCategory || '',
        price: item.price || 0,
        mrp: item.mrp || undefined,
        stockQuantity: item.stockQuantity || 0,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
      });
      setImagePreviewUrl(item.imageUrl || null);
      setSelectedFile(null);
      setUploadProgress(null);
      setIsUploadingFile(false);
      setIsSubmitting(false);
    }
  }, [item, form, isOpen]); // Reset when dialog opens with a new item or is re-opened

  useEffect(() => {
    if (updateState?.success) {
      toast({ title: "Item Updated", description: updateState.message });
      onItemUpdate();
      onOpenChange(false);
    }
    if (updateState?.error) {
      toast({ variant: "destructive", title: "Update Failed", description: updateState.error });
    }
  }, [updateState, toast, onOpenChange, onItemUpdate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      form.setValue('imageUrl', ''); // Clear any pasted URL if a file is chosen
    }
  };

  const currentImageUrlForDisplay = imagePreviewUrl;

  const handleFormSubmit = async (values: z.infer<typeof EditItemFormSchema>) => {
    if (!item?.id || !vendorId) {
        toast({ variant: "destructive", title: "Error", description: "Item ID or Vendor ID is missing."});
        return;
    }
    if (!storage) {
        toast({ variant: "destructive", title: "Error", description: "Storage service is not available."});
        return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('itemId', item.id);

    if (selectedFile) {
        setIsUploadingFile(true);
        setUploadProgress(0);
        const filePath = `vendor_inventory_images/${vendorId}/${item.id}/${Date.now()}-${selectedFile.name}`;
        const fileStorageRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);

        try {
            const downloadURL = await new Promise<string>((resolve, reject) => {
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
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(url);
                    }
                );
            });
            formData.append('imageUrl', downloadURL);
        } catch (error) {
            setIsUploadingFile(false);
            setUploadProgress(null);
            setIsSubmitting(false);
            return; // Stop form submission if upload fails
        }
        setIsUploadingFile(false);
        setUploadProgress(null);
    } else {
        // If no new file, use the existing URL from the form values
        formData.append('imageUrl', values.imageUrl || '');
    }
    
    // Append all other values to formData
    Object.entries(values).forEach(([key, value]) => {
        if (key !== 'imageUrl' && value !== undefined) {
            formData.append(key, String(value));
        }
    });
    
    // Call server action
    const result = await updateVendorItemDetails(updateState, formData);
    setUpdateState(result);
    setIsSubmitting(false);
  };


  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (isUploadingFile || isSubmitting) return; // Prevent closing while operations are in progress
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item: {item.itemName}</DialogTitle>
          <DialogDescription>Make changes to your inventory item here. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="itemName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl><Input {...field} disabled={item.isCustomItem === false || isUploadingFile || isSubmitting} /></FormControl>
                        {!item.isCustomItem && <FormDescription className="text-xs">Item name cannot be changed for global items.</FormDescription>}
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
                        <FormControl><Input {...field} disabled={item.isCustomItem === false || isUploadingFile || isSubmitting} /></FormControl>
                         {!item.isCustomItem && <FormDescription className="text-xs">Category cannot be changed for global items.</FormDescription>}
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Price (₹)</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} disabled={isUploadingFile || isSubmitting} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="mrp"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>MRP (₹)</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} disabled={item.isCustomItem === false || isUploadingFile || isSubmitting} placeholder="Optional" value={field.value ?? ''} /></FormControl>
                             {!item.isCustomItem && <FormDescription className="text-xs">MRP is from global item.</FormDescription>}
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl><Input type="number" step="1" {...field} disabled={isUploadingFile || isSubmitting}/></FormControl>
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
                        <FormControl><Textarea {...field} rows={3} disabled={item.isCustomItem === false || isUploadingFile || isSubmitting}/></FormControl>
                         {!item.isCustomItem && <FormDescription className="text-xs">Description cannot be changed for global items.</FormDescription>}
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                {/* Image URL and Upload Section */}
                <FormItem>
                    <FormLabel>Item Image</FormLabel>
                    {currentImageUrlForDisplay && (
                        <Image src={currentImageUrlForDisplay} alt="Current item image" width={100} height={100} className="mt-2 rounded object-cover" unoptimized/>
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
                                        disabled={isUploadingFile || isSubmitting}
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
                            disabled={isUploadingFile || isSubmitting}
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
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isUploadingFile || isSubmitting}>Cancel</Button></DialogClose>
                    <UpdateItemSubmitButton isUploadingFile={isUploadingFile || isSubmitting} />
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const AddGlobalItemFormSchema = z.object({
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({invalid_type_error: "Price must be a number."}).min(0, "Price must be a positive number.")
  ),
  stockQuantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number({invalid_type_error: "Stock must be an integer."}).int().min(0, "Stock must be a non-negative integer.")
  ),
  mrp: z.preprocess(
    (val) => val ? parseFloat(String(val)) : undefined,
    z.number().optional()
  ),
}).refine(data => !data.mrp || data.price <= data.mrp, {
    message: "Price cannot be higher than MRP.",
    path: ["price"],
});

function AddGlobalItemDialog({ item, isOpen, onOpenChange, onItemAdded }: { item: GlobalItem | null; isOpen: boolean; onOpenChange: (open: boolean) => void; onItemAdded: () => void }) {
  const [state, formAction, isPending] = useActionState(linkGlobalItemToVendorInventory, initialLinkGlobalItemState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<z.infer<typeof AddGlobalItemFormSchema>>({
    resolver: zodResolver(AddGlobalItemFormSchema),
    defaultValues: { price: 0, stockQuantity: 0 }
  });

  useEffect(() => {
    if (state.success) {
      toast({ title: "Item Added", description: state.message });
      form.reset();
      onItemAdded();
      onOpenChange(false);
    }
    if (state.error) {
      toast({ variant: "destructive", title: "Failed to Add Item", description: state.error });
    }
     if (state.fields) {
      Object.entries(state.fields).forEach(([key, value]) => {
        form.setError(key as keyof z.infer<typeof AddGlobalItemFormSchema>, { type: 'manual', message: value[0] });
      });
    }
  }, [state, toast, onItemAdded, onOpenChange, form]);
  
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add "{item.itemName}" to Your Inventory</DialogTitle>
          <DialogDescription>Set your selling price and current stock for this item. Other details are managed globally.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form action={formAction} ref={formRef} className="space-y-4" onSubmit={(evt) => {
                evt.preventDefault();
                form.handleSubmit(() => {
                    formAction(new FormData(formRef.current!));
                })(evt);
            }}>
                <input type="hidden" name="globalItemId" value={item.id} />
                <input type="hidden" name="mrp" value={item.mrp || ''} />
                
                {item.mrp && <p className="text-sm text-muted-foreground">Maximum Retail Price (MRP): <span className="font-bold text-foreground">₹{item.mrp.toFixed(2)}</span></p>}

                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Your Selling Price (₹)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Current Stock Quantity</FormLabel>
                        <FormControl><Input type="number" step="1" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isPending}>Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add to Inventory
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const AddCustomItemFormSchema = z.object({
  itemName: z.string().min(1, "Item name cannot be empty."),
  vendorItemCategory: z.string().min(1, "Category cannot be empty."),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({invalid_type_error: "Price must be a number."}).min(0, "Price must be a positive number.")
  ),
   mrp: z.preprocess(
    (val) => val ? parseFloat(String(val)) : undefined,
    z.number().min(0, "MRP must be a positive number.").optional()
  ),
  stockQuantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number({invalid_type_error: "Stock must be an integer."}).int().min(0, "Stock must be a non-negative integer.")
  ),
  unit: z.string().min(1, "Please specify a unit (e.g., 'piece', 'kg', 'serving')."),
  description: z.string().optional(),
}).refine(data => !data.mrp || data.price <= data.mrp, {
    message: "Price cannot be higher than MRP.",
    path: ["price"],
});

function AddCustomItemDialog({ isOpen, onOpenChange, onItemAdded }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onItemAdded: () => void }) {
  const [state, formAction, isPending] = useActionState(addCustomVendorItem, initialAddCustomItemState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const form = useForm<z.infer<typeof AddCustomItemFormSchema>>({
    resolver: zodResolver(AddCustomItemFormSchema),
    defaultValues: {
      itemName: '',
      vendorItemCategory: '',
      price: 0,
      mrp: undefined,
      stockQuantity: 0,
      unit: '',
      description: '',
    }
  });

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Item Added", description: state.message });
      form.reset();
      onItemAdded();
      onOpenChange(false);
    }
    if (state?.error) {
      toast({ variant: "destructive", title: "Failed to Add Item", description: state.error });
    }
  }, [state, toast, onItemAdded, onOpenChange, form]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Item</DialogTitle>
          <DialogDescription>
            Add a new product or menu item that is unique to your store.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form ref={formRef} action={formAction} className="space-y-4">
                <FormField control={form.control} name="itemName" render={({ field }) => (
                    <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input {...field} placeholder="e.g., 'Artisan Sourdough Bread'" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="vendorItemCategory" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} placeholder="e.g., 'Breads', 'Main Course'" /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Price (₹)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="mrp" render={({ field }) => (
                        <FormItem><FormLabel>MRP (₹)</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="Optional" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="stockQuantity" render={({ field }) => (
                        <FormItem><FormLabel>Stock Quantity</FormLabel><FormControl><Input type="number" step="1" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} placeholder="e.g., 'piece', 'kg'" /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                )}/>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isPending}>Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Item
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}



export default function InventoryPage() {
  const { db } = useFirebaseAuth();
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [menuPdfFile, setMenuPdfFile] = useState<File | null>(null);
  const { toast } = useToast();

  const [menuUploadState, menuUploadFormAction, isMenuUploading] = useActionState(handleMenuPdfUpload, initialMenuUploadState);
  const [isSavingMenu, setIsSavingMenu] = useState(false);

  const [deleteItemState, deleteItemFormAction, isDeletingItem] = useActionState(deleteVendorItem, initialDeleteItemState);
  const [removeDuplicatesState, removeDuplicatesFormAction, isRemovingDuplicates] = useActionState(handleRemoveDuplicateItems, initialRemoveDuplicatesState);
  const [deleteSelectedItemsState, deleteSelectedItemsFormAction, isDeletingSelectedItems] = useActionState(handleDeleteSelectedItems, initialDeleteSelectedItemsState);


  const [vendorInventory, setVendorInventory] = useState<VendorInventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isRefreshingInventory, setIsRefreshingInventory] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const [showExtractedMenu, setShowExtractedMenu] = useState(true);

  const [editingItem, setEditingItem] = useState<VendorInventoryItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // For Global Catalog Search
  const [globalItemsResult, setGlobalItemsResult] = useState<GlobalItem[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [itemToAdd, setItemToAdd] = useState<GlobalItem | null>(null);
  const [isAddGlobalItemDialogOpen, setIsAddGlobalItemDialogOpen] = useState(false);
  const [isAddCustomItemDialogOpen, setIsAddCustomItemDialogOpen] = useState(false);
  
  function mapStoreCategoryToItemType(category: Vendor['storeCategory']): GlobalItem['sharedItemType'] | null {
    switch (category) {
        case 'Grocery Store': return 'grocery';
        case 'Pharmacy': return 'medical';
        case 'Liquor Shop': return 'liquor';
        case 'Pet Shop': return 'other'; // Or a dedicated 'pet' type if added to model
        default: return null;
    }
  }

  const handleSearchGlobalItems = async () => {
    if (!session?.storeCategory) return;
    const itemType = mapStoreCategoryToItemType(session.storeCategory);
    
    if (!itemType) {
        toast({ variant: "destructive", title: "Not Applicable", description: "Global catalog is not available for this store type." });
        return;
    }

    setIsSearchingGlobal(true);
    setGlobalItemsResult([]);
    try {
        const items = await getGlobalItemsByType(itemType);
        setGlobalItemsResult(items);
        if (items.length === 0) {
            toast({ title: "No Items Found", description: `No global items were found for the '${itemType}' category.` });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Search Failed", description: (error as Error).message });
    } finally {
        setIsSearchingGlobal(false);
    }
  };

  const openAddGlobalItemDialog = (item: GlobalItem) => {
    setItemToAdd(item);
    setIsAddGlobalItemDialogOpen(true);
  };


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


  const fetchAndSetInventory = async (vendorId: string, showToast = false) => {
    if (!vendorId) {
      console.warn("[InventoryPage] fetchAndSetInventory called without vendorId.");
      return;
    }
    console.log(`[InventoryPage] Fetching inventory for ${vendorId}`);
    setIsLoadingInventory(true);
    if (showToast) setIsRefreshingInventory(true);

    try {
      const items = await getVendorInventory(vendorId);
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
      if (currentSession && currentSession.isAuthenticated && currentSession.storeCategory && currentSession.email && currentSession.shopName && currentSession.uid) {
        console.log("[InventoryPage] Session data fetched:", currentSession.uid);
        const sessionData = {
          isAuthenticated: true,
          email: currentSession.email,
          shopName: currentSession.shopName,
          storeCategory: currentSession.storeCategory as VendorSession['storeCategory'],
          uid: currentSession.uid,
        };
        setSession(sessionData);

        // Only fetch inventory if not a grocery store
        if (sessionData.storeCategory !== 'Grocery Store') {
            fetchAndSetInventory(currentSession.uid);
        } else {
            setIsLoadingInventory(false);
        }
      } else {
        console.warn("[InventoryPage] Session not authenticated or missing data.");
        setSession(null);
        setIsLoadingInventory(false);
      }
      setIsLoadingSession(false);
    }
    fetchSessionData();
  }, []);

  useEffect(() => {
    if (menuUploadState?.extractedMenu) {
      setShowExtractedMenu(true);
    }
    if (menuUploadState?.error) {
      toast({ variant: "destructive", title: "Menu Upload Error", description: menuUploadState.error });
    }
    if (menuUploadState?.message && !menuUploadState.error) {
      toast({ title: "Menu Processing", description: menuUploadState.message });
    }
  }, [menuUploadState, toast]);

  useEffect(() => {
    if (deleteItemState?.error && !isDeletingItem) { 
        toast({ variant: "destructive", title: "Delete Item Error", description: deleteItemState.error });
    }
    if (deleteItemState?.success && deleteItemState.message) {
        toast({ title: "Item Deleted", description: deleteItemState.message });
        if (session?.uid) {
            fetchAndSetInventory(session.uid, true);
        }
    }
  }, [deleteItemState, toast, session?.uid, isDeletingItem]);

  useEffect(() => {
    if (removeDuplicatesState?.error) {
        toast({ variant: "destructive", title: "Remove Duplicates Error", description: removeDuplicatesState.error });
    }
    if (removeDuplicatesState?.success) {
        toast({ title: "Duplicates Processed", description: removeDuplicatesState.message });
        if (session?.uid) {
            fetchAndSetInventory(session.uid, true);
        }
    }
  }, [removeDuplicatesState, toast, session?.uid]);

  useEffect(() => {
    if (deleteSelectedItemsState?.error) {
        toast({ variant: "destructive", title: "Delete Selected Error", description: deleteSelectedItemsState.error });
    }
    if (deleteSelectedItemsState?.success && deleteSelectedItemsState.message) {
        toast({ title: "Items Deleted", description: deleteSelectedItemsState.message });
        if (session?.uid) {
            fetchAndSetInventory(session.uid, true); 
        }
    }
  }, [deleteSelectedItemsState, toast, session?.uid]);


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
  
  const handleConfirmSaveMenu = async () => {
    if (!session?.uid || !menuUploadState?.extractedMenu?.extractedItems || !db) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot save menu. User session, extracted items, or DB service are missing.' });
      return;
    }

    setIsSavingMenu(true);
    const vendorId = session.uid;
    const itemsToSave = menuUploadState.extractedMenu.extractedItems;
    
    function parsePrice(priceString: string): number {
        if (!priceString) return 0;
        const cleanedString = priceString.replace(/[$,£€₹,]/g, '').trim();
        const price = parseFloat(cleanedString);
        return isNaN(price) ? 0 : price;
    }

    try {
      const batch = writeBatch(db);
      const inventoryCollectionRef = collection(db, 'vendors', vendorId, 'inventory');
      const now = Timestamp.now();
      
      itemsToSave.forEach(item => {
        const newItemRef = doc(inventoryCollectionRef); // Create ref with auto-generated ID
        const newItemData: Omit<VendorInventoryItem, 'id'> = {
          vendorId: vendorId,
          isCustomItem: true,
          itemName: item.itemName,
          vendorItemCategory: item.category,
          stockQuantity: 0, // Default for menu items
          price: parsePrice(item.price),
          unit: 'serving', // Default for menu items
          isAvailableOnThru: true,
          imageUrl: `https://placehold.co/50x50.png?text=${encodeURIComponent(item.itemName.substring(0, 10))}`,
          createdAt: now,
          updatedAt: now,
          lastStockUpdate: now,
          ...(item.description !== undefined && { description: item.description }),
        };
        batch.set(newItemRef, newItemData);
      });

      await batch.commit();

      toast({ title: 'Menu Saved', description: `${itemsToSave.length} menu items saved successfully!` });
      fetchAndSetInventory(vendorId, true);
      setShowExtractedMenu(false); // Hide the extracted items view after successful save
      
    } catch (error) {
      console.error('Error saving menu items:', error);
      const errorMessage = error instanceof Error ? `Firestore error: ${error.message}` : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Save Menu Error', description: errorMessage });
    } finally {
      setIsSavingMenu(false);
    }
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
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" />Add Menu Item Manually</Button>
            </DialogTrigger>
          </CardHeader>
          <CardContent>
            <form action={menuUploadFormAction} className="space-y-4 mb-6 p-4 border rounded-md">
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

            {menuUploadState?.extractedMenu && menuUploadState.extractedMenu.extractedItems.length > 0 && showExtractedMenu && (
              <div className="mt-6 p-4 border rounded-md">
                <h3 className="text-lg font-semibold mb-2 text-foreground">Extracted Menu Items:</h3>
                <p className="text-sm text-muted-foreground mb-2">Review the items below. You can edit them later after saving.</p>
                <div className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96">
                  <pre>
                    {JSON.stringify(menuUploadState.extractedMenu.extractedItems, null, 2)}
                  </pre>
                </div>

                <SaveMenuButton onClick={handleConfirmSaveMenu} isSaving={isSavingMenu} />
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
                    {session?.uid && vendorInventory.length > 0 && (
                        <form action={removeDuplicatesFormAction}>
                            <input type="hidden" name="vendorId" value={session.uid} />
                            <RemoveDuplicatesButton />
                        </form>
                    )}
                    <Button variant="outline" size="sm" onClick={() => session?.uid && fetchAndSetInventory(session.uid, true)} disabled={isRefreshingInventory || isLoadingInventory || isRemovingDuplicates}>
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

const renderGroceryContent = () => {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center"><Info className="mr-2 h-5 w-5 text-primary" /> How Grocery Orders Work</CardTitle>
                <CardDescription>
                    Your store operates on a dynamic order system. You don't need to manage a static inventory list here.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                    1. <strong>Order Broadcast:</strong> When a customer places a grocery order, it will be broadcast to nearby vendors, including you.
                </p>
                <p>
                    2. <strong>Check Your Stock:</strong> The new order will appear on your <Link href="/orders" className="text-primary underline">Orders</Link> page. You can review the requested items.
                </p>
                <p>
                    3. <strong>Confirm Availability:</strong> You can then confirm which items you have in stock and accept the order. The customer will be notified of what's available from your store.
                </p>
                <p>
                    This system ensures customers get the most up-to-date availability without requiring you to constantly update a digital inventory.
                </p>
                 <Button asChild className="mt-4">
                    <Link href="/orders">Go to Orders</Link>
                </Button>
            </CardContent>
        </Card>
    );
};


  const renderInventoryContent = () => {
    if (!session || !session.storeCategory) {
      return <p className="text-muted-foreground">Loading inventory information...</p>;
    }

    switch (session.storeCategory) {
      case 'Grocery Store':
        return renderGroceryContent();
      case 'Pharmacy':
      case 'Liquor Shop':
      case 'Pet Shop': 
        return (
          <div className="space-y-8">
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center"><Globe className="mr-2 h-5 w-5 text-primary" />Add from Global Catalog</CardTitle>
                    <CardDescription>Search for standard products and add them to your inventory for {session.storeCategory}.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSearchGlobalItems} disabled={isSearchingGlobal}>
                        {isSearchingGlobal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Search All Items
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isSearchingGlobal ? (
                     <div className="flex justify-center items-center p-4">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Searching...</span>
                    </div>
                ) : globalItemsResult.length > 0 ? (
                  <div className="mt-4 border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Image</TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Brand</TableHead>
                                <TableHead>MRP</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {globalItemsResult.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Image src={item.defaultImageUrl || 'https://placehold.co/50x50.png'} alt={item.itemName} width={40} height={40} className="rounded object-cover aspect-square"/>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.itemName}</TableCell>
                                    <TableCell>{item.brand || 'N/A'}</TableCell>
                                    <TableCell>{item.mrp ? `₹${item.mrp.toFixed(2)}` : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" onClick={() => openAddGlobalItemDialog(item)}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </div>
                ) : (
                    <p className="text-sm text-center text-muted-foreground mt-4">No global items found. Click search to populate the catalog.</p>
                )}
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
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Custom Product</Button>
                    </DialogTrigger>
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
                      <TableHead>MRP</TableHead>
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
                          />
                        </TableCell>
                        <TableCell className="font-medium flex items-center gap-2">
                            {item.itemName}
                            {!item.isCustomItem && <Globe className="h-3 w-3 text-muted-foreground" title="Global Item"/>}
                        </TableCell>
                        <TableCell>{item.vendorItemCategory}</TableCell>
                        <TableCell>{item.mrp ? `₹${item.mrp.toFixed(2)}` : 'N/A'}</TableCell>
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
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Product</Button>
                  </DialogTrigger>
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
                      <TableHead>MRP</TableHead>
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
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.vendorItemCategory}</TableCell>
                        <TableCell>{item.mrp ? `₹${item.mrp.toFixed(2)}` : 'N/A'}</TableCell>
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
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
    <Dialog onOpenChange={setIsAddCustomItemDialogOpen}>
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
            vendorId={session?.uid || null}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onItemUpdate={() => session?.uid && fetchAndSetInventory(session.uid, true)}
        />
        <AddGlobalItemDialog 
            item={itemToAdd}
            isOpen={isAddGlobalItemDialogOpen}
            onOpenChange={setIsAddGlobalItemDialogOpen}
            onItemAdded={() => session?.uid && fetchAndSetInventory(session.uid, true)}
        />
        <AddCustomItemDialog
            isOpen={isAddCustomItemDialogOpen}
            onOpenChange={setIsAddCustomItemDialogOpen}
            onItemAdded={() => session?.uid && fetchAndSetInventory(session.uid, true)}
        />
        <p className="mt-8 text-center text-sm text-muted-foreground">
            Use the Admin panel for managing the global item catalog.
        </p>
        </div>
    </Dialog>
  );
}
