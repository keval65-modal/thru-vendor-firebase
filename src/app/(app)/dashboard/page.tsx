import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShoppingCart, Archive, AlertTriangle, ArrowRight } from "lucide-react";

// Mock data - replace with actual data fetching
const summaryData = {
  activeOrders: 5,
  itemsLowStock: 2,
  pendingPickups: 3,
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, Vendor!</h1>
        <p className="text-muted-foreground">Here's an overview of your current status.</p>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summaryData.activeOrders}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Manage incoming and ongoing orders.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/orders">View Orders <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Status</CardTitle>
            <Archive className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summaryData.itemsLowStock} <span className="text-lg font-normal">items low</span></div>
            <p className="text-xs text-muted-foreground pt-1">
              Keep your stock levels updated.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/inventory">Manage Inventory <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Pickups</CardTitle>
            <AlertTriangle className="h-5 w-5 text-accent" /> {/* Using accent for alerts/attention */}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summaryData.pendingPickups}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Customers awaiting pickup confirmation.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/pickup">Confirm Pickups <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Perform common tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button variant="default" className="w-full justify-start text-left py-6 bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
               <Link href="/orders/new"> {/* Assuming a page to create new order, if applicable */}
                <ShoppingCart className="mr-3 h-5 w-5" />
                <span>Create New Order</span>
              </Link>
            </Button>
             <Button variant="secondary" className="w-full justify-start text-left py-6" asChild>
               <Link href="/inventory#add-product"> {/* Placeholder link */}
                <Archive className="mr-3 h-5 w-5" />
                <span>Add New Product</span>
              </Link>
            </Button>
            <Button variant="secondary" className="w-full justify-start text-left py-6" asChild>
               <Link href="/stock-alerts">
                <AlertTriangle className="mr-3 h-5 w-5" />
                <span>Check Stock Alerts</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
