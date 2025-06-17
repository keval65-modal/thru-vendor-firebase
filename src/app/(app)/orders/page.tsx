
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Bell, ShoppingCart, Power, Clock, MinusCircle, PlusCircle, CheckCircle, XCircle, Car, User, Tag, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getSession } from '@/lib/auth'; // Assuming getSession can be called client-side or you adapt it
import { OrderCard } from '@/components/orders/OrderCard';

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

interface VendorSession {
  shopName?: string;
  storeCategory?: string;
  // add other relevant session fields
}

export default function OrdersPage() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for counts - replace with actual data fetching
  const newOrdersCount = 0; // Will be 0 as per no mock data requirement
  const preparingOrdersCount = 0;
  const completedOrdersCount = 0;

  const orders: Order[] = []; // Empty array as per no mock data requirement

  useEffect(() => {
    async function fetchSessionData() {
      setIsLoading(true);
      const currentSession = await getSession();
      if (currentSession && currentSession.isAuthenticated) {
        setSession({
          shopName: currentSession.shopName,
          storeCategory: currentSession.email, // Example: Using email as placeholder if storeCategory isn't in session
        });
      }
      setIsLoading(false);
    }
    fetchSessionData();
  }, []);

  const handleToggleShopStatus = () => {
    setIsShopOpen(!isShopOpen);
    // Add logic to update shop status in the backend
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading vendor details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Section */}
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden">
                {/* Replace with actual logo if available */}
                <Image src="https://placehold.co/60x60.png" alt="Shop Logo" width={48} height={48} data-ai-hint="shop logo" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{session?.shopName || "Your Shop"}</h1>
                <p className="text-xs opacity-90">{session?.storeCategory || "Category"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Switch
                  id="shop-status-toggle"
                  checked={isShopOpen}
                  onCheckedChange={handleToggleShopStatus}
                  aria-label="Toggle shop open/closed"
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                />
                <label htmlFor="shop-status-toggle" className="text-sm font-medium">
                  {isShopOpen ? "Online" : "Offline"}
                </label>
              </div>
            </div>
          </div>
          {/* Thru Loans Banner - Placeholder */}
          <div className="mt-2 rounded-md overflow-hidden">
            <Image
              src="https://placehold.co/600x100.png" // Placeholder for the banner
              alt="Thru Loans Banner"
              width={600}
              height={100}
              className="w-full object-cover"
              data-ai-hint="advertisement banner"
            />
          </div>
        </div>
      </header>

      {/* Tabs for Order Status */}
      <div className="container mx-auto py-4 px-2 sm:px-4">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-md">
            <TabsTrigger value="new" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">New ({newOrdersCount})</TabsTrigger>
            <TabsTrigger value="preparing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Preparing ({preparingOrdersCount})</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Completed ({completedOrdersCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-6">
            {orders.filter(o => o.status === 'New').length > 0 ? (
              <div className="space-y-4">
                {orders.filter(o => o.status === 'New').map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <Card className="shadow-none border-dashed">
                <CardContent className="p-6 text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground">No New Orders</h3>
                  <p className="text-muted-foreground">When new orders come in, they will appear here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="preparing" className="mt-6">
             {orders.filter(o => o.status === 'Preparing').length > 0 ? (
              <div className="space-y-4">
                {orders.filter(o => o.status === 'Preparing').map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <Card className="shadow-none border-dashed">
                <CardContent className="p-6 text-center">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground">No Orders in Preparation</h3>
                  <p className="text-muted-foreground">Accepted orders being prepared will show up here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {orders.filter(o => o.status === 'Completed').length > 0 ? (
              <div className="space-y-4">
                {orders.filter(o => o.status === 'Completed').map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <Card className="shadow-none border-dashed">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground">No Completed Orders Yet</h3>
                  <p className="text-muted-foreground">Fulfilled orders will be listed here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
