
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MinusCircle, PlusCircle, CheckCircle, XCircle, User, Tag, Clock, FileText, ShoppingBag, Loader2, CookingPot, QrCode } from "lucide-react";
import Link from "next/link";
import type { VendorDisplayOrder, OrderItemDetail } from '@/lib/orderModels';
import { updateVendorOrderStatus } from '@/app/(app)/orders/actions';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { QRCodeCanvas as QRCode } from 'qrcode.react';

interface OrderCardProps {
  order: VendorDisplayOrder;
}

export function OrderCard({ order }: OrderCardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { vendorPortion, customerInfo, orderId } = order;

  // State for grocery item availability
  const [availableItems, setAvailableItems] = useState<string[]>(
    vendorPortion.items.map(item => item.itemId) // Initially all items are checked
  );

  const handleItemAvailabilityChange = (itemId: string) => {
    setAvailableItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };
  
  const handleStatusUpdate = async (
    newStatus: "Preparing" | "Ready for Pickup" | "Cancelled",
    updatedItems?: OrderItemDetail[]
  ) => {
    setIsLoading(true);
    const result = await updateVendorOrderStatus(orderId, newStatus, updatedItems);
    
    if (result.success) {
      toast({
        title: "Order Status Updated",
        description: `Order ${orderId} has been updated.`
      });
      // The onSnapshot listener will handle the UI update automatically.
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: result.error || "Could not update order status.",
      });
    }
    setIsLoading(false);
  };
  
  const handleAcceptOrder = () => {
    if (vendorPortion.status === 'Pending Vendor Confirmation') {
      const itemsToUpdate = vendorPortion.items.filter(item => availableItems.includes(item.itemId));
      if (itemsToUpdate.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Items Selected',
          description: 'You must select at least one available item to accept the order.',
        });
        return;
      }
      handleStatusUpdate('Preparing', itemsToUpdate);
    } else {
      handleStatusUpdate('Preparing');
    }
  };

  const handleMarkAsReady = () => handleStatusUpdate('Ready for Pickup');
  const handleRejectOrder = () => handleStatusUpdate('Cancelled');

  const orderTime = order.createdAt ? format(order.createdAt instanceof Timestamp ? order.createdAt.toDate() : parseISO(order.createdAt as string), "p, dd MMM yyyy") : 'N/A';

  const renderGroceryConfirmation = () => {
    return (
      <>
        <div className="mb-3 border-t pt-3">
          <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center">
            <CheckCircle className="mr-2 h-4 w-4"/> Confirm Item Availability
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground max-h-32 overflow-y-auto pr-2">
            {vendorPortion.items.map(item => (
              <div key={item.itemId} className="flex items-center space-x-2">
                <Checkbox
                  id={`${orderId}-${item.itemId}`}
                  checked={availableItems.includes(item.itemId)}
                  onCheckedChange={() => handleItemAvailabilityChange(item.itemId)}
                />
                <Label htmlFor={`${orderId}-${item.itemId}`} className="flex-1 cursor-pointer">
                  {item.quantity} x {item.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <CardFooter className="p-3 bg-muted/50 border-t">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="destructive" className="w-full" onClick={handleRejectOrder} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />} Reject Order
            </Button>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleAcceptOrder} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />} Accept Available
            </Button>
          </div>
        </CardFooter>
      </>
    );
  };
  
  const renderStandardFlow = () => {
     // This state is local to the card for UI purposes, but we could extend it to be saved.
    const [prepTime, setPrepTime] = useState(15); // Default prep time
    return (
       <>
        {vendorPortion.status === 'New' && (
          <div className="border-t pt-3">
            <label htmlFor={`prep-time-${order.orderId}`} className="text-sm font-medium text-foreground mb-1.5 block flex items-center">
                <Clock className="mr-2 h-4 w-4"/> Order Preparation Time
            </label>
            <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="icon" onClick={() => setPrepTime(p => Math.max(5, p-5))} className="h-8 w-8" disabled={isLoading}>
                    <MinusCircle className="h-4 w-4" />
                </Button>
                <span id={`prep-time-${order.orderId}`} className="text-sm font-semibold text-center w-16 border rounded-md py-1 px-2">
                    {prepTime} min
                </span>
                <Button variant="outline" size="icon" onClick={() => setPrepTime(p => p + 5)} className="h-8 w-8" disabled={isLoading}>
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </div>
          </div>
        )}
         <CardFooter className="p-3 bg-muted/50 border-t">
            {vendorPortion.status === 'New' && (
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="destructive" className="w-full" onClick={handleRejectOrder} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />} Reject
                </Button>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleAcceptOrder} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />} Accept
                </Button>
              </div>
            )}
            {vendorPortion.status === 'Preparing' && (
               <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleMarkAsReady} disabled={isLoading}>
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CookingPot className="mr-2 h-4 w-4" />} Mark as Ready
               </Button>
            )}
             {vendorPortion.status === 'Ready for Pickup' && (
                <div className="grid grid-cols-2 gap-2 w-full">
                    <Button asChild variant="outline" className="w-full" disabled={isLoading}>
                        <Link href={`/orders/${order.orderId}`}>
                          <FileText className="mr-2 h-4 w-4" /> Details
                        </Link>
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                          <QrCode className="mr-2 h-4 w-4" /> Show QR
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xs">
                        <DialogHeader>
                          <DialogTitle>Order: {order.orderId}</DialogTitle>
                          <DialogDescription>
                            Have customer scan this to confirm pickup.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center justify-center p-4 bg-white rounded-md">
                          <QRCode value={order.orderId} size={256} />
                        </div>
                      </DialogContent>
                    </Dialog>
                </div>
            )}
            {vendorPortion.status === 'Picked Up' && (
                <Button asChild variant="outline" className="w-full" disabled={isLoading}>
                    <Link href={`/orders/${order.orderId}`}>
                      <FileText className="mr-2 h-4 w-4" /> View Details
                    </Link>
                </Button>
            )}
         </CardFooter>
      </>
    );
  };

  return (
    <Card className="w-full shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="p-4 bg-card border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center">
            <Tag className="mr-2 h-4 w-4 text-primary" />
            Order ID: {order.orderId}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{orderTime}</span>
        </div>
        <div className="mt-1 space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center">
                <User className="mr-1.5 h-3 w-3" />
                Ordered by: <span className="font-medium text-foreground ml-1">{customerInfo?.name || 'Customer'}</span>
            </p>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center"><ShoppingBag className="mr-2 h-4 w-4" /> Items</h4>
          <ul className="space-y-1 text-xs text-muted-foreground max-h-24 overflow-y-auto">
            {vendorPortion.items.slice(0, 2).map(item => (
              <li key={item.itemId} className="flex justify-between">
                <span>{item.quantity} x {item.name}</span>
                <span>₹{item.totalPrice.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          {vendorPortion.items.length > 2 && (
            <Link href={`/orders/${order.orderId}`} className="text-xs text-primary hover:underline mt-1 inline-block">
              View all ({vendorPortion.items.length})
            </Link>
          )}
        </div>

        <div className="mb-3 border-t pt-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-foreground">Your Subtotal</h4>
            <div className="flex items-center gap-2">
              <Badge variant={order.paymentStatus === 'Paid' ? "default" : "outline"} className={order.paymentStatus === 'Paid' ? "bg-green-500 text-white" : "border-yellow-500 text-yellow-600"}>
                {order.paymentStatus.toUpperCase()}
              </Badge>
              <span className="text-base font-bold text-foreground">₹{vendorPortion.vendorSubtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
      </CardContent>

      {vendorPortion.status === 'Pending Vendor Confirmation' ? renderGroceryConfirmation() : renderStandardFlow()}
    </Card>
  );
}

    