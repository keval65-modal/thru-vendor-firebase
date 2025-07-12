
import type { LucideProps } from 'lucide-react';
import { LayoutDashboard, ShoppingCart, Archive, QrCode, AlertTriangle, Settings, UserCircle, Shield } from 'lucide-react'; // Added UserCircle for Profile and Shield for Admin

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
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Orders',
    href: '/orders', 
    icon: ShoppingCart, 
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
];

export const bottomNavItems: NavItem[] = [
    {
      title: 'Profile',
      href: '/profile',
      icon: UserCircle, // Using UserCircle for profile/settings
    },
    // The Admin nav item has been removed from the main sidebar.
    // It is now accessed by directly navigating to /admin.
];
