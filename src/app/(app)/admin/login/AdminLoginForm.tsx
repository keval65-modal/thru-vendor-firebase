'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Eye, EyeOff, AlertTriangle, KeyRound } from 'lucide-react';
import { handleAdminLogin, type LoginState } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

const initialState: LoginState = { success: false };

function SubmitButton({ isDirectLogin }: { isDirectLogin?: boolean }) {
  const { pending } = useFormStatus();
  if (isDirectLogin) {
      return (
          <Button
              type="submit"
              variant="secondary"
              className="w-full"
              name="isDirectLogin"
              value="true"
              disabled={pending}
          >
              {pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
              )}
              Direct Admin Login
          </Button>
      )
  }
  return (
    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="mr-2 h-4 w-4" />
      )}
      Sign In
    </Button>
  );
}

export function AdminLoginForm() {
  const [state, formAction] = useActionState(handleAdminLogin, initialState);
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Login Successful', description: 'Redirecting to Admin Panel...' });
      // Using window.location.href for a more forceful redirect after state changes.
      window.location.href = '/admin';
    }
  }, [state, toast, router]);

  return (
    <form action={formAction} className="space-y-6">
        {state.error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        )}
        <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
            />
            {state.fields?.email && <p className="text-sm text-destructive">{state.fields.email[0]}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
                <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
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
            {state.fields?.password && <p className="text-sm text-destructive">{state.fields.password[0]}</p>}
        </div>
        
        <SubmitButton />

        <div className="relative">
            <Separator />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">OR</span>
            </div>
        </div>

        <SubmitButton isDirectLogin={true} />
    </form>
  );
}
