
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { loginWithEmailPassword } from '@/lib/auth';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


const loginFormSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address." }).toLowerCase(),
  password: z.string().trim().min(1, { message: "Password is required." }),
});

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof loginFormSchema>) => {
    setIsLoading(true);
    console.log('[LoginForm] Submitting login form with values:', values);
    try {
      const result = await loginWithEmailPassword(values.email, values.password);

      if (result.success) {
        toast({ title: 'Login Successful', description: result.message || 'Welcome back!' });
        console.log('[LoginForm] Login successful. Attempting to redirect to /orders...');
        try {
          // Await router.push to ensure navigation completes before refresh
          await router.push('/orders');
          console.log('[LoginForm] Successfully pushed to /orders. Refreshing route...');
          router.refresh(); // Refresh the new route to ensure server components and middleware have fresh state
        } catch (navError) {
          console.error('[LoginForm] Navigation error to /orders:', navError);
          toast({
            variant: 'destructive',
            title: 'Navigation Error',
            description: 'Could not redirect to the home screen.',
          });
        }
      } else {
        console.log('[LoginForm] Login failed:', result.error);
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: result.error || 'Invalid credentials or an error occurred.',
        });
      }
    } catch (error: any) {
      console.error('[LoginForm] Login submission error:', error);
      toast({
        variant: 'destructive',
        title: 'Login Error',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          Login
        </Button>
      </form>
    </Form>
  );
}
