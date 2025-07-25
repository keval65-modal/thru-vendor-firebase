
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseAuthProvider } from '@/components/auth/FirebaseAuthProvider';
import { cn } from '@/lib/utils';
import { DM_Sans } from 'next/font/google'

const fontSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Thru Vendor',
  description: 'Vendor management application for Thru',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <FirebaseAuthProvider>
          {children}
          <Toaster />
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
