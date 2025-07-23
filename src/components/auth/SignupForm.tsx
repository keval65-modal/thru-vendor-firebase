
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
import { Store, Info, MapPin, LocateFixed, Eye, EyeOff, Loader2, UserPlus, UploadCloud } from 'lucide-react';
import { createSession } from '@/lib/auth';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useFirebaseAuth } from './FirebaseAuthProvider';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const storeCategories = ["Grocery Store", "Restaurant", "Bakery", "Boutique", "Electronics", "Cafe", "Pharmacy", "Liquor Shop", "Pet Shop", "Gift Shop", "Other"];
const genders = ["Male", "Female", "Other", "Prefer not to say"];
const weeklyCloseDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Never Closed"];
const countryCodes = ["+91", "+1", "+44", "+61", "+81"];
const TARGET_IMAGE_WIDTH = 150;
const TARGET_IMAGE_HEIGHT = 100;
const TARGET_ASPECT_RATIO = TARGET_IMAGE_WIDTH / TARGET_IMAGE_HEIGHT;


const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h === 0 ? 12 : h % 12 === 0 ? 12 : h % 12;
      const period = h < 12 || h === 24 ? "AM" : "PM";
      const displayHour = hour12 < 10 ? `0${hour12}` : hour12;
      const displayMinute = m < 10 ? `0${m}` : m;
      let timeValue = `${displayHour}:${displayMinute} ${period}`;
      if (h === 0 && m === 0) timeValue = "12:00 AM (Midnight)";
      if (h === 12 && m === 0) timeValue = "12:00 PM (Noon)";
      options.push(timeValue.replace("12:00 AM (Midnight) AM", "12:00 AM (Midnight)").replace("12:00 PM (Noon) PM", "12:00 PM (Noon)"));
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
  email: z.string().email({ message: "Please enter a valid email address." }).toLowerCase(),
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
  shopImage: z.any().optional(), // Will be a File object if provided
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => {
    if(data.openingTime && data.closingTime) {
        if (data.openingTime === data.closingTime && data.openingTime !== "12:00 AM (Midnight)") {
            // Potentially allow this if "Open 24 Hours" is an option or implies it
        }
        const openTimeIndex = timeOptions.indexOf(data.openingTime);
        const closeTimeIndex = timeOptions.indexOf(data.closingTime);
        if (data.openingTime === "12:00 AM (Midnight)" && data.closingTime === "12:00 AM (Midnight)") return true;
        return closeTimeIndex > openTimeIndex;
    }
    return true;
}, { message: "Closing time must be after opening time.", path: ["closingTime"]});


async function generateCroppedImage(
  imageFile: File,
  crop: PixelCrop,
  targetWidth: number,
  targetHeight: number
): Promise<File | null> {
  const image = new Image();
  image.src = URL.createObjectURL(imageFile);
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  // Resize to target dimensions
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) return null;

  finalCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve) => {
    finalCanvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new File([blob], imageFile.name, { type: imageFile.type || 'image/png' }));
    }, imageFile.type || 'image/png', 0.9); // 0.9 quality for PNG/JPEG
  });
}


