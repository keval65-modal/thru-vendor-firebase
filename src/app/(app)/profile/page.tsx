
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
import { useState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Info, MapPin, LocateFixed, Eye, EyeOff, Loader2, UserCog, UploadCloud, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { getVendorDetails, updateVendorProfile, type UpdateProfileFormState } from './actions';
import type { Vendor } from '@/lib/inventoryModels';

const storeCategories = ["Grocery Store", "Restaurant", "Bakery", "Boutique", "Electronics", "Cafe", "Pharmacy", "Liquor Shop", "Pet Shop", "Gift Shop", "Other"];
const genders = ["Male", "Female", "Other", "Prefer not to say"];
const weeklyCloseDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Never Closed"];
const countryCodes = ["+91", "+1", "+44", "+61", "+81"]; // Example country codes
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

// Schema for validating profile updates on the client
// Email is handled separately (read-only). Password is not updated here.
const profileFormSchema = z.object({
  shopName: z.string().min(2, { message: "Shop name must be at least 2 characters." }),
  storeCategory: z.string().min(1, { message: "Please select a store category." }),
  ownerName: z.string().min(2, { message: "Owner name must be at least 2 characters." }),
  phoneCountryCode: z.string().min(1, { message: "Please select a country code."}),
  phoneNumber: z.string().regex(/^\d{7,15}$/, { message: "Please enter a valid phone number (7-15 digits)." }),
  // email is read-only
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
  shopImage: z.any().optional(), // Will be a File object if a new image is selected
}).refine(data => {
    if(data.openingTime && data.closingTime) {
        const openTimeIndex = timeOptions.indexOf(data.openingTime);
        const closeTimeIndex = timeOptions.indexOf(data.closingTime);
        // Allow same open/close if it's midnight, implying 24 hours (or handle "Never Closed" for weeklyCloseOn)
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
  const image = new window.Image(); // Use window.Image for client-side
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
    }, imageFile.type || 'image/png', 0.9);
  });
}

const initialFormState: UpdateProfileFormState = {};

