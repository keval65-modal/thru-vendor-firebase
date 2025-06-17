
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MinusCircle, PlusCircle, CheckCircle, XCircle, Car, User, Tag, Clock, FileText, ShoppingBag } from "lucide-react";
import Link from "next/link";

// Placeholder types - replace with actual types when data is integrated
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderTime: string;
  customerName: string;
  vehicleNumber?: string;
  items: OrderItem[];
  totalBill: number;
  status: 'New' | 'Preparing' | 'Completed' | 'Cancelled';
  paid: boolean;
  preparationTime: number; // in minutes
}

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  // Function to handle preparation time changes
  const handlePrepTimeChange = (increment: boolean) => {
    // Placeholder for actual logic
    console.log(`Order ${order.id} prep time change: ${increment ? '+' : '-'}`);
  };

  // Function to handle order acceptance
  const handleAcceptOrder = () => {
    // Placeholder for actual logic
    console.log(`Order ${order.id} accepted`);
  };

  // Function to handle order rejection
  const handleRejectOrder = () => {
    // Placeholder for actual logic
    console.log(`Order ${order.id} rejected`);
  };

  return (
    <Card className="w-full shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="p-4 bg-card border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center">
            <Tag className="mr-2 h-4 w-4 text-primary" />
            Order ID: {order.id}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{order.orderTime}</span>
        </div>
        <div className="mt-1 space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center">
                <User className="mr-1.5 h-3 w-3" />
                Ordered by: <span className="font-medium text-foreground ml-1">{order.customerName}</span>
            </p>
            {order.vehicleNumber && (
                <p className="text-xs text-muted-foreground flex items-center">
                    <Car className="mr-1.5 h-3 w-3" />
                    Vehicle: <span className="font-medium text-foreground ml-1">{order.vehicleNumber}</span>
                </p>
            )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center"><ShoppingBag className="mr-2 h-4 w-4" /> Items</h4>
          <ul className="space-y-1 text-xs text-muted-foreground max-h-24 overflow-y-auto">
            {order.items.slice(0, 2).map(item => ( // Display first 2 items
              <li key={item.id} className="flex justify-between">
                <span>{item.quantity} x {item.name}</span>
                <span>₹{item.price.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          {order.items.length > 2 && (
            <Link href={`/orders/${order.id}#items`} className="text-xs text-primary hover:underline mt-1 inline-block">
              View all ({order.items.length})
            </Link>
          )}
        </div>

        <div className="mb-3 border-t pt-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-foreground">Total Bill</h4>
            <div className="flex items-center gap-2">
              <Badge variant={order.paid ? "default" : "outline"} className={order.paid ? "bg-green-500 text-white" : "border-yellow-500 text-yellow-600"}>
                {order.paid ? "PAID" : "PENDING"}
              </Badge>
              <span className="text-base font-bold text-foreground">₹{order.totalBill.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {order.status === 'New' && (
          <div className="border-t pt-3">
            <label htmlFor={`prep-time-${order.id}`} className="text-sm font-medium text-foreground mb-1.5 block flex items-center">
                <Clock className="mr-2 h-4 w-4"/> Order Preparation Time
            </label>
            <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="icon" onClick={() => handlePrepTimeChange(false)} className="h-8 w-8">
                    <MinusCircle className="h-4 w-4" />
                </Button>
                <span id={`prep-time-${order.id}`} className="text-sm font-semibold text-center w-12 border rounded-md py-1 px-2">
                    {order.preparationTime} min
                </span>
                <Button variant="outline" size="icon" onClick={() => handlePrepTimeChange(true)} className="h-8 w-8">
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </div>
          </div>
        )}
      </CardContent>

      {order.status === 'New' && (
        <CardFooter className="p-3 bg-muted/50 border-t grid grid-cols-2 gap-2">
          <Button variant="destructive" className="w-full" onClick={handleRejectOrder}>
            <XCircle className="mr-2 h-4 w-4" /> Reject
          </Button>
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleAcceptOrder}>
            <CheckCircle className="mr-2 h-4 w-4" /> Accept
          </Button>
        </CardFooter>
      )}
      {order.status === 'Preparing' && (
         <CardFooter className="p-3 bg-muted/50 border-t">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                <Clock className="mr-2 h-4 w-4" /> Mark as Ready for Pickup
            </Button>
         </CardFooter>
      )}
       {order.status === 'Completed' && (
         <CardFooter className="p-3 bg-muted/50 border-t">
            <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" /> View Invoice
            </Button>
         </CardFooter>
      )}
    </Card>
  );
}
