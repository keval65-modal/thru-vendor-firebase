'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QrCode, CheckCircle, Search, Package, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getReadyForPickupOrders } from './actions';
import type { VendorDisplayOrder } from '@/lib/orderModels';
import { QRCodeCanvas as QRCode } from 'qrcode.react';

export default function PickupPage() {
  const [readyOrders, setReadyOrders] = useState<VendorDisplayOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      const orders = await getReadyForPickupOrders();
      setReadyOrders(orders);
      setIsLoading(false);
    }
    fetchOrders();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pickup Confirmation</h1>
        <p className="text-muted-foreground">Manage and confirm customer pickups.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Orders Ready for Pickup */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Package className="mr-2 h-6 w-6 text-primary" /> Orders Ready for Pickup</CardTitle>
            <CardDescription>Display a QR code for the customer to scan and confirm their order.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : readyOrders.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {readyOrders.map(order => (
                <Card key={order.orderId} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-semibold text-foreground">{order.orderId}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5"><User className="h-4 w-4" />{order.customerInfo?.name || 'N/A'}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline"><QrCode className="mr-2 h-4 w-4" />Show Code</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xs">
                      <DialogHeader>
                        <DialogTitle>Order ID: {order.orderId}</DialogTitle>
                        <DialogDescription>
                          Have the customer scan this code to confirm pickup.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-center p-4 bg-white rounded-md">
                        <QRCode value={order.orderId} size={256} />
                      </div>
                      <DialogFooter className="justify-center">
                        <p className="text-muted-foreground">Customer: {order.customerInfo?.name || 'N/A'}</p>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </Card>
              ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No orders are currently ready for pickup.</p>
            )}
          </CardContent>
        </Card>

        {/* Pickup Confirmation Methods */}
        <div className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6 text-primary" /> Manual Confirmation</CardTitle>
              <CardDescription>Enter order ID to confirm pickup manually.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <label htmlFor="orderId" className="block text-sm font-medium text-muted-foreground mb-1">Order ID</label>
                  <Input id="orderId" type="text" placeholder="e.g., ORD001" />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <CheckCircle className="mr-2 h-4 w-4" /> Confirm Pickup
                </Button>
              </form>
            </CardContent>
          </Card>
          
           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><QrCode className="mr-2 h-6 w-6 text-primary" /> Scan Customer's Code</CardTitle>
              <CardDescription>Use a scanner or device camera to scan the customer's QR code.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="w-full h-48 bg-muted rounded-md flex items-center justify-center mb-4">
                <QrCode className="h-24 w-24 text-muted-foreground opacity-50" />
              </div>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <QrCode className="mr-2 h-4 w-4" /> Start Scanner
              </Button>
              <p className="text-xs text-muted-foreground mt-2">This would activate the device camera.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
