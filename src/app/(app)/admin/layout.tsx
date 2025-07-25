
'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useSession } from '@/hooks/use-session';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!session?.isAuthenticated || session.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  if (isLoading || !session?.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
          <div className="p-8 space-y-4 w-full max-w-lg">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
      </div>
    );
  }

  if (session.role !== 'admin') {
     return (
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
            <Card className="max-w-md mx-auto border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center text-destructive">
                       <UserX className="mr-2 h-6 w-6"/> Access Denied
                    </CardTitle>
                    <CardDescription>You do not have permission to view this page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm mb-4">
                        This panel is for administrators only.
                    </p>
                    <Button asChild variant="secondary">
                        <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
