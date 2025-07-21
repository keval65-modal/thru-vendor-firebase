'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { handlePasswordResetRequest, type ForgotPasswordFormState } from '@/app/forgot-password/actions';

const initialState: ForgotPasswordFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Send className="mr-2 h-4 w-4" />
      )}
      Send Reset Link
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(handlePasswordResetRequest, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          // Disable input if a success message is shown
          disabled={!!state?.message}
        />
        {state?.fields?.email && (
          <p className="text-sm font-medium text-destructive">{state.fields.email[0]}</p>
        )}
      </div>

      {state?.message && (
        <Alert variant="default" className="border-green-500 text-green-700 dark:border-green-600 dark:text-green-300">
          <CheckCircle className="h-4 w-4 !text-green-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {state?.error && !state.message && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Only show the button if no success message has been displayed yet */}
      {!state?.message && <SubmitButton />}
    </form>
  );
}
