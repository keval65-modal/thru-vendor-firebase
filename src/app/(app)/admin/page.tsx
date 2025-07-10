
'use client';

import { useEffect, useState, useActionState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Shield, Loader2, Edit, Trash2, UserX, FileUp } from "lucide-react";
import type { Vendor } from '@/lib/inventoryModels';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getAllVendors, updateVendorByAdmin, deleteVendorAndInventory, type UpdateVendorByAdminFormState, type DeleteVendorFormState } from './actions';
import { BulkAddDialog } from '@/components/inventory/BulkAddDialog';

const storeCategories = ["Grocery Store", "Restaurant", "Bakery", "Boutique", "Electronics", "Cafe", "Pharmacy", "Liquor Shop", "Pet Shop", "Gift Shop", "Other"];

// Schema for the Edit Vendor form
const EditVendorSchema = z.object({
  shopName: z.string().min(1, "Shop name is required."),
  ownerName: z.string().min(1, "Owner name is required."),
  storeCategory: z.string().min(1, "Store category is required."),
  isActiveOnThru: z.boolean().default(true),
});

const initialUpdateState: UpdateVendorByAdminFormState = {};
const initialDeleteState: DeleteVendorFormState = {};


// --- Edit Vendor Dialog Component ---
interface EditVendorDialogProps {
    vendor: Vendor | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onVendorUpdate: () => void;
}

function EditVendorDialog({ vendor, isOpen, onOpenChange, onVendorUpdate }: EditVendorDialogProps) {
    const { toast } = useToast();
    const [updateState, formAction, isSubmitting] = useActionState(updateVendorByAdmin, initialUpdateState);
    
    const form = useForm<z.infer<typeof EditVendorSchema>>({
        resolver: zodResolver(EditVendorSchema),
        defaultValues: {
            shopName: '',
            ownerName: '',
            storeCategory: '',
            isActiveOnThru: true,
        },
    });

    useEffect(() => {
        if (vendor) {
            form.reset({
                shopName: vendor.shopName,
                ownerName: vendor.ownerName,
                storeCategory: vendor.storeCategory,
                isActiveOnThru: vendor.isActiveOnThru ?? true,
            });
        }
    }, [vendor, form]);

    useEffect(() => {
        if (updateState.success) {
            toast({ title: "Success", description: updateState.message });
            onVendorUpdate();
            onOpenChange(false);
        }
        if (updateState.error) {
            toast({ variant: "destructive", title: "Error", description: updateState.error });
        }
    }, [updateState, toast, onVendorUpdate, onOpenChange]);

    if (!vendor) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Vendor: {vendor.shopName}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form action={formAction} className="space-y-4">
                        <input type="hidden" name="vendorId" value={vendor.id} />
                        <FormField control={form.control} name="shopName" render={({ field }) => (
                            <FormItem><FormLabel>Shop Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="ownerName" render={({ field }) => (
                            <FormItem><FormLabel>Owner Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="storeCategory" render={({ field }) => (
                            <FormItem><FormLabel>Store Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{storeCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="isActiveOnThru" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Active on Thru</FormLabel>
                                    <FormDescription>Controls if the vendor is visible to customers.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                         )} />

                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


// --- Main Admin Page Component ---
export default function AdminPage() {
    const { toast } = useToast();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    const [deleteState, deleteFormAction, isDeleting] = useActionState(deleteVendorAndInventory, initialDeleteState);

    const fetchVendors = async () => {
        setIsLoading(true);
        const result = await getAllVendors();
        if (result.vendors) {
            setVendors(result.vendors);
        } else if (result.error) {
            toast({ variant: 'destructive', title: 'Error fetching vendors', description: result.error });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    useEffect(() => {
        if (deleteState.success) {
            toast({ title: "Success", description: deleteState.message });
            fetchVendors(); // Refresh the list
        }
        if (deleteState.error) {
            toast({ variant: "destructive", title: "Error", description: deleteState.error });
        }
    }, [deleteState, toast]);

    const handleEditClick = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setIsEditDialogOpen(true);
    };

    return (
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center"><Shield className="mr-2 h-6 w-6 text-primary" /> Admin Panel - Vendor Management</CardTitle>
                        <CardDescription>View, edit, or remove vendors from the platform.</CardDescription>
                    </div>
                    <div>
                        <BulkAddDialog onItemsAdded={() => {
                            toast({ title: 'Global Items Added', description: 'The global catalog has been updated.' });
                        }}>
                             <Button variant="outline"><FileUp className="mr-2 h-4 w-4" /> Bulk Add Global Items</Button>
                        </BulkAddDialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Shop Name</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : vendors.length > 0 ? (
                                vendors.map(vendor => (
                                    <TableRow key={vendor.id}>
                                        <TableCell className="font-medium">{vendor.shopName}</TableCell>
                                        <TableCell>{vendor.ownerName}</TableCell>
                                        <TableCell>{vendor.email}</TableCell>
                                        <TableCell>{vendor.storeCategory}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${vendor.isActiveOnThru ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {vendor.isActiveOnThru ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="icon" onClick={() => handleEditClick(vendor)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="icon">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <form action={deleteFormAction}>
                                                        <input type="hidden" name="vendorId" value={vendor.id} />
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the vendor
                                                                <strong className="mx-1">{vendor.shopName}</strong>
                                                                and all associated inventory items. The user will need to be deleted from Firebase Authentication manually.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction type="submit" disabled={isDeleting}>
                                                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                Delete Vendor
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </form>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">No vendors found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <EditVendorDialog
                vendor={editingVendor}
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onVendorUpdate={fetchVendors}
            />
        </div>
    );
}
