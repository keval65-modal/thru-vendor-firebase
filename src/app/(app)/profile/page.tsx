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
import { useState, useEffect, useRef } from 'react';
import { Info, MapPin, LocateFixed, Eye, EyeOff, Loader2, UserCog, UploadCloud, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { getVendorDetails, updateVendorProfile, type UpdateProfileFormState } from './actions';
import type { Vendor } from '@/lib/inventoryModels';
import { useActionState } from 'react';

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

const profileFormSchema = z.object({
  shopName: z.string().min(2, { message: "Shop name must be at least 2 characters." }),
  storeCategory: z.string().min(1, { message: "Please select a store category." }),
  ownerName: z.string().min(2, { message: "Owner name must be at least 2 characters." }),
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


async function getCroppedImgBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
): Promise<File | null> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width * scaleX,
    crop.height * scaleY
  );
  
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


export default function ProfilePage() {
  const { auth, storage } = useFirebaseAuth();
  const { toast } = useToast();
  const [vendorData, setVendorData] = useState<Vendor | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [state, formAction, isPending] = useActionState(updateVendorProfile, {success: false});
  
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      shopName: '', storeCategory: '', ownerName: '', phoneCountryCode: '+91',
      phoneNumber: '', gender: '', city: '', weeklyCloseOn: '',
      openingTime: '', closingTime: '', shopFullAddress: '',
      latitude: undefined, longitude: undefined, shopImage: undefined,
    },
  });

  const fetchVendor = async () => {
      setIsLoadingData(true);
      const result = await getVendorDetails();
      if (result.vendor) {
        setVendorData(result.vendor);
        form.reset({
          ...result.vendor,
          latitude: result.vendor.latitude ?? undefined,
          longitude: result.vendor.longitude ?? undefined,
          gender: result.vendor.gender ?? '',
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error || "Could not fetch vendor details." });
      }
      setIsLoadingData(false);
    }

  useEffect(() => {
    fetchVendor();
  }, []);

  useEffect(() => {
    if (state.success) {
      toast({ title: "Profile Updated", description: state.message });
      fetchVendor(); // Refetch data to show the latest updates
      setImgSrc('');
      setOriginalFile(null);
      setCompletedCrop(undefined);
    }
    if (state.error) {
       toast({ variant: "destructive", title: "Update Failed", description: state.error });
    }
  }, [state]);


  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
      });
      reader.readAsDataURL(file);
      setOriginalFile(file);
    }
  };
  
  function onImageLoadForCrop(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, TARGET_ASPECT_RATIO, width, height),
      width, height
    );
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

  const onFormSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    if (completedCrop && originalFile && imgRef.current) {
        try {
            const croppedBlob = await getCroppedImgBlob(imgRef.current, completedCrop, originalFile.name);
            if(croppedBlob) {
                formData.set('shopImage', croppedBlob, originalFile.name);
            } else {
                 formData.delete('shopImage');
            }
        } catch (e) {
            console.error("Image cropping failed:", e);
            toast({ variant: "destructive", title: "Image Error", description: "Could not process the selected image."});
            return;
        }
    } else {
        formData.delete('shopImage');
    }
    
    formAction(formData);
  }

  if (isLoadingData) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-3xl mx-auto"><CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
          <CardContent className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent>
        </Card>
      </div>
    );
  }

  if (!vendorData) {
    return <div className="container mx-auto py-8">Error loading vendor data.</div>;
  }

  const displayedImage = imgSrc || vendorData.shopImageUrl || 'https://placehold.co/150x100.png';

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader><CardTitle className="text-2xl font-bold flex items-center"><UserCog className="mr-3 h-6 w-6 text-primary" /> Shop Profile</CardTitle>
        <CardDescription>Update your shop information and display picture.</CardDescription>
      </CardHeader>
      <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
              <FormItem className="flex flex-col items-center p-4 border rounded-md bg-muted/30">
                <FormLabel className="text-lg font-semibold mb-2">Shop Display Picture</FormLabel>
                <div className="w-40 h-auto flex-shrink-0 rounded-md overflow-hidden border flex items-center justify-center bg-background mb-4">
                    <Image src={displayedImage} alt="Shop Image Preview" width={TARGET_IMAGE_WIDTH} height={TARGET_IMAGE_HEIGHT} className="object-cover" key={displayedImage} />
                </div>
                <Input id="shopImageUpload" name="shopImage" type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" ref={fileInputRef} disabled={isPending} />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full max-w-xs flex items-center gap-2" disabled={isPending}>
                    <UploadCloud className="h-4 w-4" /> Change Image
                </Button>
                <FormDescription className="text-xs text-center sm:text-left mt-2">Will be cropped to 150x100 pixels.</FormDescription>
              </FormItem>

              {imgSrc && (
                <div className="mt-4 p-2 border rounded-md w-full bg-background">
                  <p className="text-sm text-muted-foreground mb-2 text-center">Adjust crop for 150x100 display:</p>
                  <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)} aspect={TARGET_ASPECT_RATIO} minWidth={TARGET_IMAGE_WIDTH/2} minHeight={TARGET_IMAGE_HEIGHT/2}>
                    <img ref={imgRef} alt="Crop preview" src={imgSrc} onLoad={onImageLoadForCrop} style={{ maxHeight: '300px', display: 'block', margin: 'auto', maxWidth: '100%' }} />
                  </ReactCrop>
                </div>
              )}
              
              <FormItem><FormLabel>Email (Login ID)</FormLabel><FormControl><Input value={vendorData.email} readOnly disabled className="cursor-not-allowed" /></FormControl></FormItem>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="shopName" render={({ field }) => (<FormItem><FormLabel>Shop Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="storeCategory" render={({ field }) => (<FormItem><FormLabel>Store Category *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{storeCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
              </div>
              <FormField control={form.control} name="ownerName" render={({ field }) => (<FormItem><FormLabel>Owner Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem>
                    <FormLabel>Phone No *</FormLabel>
                    <div className="flex gap-2">
                      <FormField control={form.control} name="phoneCountryCode" render={({ field }) => (<FormItem className="w-1/3"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{countryCodes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                      <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                </FormItem>
                <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent>{genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="openingTime" render={({ field }) => (<FormItem><FormLabel>Opening Time *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={`open-${t}`} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="closingTime" render={({ field }) => (<FormItem><FormLabel>Closing Time *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={`close-${t}`} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="weeklyCloseOn" render={({ field }) => (<FormItem><FormLabel>Weekly Close On *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{weeklyCloseDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              </div>

              <FormField control={form.control} name="shopFullAddress" render={({ field }) => (<FormItem><FormLabel>Shop Full Address *</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)}/>
              
              <div className="space-y-2">
                <FormLabel>Shop Location (Latitude & Longitude) *</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} className="mt-2 flex items-center gap-2"><LocateFixed className="h-4 w-4" /> Use My Current Location</Button>
              </div>

              <Button type="submit" className="w-full flex items-center gap-2" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
              </Button>
            </form>
          </Form>
      </CardContent>
    </Card>
    </div>
  );
}
