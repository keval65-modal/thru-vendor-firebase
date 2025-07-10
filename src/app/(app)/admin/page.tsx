
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, Loader2, Edit, Trash2, FileUp } from "lucide-react";
import type { Vendor } from '@/lib/inventoryModels';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getAllVendors, deleteVendorAndInventory } from './actions';
import { getSession } from '@/lib/auth';
import { BulkAddDialog } from '@/components/inventory/BulkAddDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


// --- Main Admin Page Component ---
export default function AdminPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<'vendor' | 'admin' | undefined>();
    const [isDeleting, setIsDeleting] = useState(false);
    const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

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
        getSession().then(session => {
            setUserRole(session?.role);
        });
        fetchVendors();
    }, []);

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

    return (
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center"><Shield className="mr-2 h-6 w-6 text-primary" /> Admin Panel - Vendor Management</CardTitle>
                        <CardDescription>View, edit, or remove vendors from the platform.</CardDescription>
                    </div>
                    {userRole === 'admin' && (
                        <div>
                            <BulkAddDialog onItemsAdded={() => {
                                toast({ title: 'Global Items Added', description: 'The global catalog has been updated.' });
                            }}>
                                <Button variant="outline"><FileUp className="mr-2 h-4 w-4" /> Bulk Add Global Items</Button>
                            </BulkAddDialog>
                        </div>
                    )}
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
