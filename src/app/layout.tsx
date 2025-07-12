import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseAuthProvider } from '@/components/auth/FirebaseAuthProvider';

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseAuthProvider>
          {children}
          <Toaster />
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
