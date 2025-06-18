
import type { LucideProps } from 'lucide-react';
import { LayoutDashboard, ShoppingCart, Archive, QrCode, AlertTriangle, Settings, Users, LogOut } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<LucideProps>;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  variant?: "default" | "ghost";
  children?: NavItem[];
}

export const mainNavItems: NavItem[] = [
  {
    title: 'Orders', // Changed from Dashboard, or consolidate if Dashboard means Orders
    href: '/orders', // Points to orders as the primary/home view
    icon: ShoppingCart, // Using ShoppingCart as it's the new home
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Archive,
  },
  {
    title: 'Pickup Confirmation',
    href: '/pickup',
    icon: QrCode,
  },
  {
    title: 'Stock Alerts',
    href: '/stock-alerts',
    icon: AlertTriangle,
    label: 'AI'
  },
  // Example of how a "Dashboard" link could still exist if it pointed to orders
  // or a different overview page. For now, Orders is the main focus.
  // {
  //   title: 'Dashboard Overview',
  //   href: '/dashboard', // Or '/orders' if dashboard is the order screen
  //   icon: LayoutDashboard,
  // },
];

export const bottomNavItems: NavItem[] = [
    // Example:
    // {
    //   title: 'Settings',
    //   href: '/settings',
    //   icon: Settings,
    // },
];
