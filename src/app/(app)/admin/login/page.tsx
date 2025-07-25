
'use client';
// This client component has been deprecated in favor of the main /login page
// and server-side role checks. It is no longer needed.
// You will be redirected by the middleware.
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoginPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/login');
    }, [router]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    </div>
  );
}
