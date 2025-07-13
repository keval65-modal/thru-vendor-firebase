
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, Loader2, Edit, Trash2, FileUp, LayoutDashboard, AlertCircle, UserX } from "lucide-react";
import type { Vendor } from '@/lib/inventoryModels';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getAllVendors, deleteVendorAndInventory } from './actions';
import { BulkAddDialog } from '@/components/inventory/BulkAddDialog';
import Link from 'next/link';


// --- Main Admin Page Component ---
export default function AdminPage() {
    const { toast } = useToast();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);
    const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

    const fetchVendors = useCallback(async () => {
        setIsLoading(true);
        const result = await getAllVendors();
        if (result.vendors) {
            setVendors(result.vendors);
            setError(null);
        } else {
            setVendors([]);
            setError(result.error || "Failed to load vendors.");
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // The server action `getAllVendors` will handle the auth check.
        fetchVendors();
    }, [fetchVendors]);


    const handleDeleteVendor = async (vendorId: string | undefined) => {
        if (!vendorId) {
            toast({ variant: "destructive", title: "Error", description: "Vendor ID is missing." });
            return;
        }
        setIsDeleting(true);
        const result = await deleteVendorAndInventory(vendorId);
        if (result.success) {
            toast({ title: "Success", description: result.message });
            setVendorToDelete(null); // Close dialog
            fetchVendors(); // Refresh list
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setIsDeleting(false);
    };
    
    // Show a loading state while fetching initial data
    if (isLoading) {
       return (
             <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full" />
                    </CardContent>
                 </Card>
             </div>
        );
    }
    
    // If the server returned an error (e.g., auth failure), show an error state.
    if (error) {
        return (
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
                <Card className="max-w-md mx-auto border-destructive">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center text-destructive">
                           <UserX className="mr-2 h-6 w-6"/> Access Denied
                        </CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm mb-4">
                            This panel is for administrators only. Please log in with an admin account to continue. If you believe this is an error, contact support.
                        </p>
                        <Button asChild variant="secondary">
                            <Link href="/admin/login">Go to Admin Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }


    return (
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <Card>
                <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center"><Shield className="mr-2 h-6 w-6 text-primary" /> Admin Panel - Vendor Management</CardTitle>
                        <CardDescription>View, edit, or remove vendors from the platform.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                         <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4"/>Vendor Dashboard</Link>
                        </Button>
                        <BulkAddDialog onItemsAdded={() => {
                            toast({ title: 'Global Items Added', description: 'The global catalog has been updated.' });
                        }}>
                            <Button variant="outline" size="sm"><FileUp className="mr-2 h-4 w-4" /> Bulk Add Global Items</Button>
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
                           {vendors.length > 0 ? (
                                vendors.map(vendor => (
                                    <TableRow key={vendor.id}>
                                        <TableCell className="font-medium">{vendor.shopName}</TableCell>
                                        <TableCell>{vendor.ownerName}</TableCell>
                                        <TableCell>{vendor.email}</TableCell>
                                        <TableCell>{vendor.storeCategory}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${vendor.isActiveOnThru ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                {vendor.isActiveOnThru ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="icon" asChild>
                                                <Link href={`/admin/${vendor.id}/edit`}>
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <AlertDialog open={vendorToDelete?.id === vendor.id} onOpenChange={(isOpen) => !isOpen && setVendorToDelete(null)}>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="icon" onClick={() => setVendorToDelete(vendor)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the vendor
                                                            <strong className="mx-1">{vendor.shopName}</strong>
                                                            and all associated inventory items. The user account must be deleted separately.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteVendor(vendor.id)} disabled={isDeleting}>
                                                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Delete Vendor
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
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
        </div>
    );
}
