
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mainNavItems, bottomNavItems, type NavItem } from '@/config/nav';
import { UserNav } from '@/components/layout/UserNav';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSession } from '@/hooks/use-session';

function NavLinks({ items, currentPath, role }: { items: NavItem[]; currentPath: string, role?: 'vendor' | 'admin' }) {
  return (
    <>
      {items.map((item) => {
        if (item.title === 'Admin' && role !== 'admin') {
          return null;
        }
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                (currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href))) && "bg-muted text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
              {item.label && <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session } = useSession();

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
              <Flame className="h-6 w-6" />
              <span className="">Thru Vendor</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <ul className="space-y-1">
                <NavLinks items={mainNavItems} currentPath={pathname} role={session?.isAuthenticated ? session.role : undefined} />
              </ul>
            </nav>
          </div>
          <div className="mt-auto p-4">
             <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <ul className="space-y-1">
                <NavLinks items={bottomNavItems} currentPath={pathname} role={session?.isAuthenticated ? session.role : undefined} />
              </ul>
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          {/* Mobile nav could be implemented here */}
          <div className="w-full flex-1">
            {/* Can be used for search or breadcrumbs */}
          </div>
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <ScrollArea className="h-[calc(100vh-theme(spacing.24))]">
            {children}
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
