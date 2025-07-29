
'use client';

import { useState, useEffect, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { handleLogin, type LoginFormState } from '@/app/login/actions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';


const loginFormSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address." }).toLowerCase(),
  password: z.string().trim().min(1, { message: "Password is required." }),
});

const initialState: LoginFormState = {
    success: false,
    error: undefined,
};

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(handleLogin, initialState);
  
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (state.success) {
      toast({ title: "Login Successful", description: "Redirecting to your dashboard..." });
      router.push('/dashboard');
      router.refresh(); // Force a refresh to ensure layout re-evaluates session
    }
    if (state.error) {
       toast({ variant: "destructive", title: "Login Failed", description: state.error });
    }
  }, [state, router, toast]);

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6">
        {state.error && !state.success && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        )}
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
                  disabled={isPending}
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
                    disabled={isPending}
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
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
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
