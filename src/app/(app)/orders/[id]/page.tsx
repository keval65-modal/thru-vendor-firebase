import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PackageCheck, CookingPot, PackageOpen, CheckCircle2, Printer, Edit3, ShoppingBag, User, CalendarDays, Hash, DollarSign } from "lucide-react";
import Link from "next/link";

type OrderStatus = "Accepted" | "Preparing" | "Ready for Pickup" | "Completed" | "Cancelled";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface OrderDetails {
  id: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  shippingAddress?: string; // Optional
  billingAddress?: string; // Optional
}

// Mock data for a single order - replace with actual data fetching
const mockOrder: OrderDetails = {
  id: "ORD001",
  customerName: "Alice Wonderland",
  customerEmail: "alice@example.com",
  orderDate: "2024-07-28",
  status: "Ready for Pickup",
  items: [
    { id: "ITEM01", name: " artisanal Coffee Beans", quantity: 2, price: 15.00, total: 30.00 },
    { id: "ITEM02", name: "Croissant Variety Pack", quantity: 1, price: 12.00, total: 12.00 },
    { id: "ITEM03", name: "Organic Tea Leaves", quantity: 1, price: 3.00, total: 3.00 },
  ],
  subtotal: 45.00,
  tax: 3.60,
  total: 48.60,
  shippingAddress: "123 Rabbit Hole Lane, Wonderland, WN 45678",
  billingAddress: "123 Rabbit Hole Lane, Wonderland, WN 45678",
};

const statusDetails: Record<OrderStatus, { icon: React.ReactElement; color: string; description: string }> = {
  "Accepted": { icon: <PackageCheck className="h-5 w-5" />, color: "text-blue-500", description: "Order confirmed and awaiting processing." },
  "Preparing": { icon: <CookingPot className="h-5 w-5" />, color: "text-orange-500", description: "Order is being prepared." },
  "Ready for Pickup": { icon: <PackageOpen className="h-5 w-5" />, color: "text-yellow-600", description: "Order is ready for customer pickup." },
  "Completed": { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-500", description: "Order has been completed and picked up." },
  "Cancelled": { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-red-500", description: "Order has been cancelled." },
};


// This would ideally be a client component if status updates are interactive
// For now, it's a server component displaying data.
export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = mockOrder; // Fetch order by params.id in a real app

  if (!order) {
    return <div className="text-center py-10">Order not found.</div>;
  }

  const currentStatus = statusDetails[order.status];

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
                <CardTitle className="text-2xl">Order {order.id}</CardTitle>
                <CardDescription>Details for order placed on {new Date(order.orderDate).toLocaleDateString()}.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" /> Print</Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground"><Edit3 className="mr-2 h-4 w-4" /> Edit Status</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-3 p-4 rounded-md border bg-card mb-6 ${currentStatus.color.replace('text-', 'border-').replace('-500', '-200 dark:border-slate-700')}`}>
                <span className={currentStatus.color}>{currentStatus.icon}</span>
                <div>
                  <p className={`font-semibold ${currentStatus.color}`}>{order.status}</p>
                  <p className="text-sm text-muted-foreground">{currentStatus.description}</p>
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
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-6" />
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span className="font-medium text-foreground">${order.tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold text-lg text-foreground">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
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
              <p><strong className="text-foreground">Name:</strong> {order.customerName}</p>
              <p><strong className="text-foreground">Email:</strong> {order.customerEmail}</p>
              {order.shippingAddress && (
                <>
                 <Separator className="my-3"/>
                 <p className="font-medium text-foreground">Shipping Address:</p>
                 <p>{order.shippingAddress}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Placeholder for Order Status Updater component */}
          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl flex items-center"><Edit3 className="mr-2 h-5 w-5 text-primary" />Update Status</CardTitle>
                <CardDescription>Change the current status of this order.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Order status update component will be here.</p>
                 {/* This section will be replaced by OrderStatusUpdater.tsx */}
                <Button className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">Save Status</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
