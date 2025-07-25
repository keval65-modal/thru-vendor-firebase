
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { SalesChart } from "@/components/dashboard/SalesChart";

export default function DashboardPage() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!session?.isAuthenticated) {
    // This state should ideally not be reached due to the layout's redirect logic
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>
            Could not load session. Please try logging in again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {session.ownerName}!</h1>
        <p className="text-muted-foreground mt-2">Here's a quick overview of your shop, <span className="font-semibold">{session.shopName}</span>.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manage Orders</CardTitle>
            <CardDescription>View new, preparing, and ready-for-pickup orders.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground mb-4">
              Keep track of incoming customer orders and update their status as you process them.
            </p>
            <Button asChild>
              <Link href="/orders">View Orders <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Update Inventory</CardTitle>
            <CardDescription>Add new products or manage your existing stock and prices.</CardDescription>
          </CardHeader>
           <CardContent>
             <p className="text-sm text-muted-foreground mb-4">
              Whether you're a restaurant adding menu items or a shop updating product stock, this is the place to manage it all.
            </p>
            <Button asChild>
              <Link href="/inventory">Go to Inventory <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <SalesChart />
      </div>

    </div>
  );
}
