import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react'; // Using Flame as a generic logo icon
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Flame className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">Thru Vendor</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to manage your orders and inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
           <div className="mt-4 text-center text-sm">
            <Link
              href="/forgot-password"
              className="underline text-muted-foreground hover:text-primary"
            >
              Forgot your password?
            </Link>
          </div>
        </CardContent>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign Up
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Thru. All rights reserved.
      </p>
    </main>
  );
}
