import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PackageCheck, CookingPot, PackageOpen, CheckCircle2, PlusCircle, FileText, ListFilter } from "lucide-react";
import Link from "next/link";

type OrderStatus = "Accepted" | "Preparing" | "Ready for Pickup" | "Completed" | "Cancelled";

interface Order {
  id: string;
  customerName: string;
  date: string;
  total: string;
  status: OrderStatus;
  itemCount: number;
}

const mockOrders: Order[] = [
  { id: "ORD001", customerName: "Alice Wonderland", date: "2024-07-28", total: "$45.00", status: "Ready for Pickup", itemCount: 3 },
  { id: "ORD002", customerName: "Bob The Builder", date: "2024-07-28", total: "$22.50", status: "Preparing", itemCount: 1 },
  { id: "ORD003", customerName: "Charlie Brown", date: "2024-07-27", total: "$105.75", status: "Completed", itemCount: 5 },
  { id: "ORD004", customerName: "Diana Prince", date: "2024-07-27", total: "$12.00", status: "Accepted", itemCount: 2 },
  { id: "ORD005", customerName: "Edward Scissorhands", date: "2024-07-26", total: "$78.20", status: "Completed", itemCount: 4 },
  { id: "ORD006", customerName: "Fiona Gallagher", date: "2024-07-28", total: "$33.00", status: "Preparing", itemCount: 2 },
  { id: "ORD007", customerName: "Greg Heffley", date: "2024-07-25", total: "$50.00", status: "Cancelled", itemCount: 3 },
];

const statusIcons: Record<OrderStatus, React.ReactElement> = {
  "Accepted": <PackageCheck className="h-4 w-4 text-blue-500" />,
  "Preparing": <CookingPot className="h-4 w-4 text-orange-500" />,
  "Ready for Pickup": <PackageOpen className="h-4 w-4 text-yellow-500" />,
  "Completed": <CheckCircle2 className="h-4 w-4 text-green-500" />,
  "Cancelled": <CheckCircle2 className="h-4 w-4 text-red-500" />,
};

const statusBadgeVariant: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  "Accepted": "outline",
  "Preparing": "secondary",
  "Ready for Pickup": "default", // default often maps to primary
  "Completed": "default", // could be a success variant if available
  "Cancelled": "destructive",
};


export default function OrdersPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage all customer orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <ListFilter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>A list of all recent orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/orders/${order.id}`} className="text-primary hover:underline">
                      {order.id}
                    </Link>
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell className="text-right">{order.itemCount}</TableCell>
                  <TableCell className="text-right">{order.total}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[order.status]} className="capitalize flex items-center gap-1.5 w-fit">
                      {statusIcons[order.status]}
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/orders/${order.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Update Status</DropdownMenuItem>
                        <DropdownMenuItem>Print Invoice</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Add Pagination component here if needed */}
    </div>
  );
}
