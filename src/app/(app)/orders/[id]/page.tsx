import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PackageCheck, CookingPot, PackageOpen, CheckCircle2, Printer, Edit3, ShoppingBag, User, CalendarDays, Hash, DollarSign, XCircle } from "lucide-react";
import Link from "next/link";
import { fetchOrderDetails } from '../actions';
import { notFound } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { VendorOrderPortion } from "@/lib/orderModels";
import { OrderStatusUpdater } from "./OrderStatusUpdater";


const statusDetails: Record<VendorOrderPortion['status'] | 'Completed' | 'Cancelled', { icon: React.ReactElement; color: string; description: string }> = {
  "New": { icon: <PackageOpen className="h-5 w-5" />, color: "text-blue-500", description: "This is a new order, awaiting your confirmation." },
  "Preparing": { icon: <CookingPot className="h-5 w-5" />, color: "text-orange-500", description: "You are preparing this order." },
  "Ready for Pickup": { icon: <PackageCheck className="h-5 w-5" />, color: "text-yellow-600", description: "The order is ready for customer pickup." },
  "Picked Up": { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-500", description: "The customer has picked up the order." },
  "Completed": { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-500", description: "The order has been completed and picked up." },
  "Cancelled": { icon: <XCircle className="h-5 w-5" />, color: "text-red-500", description: "This order has been cancelled." },
};


export default async function OrderDetailPage({ params }: { params: { id:string } }) {
  const order = await fetchOrderDetails(params.id);

  if (!order) {
    notFound();
  }

  const vendorStatus = order.vendorPortion.status;
  // Use overallStatus for Completed/Cancelled as vendorPortion status might not reflect this.
  const displayStatusKey = order.overallStatus === 'Completed' || order.overallStatus === 'Cancelled' ? order.overallStatus : vendorStatus;
  const currentStatusInfo = statusDetails[displayStatusKey];
  const orderDate = order.createdAt ? format(order.createdAt instanceof Timestamp ? order.createdAt.toDate() : parseISO(order.createdAt as string), "PPP p") : 'N/A';

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Order {order.orderId}</CardTitle>
                <CardDescription>Order placed on {orderDate}.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" /> Print</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-3 p-4 rounded-md border bg-card mb-6 ${currentStatusInfo.color.replace('text-', 'border-').replace('-500', '-200 dark:border-slate-700')}`}>
                <span className={currentStatusInfo.color}>{currentStatusInfo.icon}</span>
                <div>
                  <p className={`font-semibold ${currentStatusInfo.color}`}>{displayStatusKey}</p>
                  <p className="text-sm text-muted-foreground">{currentStatusInfo.description}</p>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-3 text-foreground">Items Ordered</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.vendorPortion.items.map((item) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.pricePerItem.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{item.totalPrice.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-6" />
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal (Your Portion)</span>
                  <span className="font-medium text-foreground">₹{order.vendorPortion.vendorSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span className="font-medium text-foreground">₹{order.platformFee.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold text-lg text-foreground">
                  <span>Grand Total</span>
                  <span>₹{order.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center"><User className="mr-2 h-5 w-5 text-primary" /> Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Name:</strong> {order.customerInfo?.name || 'N/A'}</p>
              <p><strong className="text-foreground">Phone:</strong> {order.customerInfo?.phoneNumber || 'N/A'}</p>
              {order.tripDestination && (
                <>
                 <Separator className="my-3"/>
                 <p className="font-medium text-foreground">Delivery Address:</p>
                 <p>{order.tripDestination}</p>
                </>
              )}
            </CardContent>
          </Card>

          <OrderStatusUpdater order={order} />
        </div>
      </div>
    </div>
  );
}
