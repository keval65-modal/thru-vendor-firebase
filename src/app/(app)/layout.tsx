
'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useSession } from '@/hooks/use-session';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session?.isAuthenticated) {
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

  return <AppShell>{children}</AppShell>;
}
