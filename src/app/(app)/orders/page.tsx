
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ShoppingCart, Clock, CheckCircle, LogOut, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { getSession, logout } from '@/lib/auth';
import { OrderCard } from '@/components/orders/OrderCard';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { PlacedOrder, VendorDisplayOrder } from '@/lib/orderModels';
import { Card, CardContent } from '@/components/ui/card';


interface VendorSession {
  uid?: string;
  email?: string;
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
    async function loadSession() {
      const currentSession = await getSession();
      if (currentSession && currentSession.isAuthenticated && currentSession.uid && currentSession.email) {
        setSession({
          uid: currentSession.uid,
          email: currentSession.email,
          shopName: currentSession.shopName,
          storeCategory: currentSession.storeCategory,
        });
      } else {
        router.push('/login');
      }
    }
    loadSession();
  }, [router]);

  useEffect(() => {
    if (!session?.email) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    console.log(`Setting up order listener for vendor email: ${session.email}`);

    const ordersRef = collection(db, "orders");
    const q = query(ordersRef,
        where("vendorIds", "array-contains", session.email),
        where("overallStatus", "in", ["Pending Confirmation", "Confirmed", "In Progress", "Ready for Pickup"])
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedOrders: VendorDisplayOrder[] = [];
        querySnapshot.forEach((doc) => {
            const orderData = { id: doc.id, ...doc.data() } as PlacedOrder;
            const vendorPortion = orderData.vendorPortions.find(p => p.vendorId === session.email);

            if (vendorPortion) {
                const { vendorPortions, ...rootOrderData } = orderData;
                fetchedOrders.push({
                    ...rootOrderData,
                    vendorPortion: vendorPortion
                });
            }
        });
        
        fetchedOrders.sort((a, b) => {
            const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as string).getTime();
            const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as string).getTime();
            return dateB - dateA;
        });

        setOrders(fetchedOrders);
        setIsLoading(false);
        console.log("Fetched orders for", session.email, ":", fetchedOrders);
    }, (error) => {
        console.error("Error fetching orders: ", error);
        toast({
            variant: 'destructive',
            title: 'Failed to Listen for Orders',
            description: 'Please check the developer console. A Firestore index may be required.'
        });
        setIsLoading(false);
    });

    return () => {
      console.log("Cleaning up order listener.");
      unsubscribe();
    };
  }, [session, toast]);
  

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
            <OrderCard key={order.orderId} order={order} />
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
