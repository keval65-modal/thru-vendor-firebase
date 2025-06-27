'use client';

import { AppShell } from '@/components/layout/AppShell';
import { usePathname } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // The admin page should be standalone and not use the AppShell
  if (pathname.startsWith('/admin')) {
    return (
      <div className="bg-muted/40 min-h-screen">
          {children}
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
