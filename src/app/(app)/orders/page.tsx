'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Bell, ShoppingCart, Power, Clock, CheckCircle, LogOut, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { getSession, logout } from '@/lib/auth';
import { OrderCard } from '@/components/orders/OrderCard';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { VendorDisplayOrder } from '@/lib/orderModels';
import { fetchVendorOrders } from './actions';
import { Skeleton } from '@/components/ui/skeleton';

interface VendorSession {
  uid?: string;
  shopName?: string;
  storeCategory?: string;
}

export default function OrdersPage() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [orders, setOrders] = useState<VendorDisplayOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      const currentSession = await getSession();
      if (currentSession && currentSession.isAuthenticated && currentSession.uid) {
        setSession({
          uid: currentSession.uid,
          shopName: currentSession.shopName,
          storeCategory: currentSession.storeCategory,
        });
        
        try {
          const fetchedOrders = await fetchVendorOrders(currentSession.uid);
          setOrders(fetchedOrders);
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Failed to load orders',
            description: (error as Error).message
          });
        }

      } else {
        // This case should be handled by middleware, but as a fallback
        router.push('/login');
      }
      setIsLoading(false);
    }
    loadInitialData();
  }, [router, toast]);
  
  const handleRefresh = async () => {
    if (!session?.uid) return;
    setIsLoading(true);
    try {
        const fetchedOrders = await fetchVendorOrders(session.uid);
        setOrders(fetchedOrders);
        toast({ title: 'Orders refreshed successfully!' });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not refresh orders.' });
    }
    setIsLoading(false);
  }

  const { newOrders, preparingOrders, readyOrders } = useMemo(() => {
    return {
      newOrders: orders.filter(o => o.vendorPortion.status === 'New'),
      preparingOrders: orders.filter(o => o.vendorPortion.status === 'Preparing'),
      readyOrders: orders.filter(o => o.vendorPortion.status === 'Ready for Pickup'),
    };
  }, [orders]);

  const handleToggleShopStatus = () => {
    setIsShopOpen(!isShopOpen);
    toast({
        title: `Shop is now ${!isShopOpen ? "Online" : "Offline"}`,
        description: `You can now ${!isShopOpen ? "receive" : "no longer receive"} new orders.`,
    });
  };

  const handleLogout = async () => {
    await logout();
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };
  
  const renderOrdersList = (orderList: VendorDisplayOrder[], status: 'New' | 'Preparing' | 'Ready') => {
    if (isLoading) {
      return (
         <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      );
    }

    if (orderList.length > 0) {
      return (
        <div className="space-y-4">
          {orderList.map(order => (
            <OrderCard key={order.orderId} order={order} onStatusUpdate={handleRefresh} />
          ))}
        </div>
      );
    }

    let Icon, title, description;
    switch (status) {
        case 'New':
            Icon = ShoppingCart;
            title = 'No New Orders';
            description = 'When new orders come in, they will appear here.';
            break;
        case 'Preparing':
            Icon = Clock;
            title = 'No Orders in Preparation';
            description = 'Accepted orders being prepared will show up here.';
            break;
        case 'Ready':
            Icon = CheckCircle;
            title = 'No Orders Ready for Pickup';
            description = 'Orders marked as ready will be listed here.';
            break;
        default:
            return null;
    }
    
    return (
        <Card className="shadow-none border-dashed">
            <CardContent className="p-6 text-center">
                <Icon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Section */}
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden">
                <Image src="https://placehold.co/60x60.png" alt="Shop Logo" width={48} height={48} data-ai-hint="shop logo" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{session?.shopName || "Your Shop"}</h1>
                <p className="text-xs opacity-90">{session?.storeCategory || "Category"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <RefreshCw className="h-5 w-5" />}
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
               <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="text-primary-foreground border-primary-foreground/50 hover:bg-primary/80 hover:text-primary-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
          <div className="mt-2 rounded-md overflow-hidden">
            <Image
              src="https://placehold.co/600x100.png" 
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
            <TabsTrigger value="new" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                New ({isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : newOrders.length})
            </TabsTrigger>
            <TabsTrigger value="preparing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Preparing ({isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : preparingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="ready" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Ready ({isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : readyOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-6">
            {renderOrdersList(newOrders, 'New')}
          </TabsContent>

          <TabsContent value="preparing" className="mt-6">
            {renderOrdersList(preparingOrders, 'Preparing')}
          </TabsContent>

          <TabsContent value="ready" className="mt-6">
            {renderOrdersList(readyOrders, 'Ready')}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
