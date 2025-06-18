
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame } from 'lucide-react';

import { cn } from '@/lib/utils';
import { mainNavItems, bottomNavItems, type NavItem } from '@/config/nav';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarMenuBadge,
  useSidebar,
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/layout/UserNav';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppShellProps {
  children: React.ReactNode;
}

function Logo() {
  const { state } = useSidebar();
  return (
    <Link href="/orders" className="flex items-center gap-2 font-semibold text-primary whitespace-nowrap">
      <Flame className="h-7 w-7" />
      {state === 'expanded' && <span className="text-xl">Thru Vendor</span>}
    </Link>
  );
}

function NavLinks({ items, currentPath }: { items: NavItem[]; currentPath: string }) {
  return (
    <>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={currentPath === item.href || (item.href !== '/orders' && item.href !== '/dashboard' && currentPath.startsWith(item.href))} // Adjusted for /orders as home
            tooltip={item.title}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.title}</span>
              {item.label && <SidebarMenuBadge>{item.label}</SidebarMenuBadge>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="h-14 flex items-center justify-between px-3 group-data-[collapsible=icon]:justify-center">
          <Logo />
        </SidebarHeader>
        <ScrollArea className="flex-1">
          <SidebarContent>
            <SidebarMenu>
              <NavLinks items={mainNavItems} currentPath={pathname} />
            </SidebarMenu>
          </SidebarContent>
        </ScrollArea>
        {bottomNavItems.length > 0 && (
          <SidebarFooter className="border-t">
            <SidebarMenu>
              <NavLinks items={bottomNavItems} currentPath={pathname} />
            </SidebarMenu>
          </SidebarFooter>
        )}
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1" /> {/* Spacer */}
          <UserNav />
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
