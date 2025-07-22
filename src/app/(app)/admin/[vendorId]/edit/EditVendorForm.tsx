'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Vendor } from '@/lib/inventoryModels';
import { updateVendorByAdmin, type UpdateVendorByAdminFormState } from '../../actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const storeCategories = ["Grocery Store", "Restaurant", "Bakery", "Boutique", "Electronics", "Cafe", "Pharmacy", "Liquor Shop", "Pet Shop", "Gift Shop", "Other"];

const initialState: UpdateVendorByAdminFormState = {};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
        </Button>
    )
}

interface EditVendorFormProps {
    vendor: Vendor;
}

export function EditVendorForm({ vendor }: EditVendorFormProps) {
    const { toast } = useToast();
    const updateVendorAction = updateVendorByAdmin.bind(null, vendor.id!);
    const [state, formAction] = useFormState(updateVendorAction, initialState);

    useEffect(() => {
        if (state.success) {
            toast({ title: "Success", description: state.message });
        }
        if (state.error) {
            toast({ variant: "destructive", title: "Error", description: state.error });
        }
    }, [state, toast]);

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                 <Alert variant="destructive">
                    <AlertTitle>Update Failed</AlertTitle>
                    <AlertDescription>{state.error}</AlertDescription>
                 </Alert>
            )}
             {state.success && (
                 <Alert variant="default" className="border-green-500">
                    <AlertTitle>Success!</AlertTitle>
                    <AlertDescription>{state.message}</AlertDescription>
                 </Alert>
            )}

            <div className="space-y-2">
                <Label htmlFor="shopName">Shop Name</Label>
                <Input id="shopName" name="shopName" defaultValue={vendor.shopName} />
                {state.fields?.shopName && <p className="text-sm text-destructive">{state.fields.shopName[0]}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input id="ownerName" name="ownerName" defaultValue={vendor.ownerName} />
                 {state.fields?.ownerName && <p className="text-sm text-destructive">{state.fields.ownerName[0]}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="storeCategory">Store Category</Label>
                <Select name="storeCategory" defaultValue={vendor.storeCategory}>
                    <SelectTrigger id="storeCategory">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {storeCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                 {state.fields?.storeCategory && <p className="text-sm text-destructive">{state.fields.storeCategory[0]}</p>}
            </div>

            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                 <div className="space-y-0.5">
                     <Label htmlFor="isActiveOnThru">Active on Thru</Label>
                     <p className="text-sm text-muted-foreground">Controls if the vendor is visible to customers.</p>
                 </div>
                 <Switch
                    id="isActiveOnThru"
                    name="isActiveOnThru"
                    defaultChecked={vendor.isActiveOnThru}
                 />
            </div>

            <SubmitButton />
        </form>
    );
}
