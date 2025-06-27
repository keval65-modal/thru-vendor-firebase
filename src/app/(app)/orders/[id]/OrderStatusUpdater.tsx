'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit3, Loader2, Save } from 'lucide-react';
import type { VendorDisplayOrder, VendorOrderPortion } from '@/lib/orderModels';
import { updateVendorOrderStatus } from '../actions';


interface OrderStatusUpdaterProps {
    order: VendorDisplayOrder;
}

export function OrderStatusUpdater({ order }: OrderStatusUpdaterProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [newStatus, setNewStatus] = useState<VendorOrderPortion['status']>(order.vendorPortion.status);
    const [isLoading, setIsLoading] = useState(false);

    const availableStatuses: VendorOrderPortion['status'][] = ["New", "Preparing", "Ready for Pickup", "Picked Up"];

    const handleSaveStatus = async () => {
        setIsLoading(true);
        const result = await updateVendorOrderStatus(order.orderId, newStatus);
        if (result.success) {
            toast({ title: 'Success', description: 'Order status has been updated.' });
            router.refresh(); // Refresh the page to show the new status
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to update status.' });
        }
        setIsLoading(false);
    };

    const isStatusUpdatable = order.overallStatus !== 'Completed' && order.overallStatus !== 'Cancelled';

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl flex items-center"><Edit3 className="mr-2 h-5 w-5 text-primary" />Update Status</CardTitle>
                <CardDescription>Change the current status of this order.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Select 
                    value={newStatus}
                    onValueChange={(value) => setNewStatus(value as VendorOrderPortion['status'])}
                    disabled={!isStatusUpdatable || isLoading}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a new status" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableStatuses.map(status => (
                            <SelectItem key={status} value={status}>
                                {status}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                <Button 
                    onClick={handleSaveStatus}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={!isStatusUpdatable || isLoading || newStatus === order.vendorPortion.status}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Status
                </Button>
                {!isStatusUpdatable && (
                    <p className="text-xs text-center text-destructive">
                        This order is already {order.overallStatus.toLowerCase()} and cannot be updated.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
