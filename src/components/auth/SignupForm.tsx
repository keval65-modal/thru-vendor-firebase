
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
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useActionState } from 'react';
import { LocateFixed, Eye, EyeOff, Loader2, UserPlus, UploadCloud, AlertTriangle } from 'lucide-react';
import { handleSignup, type SignupFormState } from '@/app/signup/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Image from 'next/image';

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
  email: z.string().email({ message: "Please enter a valid email." }).toLowerCase(),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  phoneCountryCode: z.string().min(1, { message: "Please select a country code."}),
  phoneNumber: z.string().regex(/^\d{7,15}$/, { message: "Please enter a valid phone number (7-15 digits)." }),
  gender: z.string().optional(),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  weeklyCloseOn: z.string().min(1, { message: "Please select a closing day." }),
  openingTime: z.string().min(1, {message: "Please select an opening time."}),
  closingTime: z.string().min(1, {message: "Please select a closing time."}),
  shopFullAddress: z.string().min(10, { message: "Shop address must be at least 10 characters." }),
  latitude: z.preprocess(
    (val) => val === "" ? undefined : parseFloat(String(val)),
    z.number({invalid_type_error: "Latitude must be a number."}).min(-90).max(90)
  ).refine(val => val !== undefined, { message: "Latitude is required." }),
  longitude: z.preprocess(
    (val) => val === "" ? undefined : parseFloat(String(val)),
    z.number({invalid_type_error: "Longitude must be a number."}).min(-180).max(180)
  ).refine(val => val !== undefined, { message: "Longitude is required." }),
  shopImage: z.any().optional(),
}).refine(data => {
    if(data.openingTime && data.closingTime) {
        const openTimeIndex = timeOptions.indexOf(data.openingTime);
        const closeTimeIndex = timeOptions.indexOf(data.closingTime);
        if (data.openingTime === "12:00 AM (Midnight)" && data.closingTime === "12:00 AM (Midnight)") return true;
        return closeTimeIndex > openTimeIndex;
    }
    return true;
}, { message: "Closing time must be after opening time.", path: ["closingTime"]});

async function getCroppedImgBlob(image: HTMLImageElement, crop: PixelCrop, fileName: string): Promise<File | null> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY);
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = TARGET_IMAGE_WIDTH;
  finalCanvas.height = TARGET_IMAGE_HEIGHT;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) return null;
  finalCtx.drawImage(canvas, 0, 0, TARGET_IMAGE_WIDTH, TARGET_IMAGE_HEIGHT);
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() }));
    }, 'image/jpeg', 0.95);
  });
}

const initialState: SignupFormState = { success: false };

