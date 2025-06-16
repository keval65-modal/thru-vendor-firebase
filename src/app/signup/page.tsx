
import { SignupForm } from '@/components/auth/SignupForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-2 text-sm text-muted-foreground">Almost done!</div>
          <CardTitle className="text-3xl font-bold text-foreground">Register Shop with Thru</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Fill in the details below to get your shop registered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Login
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Thru. All rights reserved.
      </p>
    </main>
  );
}