export default function ProfilePage() {
  const { toast } = useToast();
  const [vendorData, setVendorData] = useState<Vendor | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [updateState, setUpdateState] = useState<UpdateProfileFormState>(initialFormState);

  // Image Cropping State
  const [imgSrc, setImgSrc] = useState(''); // For displaying the image to be cropped
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [originalFile, setOriginalFile] = useState<File | null>(null); // The original file selected by user
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

  useEffect(() => {
    async function fetchVendor() {
      setIsLoadingData(true);
      const result = await getVendorDetails();
      if (result.vendor) {
        setVendorData(result.vendor);
        form.reset({
          ...result.vendor,
          latitude: result.vendor.latitude ?? undefined, // Ensure undefined if null/missing
          longitude: result.vendor.longitude ?? undefined,
          gender: result.vendor.gender ?? '', // Ensure empty string if undefined
          shopImage: undefined, // Do not prefill file input
        });
        if (result.vendor.shopImageUrl) {
          setImgSrc(result.vendor.shopImageUrl); // Set current shop image for display (not for crop initially)
        }
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error || "Could not fetch vendor details." });
      }
      setIsLoadingData(false);
    }
    fetchVendor();
  }, [form, toast]);

  useEffect(() => {
    if (updateState?.success && updateState.message) {
      toast({ title: "Profile Updated", description: updateState.message });
      // Optionally re-fetch vendor data if something critical changed that needs UI update beyond form
      // For now, form is source of truth after successful update until next full load.
    }
    if (updateState?.error) {
      toast({ variant: "destructive", title: "Update Failed", description: updateState.error });
    }
    if(!updateState?.success && !updateState?.error && updateState?.message){ // Edge case for non-error messages
        toast({title: "Info", description: updateState.message});
    }
    setIsSubmittingForm(false); // Reset submitting state after action completes
  }, [updateState, toast]);


  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || ''); // This will be the source for ReactCrop
      });
      reader.readAsDataURL(file);
      setOriginalFile(file);
      form.setValue('shopImage', file); // Store original file; it will be replaced by cropped if crop occurs
    } else {
      // If no file selected, revert imgSrc to current shopImageUrl if it exists
      setImgSrc(vendorData?.shopImageUrl || '');
      setOriginalFile(null);
      form.setValue('shopImage', undefined);
    }
  };
  
  function onImageLoadForCrop(e: React.SyntheticEvent<HTMLImageElement>) {
    if (!imgSrc.startsWith('data:')) return; // Only auto-crop for newly uploaded local files
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, TARGET_ASPECT_RATIO, width, height),
      width, height
    );
    setCrop(crop);
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      // Briefly set loading state for form fields if needed
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

  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!vendorData?.email) {
        toast({ variant: "destructive", title: "Error", description: "Vendor ID is missing." });
        return;
    }
    setIsSubmittingForm(true);
    const formDataToSubmit = new FormData();
    let finalShopImageFile: File | undefined | null = originalFile;

    if (completedCrop && originalFile && imgRef.current && imgSrc.startsWith('data:')) { // Check if imgSrc is a data URL (newly uploaded)
      try {
        const croppedFile = await generateCroppedImage(
          originalFile, completedCrop, TARGET_IMAGE_WIDTH, TARGET_IMAGE_HEIGHT
        );
        finalShopImageFile = croppedFile;
      } catch (cropError) {
        console.error("Error during image cropping:", cropError);
        toast({ variant: "destructive", title: "Cropping Error", description: "Could not crop image." });
        setIsSubmittingForm(false);
        return;
      }
    }
    
    // Append all basic fields
    Object.entries(values).forEach(([key, value]) => {
      const valueKey = key as keyof typeof values;
      if (valueKey !== 'shopImage' && value !== undefined) {
        formDataToSubmit.append(key, String(value));
      }
    });

    // Append the (potentially cropped) image file
    if (finalShopImageFile instanceof File) {
      formDataToSubmit.append('shopImage', finalShopImageFile);
    }
    
    const result = await updateVendorProfile(initialFormState, formDataToSubmit);
    setUpdateState(result);
  }

  if (isLoadingData) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vendorData) {
    return <div className="container mx-auto py-8">Error loading vendor data or vendor not found.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center">
          <UserCog className="mr-3 h-6 w-6 text-primary" /> Shop Profile Settings
        </CardTitle>
        <CardDescription>Update your shop information and display picture.</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Shop Image Section */}
              <FormField
                control={form.control}
                name="shopImage"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center p-4 border rounded-md bg-muted/30">
                    <FormLabel className="text-lg font-semibold mb-2">Shop Display Picture</FormLabel>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                        <div className="w-32 h-32 sm:w-40 sm:h-auto flex-shrink-0 rounded-md overflow-hidden border flex items-center justify-center bg-background">
                        {(imgSrc && !imgSrc.startsWith('data:')) || (imgSrc.startsWith('data:') && completedCrop) ? (
                            <Image
                                src={completedCrop && imgSrc.startsWith('data:') ? imgSrc : (vendorData.shopImageUrl || 'https://placehold.co/150x100.png')}
                                alt="Shop Image Preview"
                                width={TARGET_IMAGE_WIDTH}
                                height={TARGET_IMAGE_HEIGHT}
                                className="object-cover"
                                data-ai-hint="shop logo storefront"
                                key={vendorData.shopImageUrl || imgSrc} // Force re-render if URL changes
                            />
                        ) : (
                            <Image src="https://placehold.co/150x100.png" alt="Placeholder" width={150} height={100} data-ai-hint="placeholder image"/>
                        )}
                        </div>
                        <div className="flex-grow space-y-2">
                            <Input
                                id="shopImageUpload" type="file" accept="image/*"
                                onChange={handleImageFileChange}
                                className="hidden" ref={fileInputRef}
                                disabled={isSubmittingForm}
                            />
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full" disabled={isSubmittingForm}>
                                <UploadCloud className="mr-2 h-4 w-4" /> Change Image
                            </Button>
                            <FormDescription className="text-xs text-center sm:text-left">
                                Upload a new picture (JPG, PNG). It will be cropped to 150x100 pixels.
                            </FormDescription>
                        </div>
                    </div>

                    {imgSrc && imgSrc.startsWith('data:') && ( // Only show cropper for new, local images
                      <div className="mt-4 p-2 border rounded-md w-full bg-background">
                        <p className="text-sm text-muted-foreground mb-2 text-center">Adjust crop for 150x100 display:</p>
                        <ReactCrop
                          crop={crop}
                          onChange={(_, percentCrop) => setCrop(percentCrop)}
                          onComplete={(c) => setCompletedCrop(c)}
                          aspect={TARGET_ASPECT_RATIO}
                          minWidth={TARGET_IMAGE_WIDTH / 5}
                          minHeight={TARGET_IMAGE_HEIGHT / 5}
                        >
                          <img
                            ref={imgRef} alt="Crop preview" src={imgSrc}
                            onLoad={onImageLoadForCrop}
                            style={{ maxHeight: '300px', display: 'block', margin: 'auto', maxWidth: '100%' }}
                          />
                        </ReactCrop>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email (Read-only) */}
              <FormItem>
                <FormLabel>Email (Login ID)</FormLabel>
                <FormControl>
                  <Input value={vendorData.email} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                </FormControl>
                <FormDescription className="text-xs">Your login email cannot be changed here.</FormDescription>
              </FormItem>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="shopName" render={({ field }) => (
                    <FormItem><FormLabel>Shop Name *</FormLabel><FormControl><Input {...field} disabled={isSubmittingForm} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="storeCategory" render={({ field }) => (
                    <FormItem><FormLabel>Store Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{storeCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="ownerName" render={({ field }) => (
                  <FormItem><FormLabel>Owner Name *</FormLabel><FormControl><Input {...field} disabled={isSubmittingForm} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormItem><FormLabel>Phone No *</FormLabel>
                <div className="flex gap-2">
                  <FormField control={form.control} name="phoneCountryCode" render={({ field }) => (
                      <FormItem className="w-1/4"><Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{countryCodes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                      <FormItem className="flex-1"><FormControl><Input type="tel" {...field} disabled={isSubmittingForm} /></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>
              </FormItem>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem><FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                      <SelectContent>{genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>City *</FormLabel><FormControl><Input {...field} disabled={isSubmittingForm} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="openingTime" render={({ field }) => (
                  <FormItem><FormLabel>Opening Time *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{timeOptions.map(t => <SelectItem key={`open-${t}`} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="closingTime" render={({ field }) => (
                  <FormItem><FormLabel>Closing Time *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{timeOptions.map(t => <SelectItem key={`close-${t}`} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="weeklyCloseOn" render={({ field }) => (
                <FormItem><FormLabel>Weekly Close On *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{weeklyCloseDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="shopFullAddress" render={({ field }) => (
                <FormItem><FormLabel>Shop Full Address *</FormLabel>
                <FormControl><Textarea {...field} rows={3} disabled={isSubmittingForm} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="space-y-1">
                <FormLabel>Shop Location (Latitude & Longitude) *</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <FormField control={form.control} name="latitude" render={({ field }) => (
                    <FormItem><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} disabled={isSubmittingForm}/></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="longitude" render={({ field }) => (
                    <FormItem><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} disabled={isSubmittingForm}/></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} disabled={isSubmittingForm} className="mt-2">
                  <LocateFixed className="mr-2 h-4 w-4" /> Use My Current Location
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmittingForm}>
                  {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
              </Button>
            </form>
          </Form>
        </TooltipProvider>
      </CardContent>
    </Card>
    </div>
  );
}