export function SignupForm() {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(handleSignup, initialState);

  const [showPassword, setShowPassword] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof signupFormSchema>>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      shopName: '', storeCategory: '', ownerName: '', email: '', password: '',
      phoneCountryCode: '+91', phoneNumber: '', gender: '', city: '',
      weeklyCloseOn: '', openingTime: '', closingTime: '', shopFullAddress: '',
      latitude: undefined, longitude: undefined, shopImage: undefined,
    },
  });

  useEffect(() => {
    if (state.error) {
       toast({ variant: "destructive", title: "Signup Failed", description: state.error });
    }
  }, [state, toast]);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
      setOriginalFile(file);
    }
  };
  
  function onImageLoadForCrop(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, TARGET_ASPECT_RATIO, width, height), width, height);
    setCrop(crop);
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', parseFloat(position.coords.latitude.toFixed(6)));
          form.setValue('longitude', parseFloat(position.coords.longitude.toFixed(6)));
          toast({ title: "Location Fetched", description: "Latitude and Longitude updated." });
        },
        (error) => toast({ variant: "destructive", title: "Location Error", description: error.message })
      );
    } else {
      toast({ variant: "destructive", title: "Geolocation Error", description: "Geolocation is not supported by this browser." });
    }
  };
  
  const onSubmit = async (values: z.infer<typeof signupFormSchema>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'shopImage') {
            formData.append(key, String(value));
        }
    });

    if (completedCrop && originalFile && imgRef.current) {
        const croppedBlob = await getCroppedImgBlob(imgRef.current, completedCrop, originalFile.name);
        if (croppedBlob) {
            formData.append('shopImage', croppedBlob, originalFile.name);
        }
    }
    formAction(formData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {state.error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{state.error}</AlertDescription></Alert>}

        <FormField control={form.control} name="shopName" render={({ field }) => (<FormItem><FormLabel>Shop Name *</FormLabel><FormControl><Input {...field} placeholder="e.g., The Corner Cafe" /></FormControl><FormMessage /></FormItem>)}/>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="ownerName" render={({ field }) => (<FormItem><FormLabel>Owner Name *</FormLabel><FormControl><Input {...field} placeholder="e.g., John Doe" /></FormControl><FormMessage /></FormItem>)}/>
          <FormField control={form.control} name="storeCategory" render={({ field }) => (<FormItem><FormLabel>Store Category *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger></FormControl><SelectContent>{storeCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (for login) *</FormLabel><FormControl><Input type="email" {...field} placeholder="you@example.com"/></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Input type={showPassword ? "text" : "password"} {...field} placeholder="Must be 8+ characters"/>
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button>
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormItem>
                <FormLabel>Phone No *</FormLabel>
                <div className="flex gap-2">
                    <FormField control={form.control} name="phoneCountryCode" render={({ field }) => (<FormItem className="w-1/3"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{countryCodes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
            </FormItem>
            <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender"/></SelectTrigger></FormControl><SelectContent>{genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="openingTime" render={({ field }) => (<FormItem><FormLabel>Opening Time *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select time"/></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={`open-${t}`} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="closingTime" render={({ field }) => (<FormItem><FormLabel>Closing Time *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select time"/></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={`close-${t}`} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="weeklyCloseOn" render={({ field }) => (<FormItem><FormLabel>Weekly Close On *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select day"/></SelectTrigger></FormControl><SelectContent>{weeklyCloseDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City *</FormLabel><FormControl><Input {...field} placeholder="e.g., Mumbai" /></FormControl><FormMessage /></FormItem>)}/>
        </div>

        <FormField control={form.control} name="shopFullAddress" render={({ field }) => (<FormItem><FormLabel>Shop Full Address *</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="123 Main Street, Appartment 4B, New Delhi, 110001"/></FormControl><FormMessage /></FormItem>)}/>
        
        <div className="space-y-2">
            <FormLabel>Shop Location (Lat & Long) *</FormLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} placeholder="e.g. 19.0760" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} placeholder="e.g. 72.8777"/></FormControl><FormMessage /></FormItem>)}/>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} className="mt-2 flex items-center gap-2"><LocateFixed className="h-4 w-4" /> Use My Current Location</Button>
        </div>

        <FormItem className="flex flex-col items-center p-4 border rounded-md bg-muted/30">
          <FormLabel className="font-semibold mb-2 text-center">Shop Display Picture</FormLabel>
          <div className="w-40 h-auto self-center rounded-md overflow-hidden border flex items-center justify-center bg-background mb-4">
              <Image src={imgSrc || 'https://placehold.co/150x100.png'} alt="Shop Preview" width={TARGET_IMAGE_WIDTH} height={TARGET_IMAGE_HEIGHT} className="object-cover" />
          </div>
          <Input id="shopImageUpload" name="shopImage" type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" ref={fileInputRef} />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="self-center flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> Choose Image
          </Button>
          <FormDescription className="text-xs text-center mt-2">Will be cropped to 150x100 pixels.</FormDescription>
        </FormItem>

        {imgSrc && (
          <div className="mt-4 p-2 border rounded-md w-full bg-background"><p className="text-sm text-muted-foreground mb-2 text-center">Adjust crop:</p>
            <ReactCrop crop={crop} onChange={(_, p) => setCrop(p)} onComplete={(c) => setCompletedCrop(c)} aspect={TARGET_ASPECT_RATIO} minWidth={TARGET_IMAGE_WIDTH/2}>
              <img ref={imgRef} alt="Crop preview" src={imgSrc} onLoad={onImageLoadForCrop} style={{ maxHeight: '300px', display: 'block', margin: 'auto', maxWidth: '100%' }} />
            </ReactCrop>
          </div>
        )}
        
        <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Register
        </Button>
      </form>
    </Form>
  )
}