export function SignupForm() {
  const { auth, db, storage } = useFirebaseAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Image Cropping State
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCrop(undefined); // Clear crop on new image
      setCompletedCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
      setOriginalFile(file);
      form.setValue('shopImage', file); // Store original file in form state for validation / if no crop
    } else {
      setImgSrc('');
      setOriginalFile(null);
      form.setValue('shopImage', undefined);
    }
  };
  
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90, // Initial crop selection width
        },
        TARGET_ASPECT_RATIO,
        width,
        height,
      ),
      width,
      height,
    );
    setCrop(crop);
  }


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

  async function onSubmit(values: z.infer<typeof signupFormSchema>) {
    setIsLoading(true);

    if (!auth || !db || !storage) {
       toast({
        variant: 'destructive',
        title: 'Initialization Error',
        description: 'Firebase is not ready. Please try again in a moment.',
      });
      setIsLoading(false);
      return;
    }
    
    try {
      
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      console.log('Firebase Auth user created:', user.uid);

      let imageUrl: string | undefined = undefined;
      if (crop && originalFile && imgRef.current && imgRef.current.naturalWidth > 0) {
        const finalCrop = completedCrop || {
            unit: 'px',
            x: (imgRef.current.naturalWidth * crop.x) / 100,
            y: (imgRef.current.naturalHeight * crop.y) / 100,
            width: (imgRef.current.naturalWidth * crop.width) / 100,
            height: (imgRef.current.naturalHeight * crop.height) / 100,
        };

        const croppedFile = await generateCroppedImage(originalFile, finalCrop, TARGET_IMAGE_WIDTH, TARGET_IMAGE_HEIGHT);

        if (croppedFile) {
          const imagePath = `vendor_shop_images/${user.uid}/shop_image.${croppedFile.name.split('.').pop()}`;
          const imageStorageRef = storageRef(storage, imagePath);
          await uploadBytes(imageStorageRef, croppedFile);
          imageUrl = await getDownloadURL(imageStorageRef);
          console.log('Image uploaded, URL:', imageUrl);
        }
      }

      const { password, confirmPassword, shopImage, ...vendorDataForFirestore } = values;
      const fullPhoneNumber = `${values.phoneCountryCode}${values.phoneNumber}`;
      
      const vendorToSave = {
          ...vendorDataForFirestore,
          fullPhoneNumber,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          type: values.storeCategory,
          isActiveOnThru: true,
          role: 'vendor' as const,
      };
      if (imageUrl) {
        (vendorToSave as any).shopImageUrl = imageUrl;
      }

      await setDoc(doc(db, 'vendors', user.uid), vendorToSave);
      console.log('Vendor document created in Firestore.');

      const sessionResult = await createSession(user.uid);
      if (sessionResult?.success) {
          toast({
            title: 'Signup Successful',
            description: 'Your shop has been registered. Redirecting...',
          });
          router.push('/orders'); // Redirect to main app page
      } else {
          toast({
            variant: 'destructive',
            title: 'Signup Almost Complete',
            description: sessionResult?.error || 'Your account was created, but we couldn\'t log you in automatically. Please go to the login page.',
          });
          router.push('/login');
      }

    } catch (error: any) {
      let errorMessage = 'An unknown error occurred.';
      if (error.code) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email address is already in use by another account.';
                break;
            case 'auth/weak-password':
                errorMessage = 'The password is too weak. It must be at least 6 characters long.';
                break;
            case 'permission-denied':
                 errorMessage = 'You do not have permission to perform this action. Please check your Firestore security rules.';
                 break;
            default:
                errorMessage = `An unexpected error occurred: ${error.message}`;
                break;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
       toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
         
          <FormField
            control={form.control}
            name="shopImage"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center">
                <FormLabel>Shop Image (Logo/Storefront)</FormLabel>
                 <Input
                    id="shopImageUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden" 
                    ref={fileInputRef}
                    disabled={isLoading}
                  />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-xs mt-1 mb-2"
                  disabled={isLoading}
                >
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Choose Image
                </Button>

                {imgSrc && (
                  <div className="mt-2 p-2 border rounded-md w-full max-w-md">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={TARGET_ASPECT_RATIO}
                      minWidth={TARGET_IMAGE_WIDTH / 5}
                      minHeight={TARGET_IMAGE_HEIGHT / 5}
                    >
                      <img
                        ref={imgRef}
                        alt="Crop preview"
                        src={imgSrc}
                        onLoad={onImageLoad}
                        style={{ maxHeight: '400px', display: 'block', margin: 'auto' }}
                      />
                    </ReactCrop>
                  </div>
                )}
                {completedCrop && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Preview of 150x100 (Final image will be this size)
                  </div>
                )}
                <FormDescription className="text-xs text-center mt-1">
                  Upload a picture of your shop. It will be cropped to 150x100 pixels.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="shopName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shop Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Balaji Super Mart" {...field} disabled={isLoading} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
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
                  <Input placeholder="e.g., Manoj Nair" {...field} disabled={isLoading} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
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
                      <Input type="tel" placeholder="8664312230" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormItem>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="eg. aman@google.com" {...field} disabled={isLoading}/>
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
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={isLoading}
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
                      disabled={isLoading}
                    />
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      disabled={isLoading}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
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
                    <Input placeholder="Select city" {...field} disabled={isLoading} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select opening time" />
                      </Trigger>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select closing time" />
                      </Trigger>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
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
                  <Textarea placeholder="Enter your full address" {...field} rows={3} disabled={isLoading}/>
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
                        <Input type="number" step="any" placeholder="Latitude (e.g., 12.9716)" {...field} value={field.value ?? ""} disabled={isLoading} />
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
                        <Input type="number" step="any" placeholder="Longitude (e.g., 77.5946)" {...field} value={field.value ?? ""} disabled={isLoading}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} disabled={isLoading} className="mt-2 w-full md:w-auto">
              <LocateFixed className="mr-2 h-4 w-4" />
              Use My Current Location
            </Button>
             <FormDescription className="text-xs pt-1">
                Tries to fetch exact latitude & longitude. You can manually adjust if needed.
             </FormDescription>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Create Account
          </Button>
        </form>
      </Form>
    </TooltipProvider>
  );
}
