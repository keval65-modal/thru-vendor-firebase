
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Store, Info, MapPin, UploadCloud, PlusCircle, LocateFixed, Eye, EyeOff, Send, CheckCircle, Loader2 } from 'lucide-react';
import { registerVendor } from '@/app/signup/actions';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';

const storeCategories = ["Grocery Store", "Restaurant", "Bakery", "Boutique", "Electronics", "Cafe", "Pharmacy", "Other"];
const genders = ["Male", "Female", "Other", "Prefer not to say"];
const weeklyCloseDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Never Closed"];
const countryCodes = ["+91", "+1", "+44", "+61", "+81"];

const generateTimeOptions = () => {
  const options = [];
  for (let h = 6; h < 24; h++) { // 6 AM to 11 PM
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const period = h < 12 || h === 24 ? "AM" : "PM";
      const displayHour = hour12 < 10 ? `0${hour12}` : hour12;
      const displayMinute = m < 10 ? `0${m}` : m;
      const timeValue = `${displayHour}:${displayMinute} ${period}`;
      options.push(timeValue);
    }
  }
  return options;
};
const timeOptions = generateTimeOptions();

const signupFormSchema = z.object({
  shopName: z.string().min(2, { message: "Shop name must be at least 2 characters." }),
  storeCategory: z.string().min(1, { message: "Please select a store category." }),
  ownerName: z.string().min(2, { message: "Owner name must be at least 2 characters." }),
  phoneCountryCode: z.string().min(1, { message: "Please select a country code."}),
  phoneNumber: z.string().regex(/^\d{7,15}$/, { message: "Please enter a valid phone number (7-15 digits)." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  gender: z.string().optional(),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  weeklyCloseOn: z.string().min(1, { message: "Please select a closing day." }),
  openingTime: z.string().min(1, {message: "Please select an opening time."}),
  closingTime: z.string().min(1, {message: "Please select a closing time."}),
  shopFullAddress: z.string().min(10, { message: "Shop address must be at least 10 characters." }),
  latitude: z.preprocess(
    (val) => val === "" ? undefined : parseFloat(String(val)),
    z.number({invalid_type_error: "Latitude must be a number."}).min(-90, "Must be >= -90").max(90, "Must be <= 90")
  ).refine(val => val !== undefined, { message: "Latitude is required." }),
  longitude: z.preprocess(
    (val) => val === "" ? undefined : parseFloat(String(val)),
    z.number({invalid_type_error: "Longitude must be a number."}).min(-180, "Must be >= -180").max(180, "Must be <= 180")
  ).refine(val => val !== undefined, { message: "Longitude is required." }),
  shopImage: z.any().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => {
    if(data.openingTime && data.closingTime) {
        const openTimeIndex = timeOptions.indexOf(data.openingTime);
        const closeTimeIndex = timeOptions.indexOf(data.closingTime);
        return closeTimeIndex > openTimeIndex;
    }
    return true;
}, { message: "Closing time must be after opening time.", path: ["closingTime"]});


export function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);


  const form = useForm<z.infer<typeof signupFormSchema>>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      shopName: '',
      storeCategory: '',
      ownerName: '',
      phoneCountryCode: '+91',
      phoneNumber: '',
      email: '',
      password: '',
      confirmPassword: '',
      gender: '',
      city: '',
      weeklyCloseOn: '',
      openingTime: '',
      closingTime: '',
      shopFullAddress: '',
      latitude: undefined,
      longitude: undefined,
      shopImage: undefined,
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !recaptchaContainerRef.current || recaptchaVerifier) {
      // If not in browser, container isn't ready, or verifier already exists, do nothing.
      return;
    }

    const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      size: 'invisible',
      callback: (response: any) => {
        console.log('reCAPTCHA solved:', response);
      },
      'expired-callback': () => {
        toast({ variant: 'destructive', title: 'reCAPTCHA Expired', description: 'Please try sending OTP again.' });
        setRecaptchaVerifier(prevVerifier => {
          prevVerifier?.clear();
          return null; // This will trigger re-initialization by this useEffect
        });
      },
    });
    setRecaptchaVerifier(verifier);

    // Cleanup function
    return () => {
      verifier?.clear();
    };
  }, [auth, recaptchaVerifier]); // Dependencies: auth, and recaptchaVerifier


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('shopImage', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('shopImage', undefined);
      setSelectedImagePreview(null);
    }
  };
  
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', parseFloat(position.coords.latitude.toFixed(6)));
          form.setValue('longitude', parseFloat(position.coords.longitude.toFixed(6)));
          toast({ title: "Location Fetched", description: "Latitude and Longitude updated." });
          setIsLoading(false);
        },
        (error) => {
          toast({ variant: "destructive", title: "Location Error", description: error.message });
          setIsLoading(false);
        }
      );
    } else {
      toast({ variant: "destructive", title: "Geolocation Error", description: "Geolocation is not supported by this browser." });
    }
  };

  const handleSendOtpForSignup = async () => {
    const phoneCountryCode = form.getValues('phoneCountryCode');
    const phoneNumber = form.getValues('phoneNumber');

    if (!phoneNumber.match(/^\d{7,15}$/)) {
      form.setError('phoneNumber', { type: 'manual', message: 'Please enter a valid phone number (7-15 digits).' });
      return;
    }
    if (!recaptchaVerifier) {
      toast({ variant: 'destructive', title: 'reCAPTCHA Error', description: 'reCAPTCHA not initialized. Please refresh or try again.' });
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
      // Reset reCAPTCHA if it exists and has a render method
       if (recaptchaVerifier && 'render' in recaptchaVerifier && typeof recaptchaVerifier.render === 'function') {
            try {
                const widgetId = await recaptchaVerifier.render();
                 // @ts-ignore // grecaptcha is global
                if (typeof grecaptcha !== 'undefined' && widgetId !== undefined) {
                    grecaptcha.reset(widgetId);
                }
            } catch (renderError) {
                console.error("Error re-rendering reCAPTCHA", renderError);
            }
        }
    } finally {
      setIsSendingOtp(false);
      setIsLoading(false);
    }
  };

  async function proceedToRegistration(values: z.infer<typeof signupFormSchema>) {
    setIsLoading(true);
    setIsVerifyingOtp(true); 
    const formData = new FormData();
    Object.keys(values).forEach(key => {
      const valueKey = key as keyof typeof values;
      if (values[valueKey] !== undefined) {
        if (valueKey === 'shopImage' && values.shopImage instanceof File) {
          formData.append(key, values.shopImage);
        } else {
          formData.append(key, String(values[valueKey]));
        }
      }
    });
    
    try {
      const result = await registerVendor(formData);
      if (result.success) {
        toast({
          title: 'Signup Successful',
          description: 'Your shop has been registered. Redirecting to login...',
        });
        router.push('/login');
      } else {
        toast({
          variant: 'destructive',
          title: 'Signup Failed',
          description: result.error || 'An unknown error occurred.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Signup Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
      setIsVerifyingOtp(false);
    }
  }

  const onSubmitWithOtp = async (values: z.infer<typeof signupFormSchema>) => {
    if (!showOtpInput) {
      await handleSendOtpForSignup();
    } else {
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
        toast({ title: 'Phone Verified!', description: 'Proceeding with registration...' });
        await proceedToRegistration(values); 
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
    }
  };


  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitWithOtp)} className="space-y-6">
          <div className="flex flex-col items-center space-y-2 mb-6">
            <FormLabel>Shop Image</FormLabel>
            <div className="relative w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center bg-muted overflow-hidden">
              {selectedImagePreview ? (
                <img src={selectedImagePreview} alt="Shop preview" className="w-full h-full object-cover" data-ai-hint="store shop" />
              ) : (
                <Store className="w-16 h-16 text-muted-foreground" />
              )}
               <FormField
                control={form.control}
                name="shopImage"
                render={({ field }) => ( 
                  <FormItem className="absolute bottom-0 right-0">
                    <FormControl>
                      <>
                        <input 
                          id="shopImageUpload"
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={handleImageChange} 
                          ref={field.ref} 
                        />
                        <Button type="button" size="icon" variant="outline" className="rounded-full bg-background hover:bg-muted" onClick={() => document.getElementById('shopImageUpload')?.click()}>
                          <PlusCircle className="h-5 w-5 text-primary" />
                        </Button>
                      </>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            {form.formState.errors.shopImage && <FormMessage>{form.formState.errors.shopImage?.message?.toString()}</FormMessage>}
            <FormDescription className="text-xs">Upload a picture of your shop.</FormDescription>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="shopName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shop Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Balaji Super Mart" {...field} disabled={showOtpInput || isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="storeCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={showOtpInput || isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {storeCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="ownerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Manoj Nair" {...field} disabled={showOtpInput || isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormItem>
            <FormLabel>Phone No *</FormLabel>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="phoneCountryCode"
                render={({ field }) => (
                  <FormItem className="w-1/4">
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={showOtpInput || isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countryCodes.map(code => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input type="tel" placeholder="8664312230" {...field} disabled={showOtpInput || isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             {showOtpInput && (
                <Button type="button" variant="link" size="sm" className="p-0 h-auto mt-1" onClick={() => { setShowOtpInput(false); setOtp(''); setConfirmationResult(null); }} disabled={isLoading}>
                    Change Phone Number
                </Button>
            )}
          </FormItem>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="eg. aman@google.com" {...field} disabled={showOtpInput || isLoading}/>
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
                <FormLabel>Password *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      {...field} 
                      disabled={showOtpInput || isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={showOtpInput || isLoading}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      {...field} 
                      disabled={showOtpInput || isLoading}
                    />
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      disabled={showOtpInput || isLoading}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={showOtpInput || isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genders.map(gender => (
                        <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input placeholder="Select city" {...field} disabled={showOtpInput || isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="openingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Time *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={showOtpInput || isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select opening time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={`open-${time}`} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="closingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Closing Time *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={showOtpInput || isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select closing time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={`close-${time}`} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
              control={form.control}
              name="weeklyCloseOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Weekly Close On *
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger type="button" className="ml-1">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Select the day your shop is typically closed.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={showOtpInput || isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {weeklyCloseDays.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          
          <FormField
            control={form.control}
            name="shopFullAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Shop Full Address *
                  <Tooltip delayDuration={100}>
                      <TooltipTrigger type="button" className="ml-1">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enter your full shop address. This helps customers find you.</p>
                      </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter your full address" {...field} rows={3} disabled={showOtpInput || isLoading}/>
                </FormControl>
                <FormDescription className="text-xs">
                  This will be displayed to customers.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1">
             <FormLabel>Shop Location (Latitude & Longitude) *</FormLabel>
             <FormDescription className="text-xs pb-2">
                Enter precise coordinates or use current location.
             </FormDescription>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Latitude (e.g., 12.9716)" {...field} value={field.value ?? ""} disabled={showOtpInput || isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Longitude (e.g., 77.5946)" {...field} value={field.value ?? ""} disabled={showOtpInput || isLoading}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} disabled={isLoading || showOtpInput} className="mt-2 w-full md:w-auto">
              <LocateFixed className="mr-2 h-4 w-4" />
              Use My Current Location
            </Button>
             <FormDescription className="text-xs pt-1">
                Tries to fetch exact latitude & longitude. You can manually adjust if needed.
             </FormDescription>
          </div>

          {showOtpInput && (
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
                <p className="text-xs text-muted-foreground mt-1">
                    Enter the 6-digit OTP sent to {form.getValues('phoneCountryCode')}{form.getValues('phoneNumber')}.
                </p>
            </div>
          )}
          
          <div ref={recaptchaContainerRef}></div>

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
            disabled={isLoading || isSendingOtp || isVerifyingOtp}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : showOtpInput ? (
              <CheckCircle className="mr-2 h-4 w-4" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isSendingOtp ? 'Sending OTP...' : 
             isVerifyingOtp ? 'Verifying & Registering...' : 
             showOtpInput ? 'Verify OTP & Create Account' : 'Send OTP & Proceed'}
          </Button>
        </form>
      </Form>
    </TooltipProvider>
  );
}

