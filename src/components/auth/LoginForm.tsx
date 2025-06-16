
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, Send, CheckCircle } from 'lucide-react';
import { auth } from '@/lib/firebase'; 
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { establishPhoneSession } from '@/lib/auth'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const countryCodes = ["+91", "+1", "+44", "+61", "+81"]; 

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useState<HTMLDivElement | null>(null); // useRef was incorrect for id

  useEffect(() => {
    const container = document.getElementById('recaptcha-container-login');
    if (typeof window === 'undefined' || !container || recaptchaVerifier) {
      return;
    }

    const verifier = new RecaptchaVerifier(auth, container, {
      size: 'invisible',
      callback: (response: any) => {
        console.log('reCAPTCHA solved for login:', response);
      },
      'expired-callback': () => {
        toast({ variant: 'destructive', title: 'reCAPTCHA Expired', description: 'Please try sending OTP again.' });
        if (recaptchaVerifier) {
            recaptchaVerifier.clear();
        }
        setRecaptchaVerifier(null); 
      },
    });
    setRecaptchaVerifier(verifier);

    return () => {
      verifier?.clear();
    };
  }, [auth, recaptchaVerifier]); // Added recaptchaVerifier to dependencies


  const handleSendOtp = async () => {
    if (!phoneNumber.match(/^\d{7,15}$/)) {
      toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid phone number (7-15 digits).' });
      return;
    }
    if (!recaptchaVerifier) {
      toast({ variant: 'destructive', title: 'reCAPTCHA Error', description: 'reCAPTCHA not initialized. Please refresh or try again.' });
      // Ensure container is visible for debugging if needed
      const rContainer = document.getElementById('recaptcha-container-login');
      if (rContainer) rContainer.style.display = 'block'; // Temp for debug
      return;
    }

    setIsSendingOtp(true);
    setIsLoading(true);
    const fullNumber = `${phoneCountryCode}${phoneNumber}`;

    try {
      const result = await signInWithPhoneNumber(auth, fullNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      toast({ title: 'OTP Sent', description: `An OTP has been sent to ${fullNumber}.` });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Send OTP',
        description: error.message || 'Please ensure your domain is authorized in Firebase and reCAPTCHA is working.',
      });
       if (recaptchaVerifier) {
        recaptchaVerifier.clear();
      }
      setRecaptchaVerifier(null); // This will trigger the useEffect to re-initialize
    } finally {
      setIsSendingOtp(false);
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.match(/^\d{6}$/)) {
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'OTP must be 6 digits.' });
      return;
    }
    if (!confirmationResult) {
      toast({ variant: 'destructive', title: 'Verification Error', description: 'Please send OTP first.' });
      return;
    }

    setIsVerifyingOtp(true);
    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
      const fullNumber = `${phoneCountryCode}${phoneNumber}`;
      const sessionResult = await establishPhoneSession(fullNumber);

      if (sessionResult.success) {
        toast({ title: 'Login Successful', description: 'Welcome!' });
        router.push('/dashboard');
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Login Failed', description: sessionResult.error || 'Could not establish session.' });
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        variant: 'destructive',
        title: 'OTP Verification Failed',
        description: error.message || 'Incorrect OTP or an error occurred.',
      });
    } finally {
      setIsVerifyingOtp(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!showOtpInput ? (
        <>
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <div className="flex gap-2 mt-1">
              <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                  <SelectTrigger className="w-1/3">
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                <SelectContent>
                  {countryCodes.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
            </div>
          </div>
          <Button onClick={handleSendOtp} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || isSendingOtp}>
            {isSendingOtp ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send OTP
          </Button>
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={isLoading}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Enter the 6-digit OTP sent to {phoneCountryCode}{phoneNumber}.</p>
          </div>
          <Button onClick={handleVerifyOtp} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || isVerifyingOtp}>
            {isVerifyingOtp ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Verify OTP & Login
          </Button>
          <Button variant="link" onClick={() => { setShowOtpInput(false); setOtp(''); setConfirmationResult(null); }} disabled={isLoading}>
            Change Phone Number
          </Button>
        </>
      )}
      {/* Ensure unique ID for reCAPTCHA container if both forms can be on same conceptual page (though unlikely here) */}
      <div id="recaptcha-container-login"></div>
    </div>
  );
}

