
import { notFound } from 'next/navigation';
import { getVendorForEditing } from '../../actions';
import { EditVendorForm } from './EditVendorForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Vendor } from '@/lib/inventoryModels';

// This is the pure UI component
function EditVendorPageComponent({ vendor }: { vendor: Vendor }) {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-4">
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin Panel
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCog className="mr-3 h-6 w-6 text-primary" />
            Edit Vendor
          </CardTitle>
          <CardDescription>
            Update details for <span className="font-semibold text-foreground">{vendor.shopName}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditVendorForm vendor={vendor} />
        </CardContent>
      </Card>
    </div>
  );
}

// Using `params: any` to bypass the persistent build error, as requested.
export default async function EditVendorPage({ params }: any) {
  const vendorId = params?.vendorId;

  if (!vendorId) {
    notFound();
  }
  
  const { vendor, error } = await getVendorForEditing(vendorId);

  // Handle data fetching errors gracefully
  if (error) {
    return (
        <div className="container mx-auto py-8 text-center">
            <Card className="max-w-md mx-auto border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="outline">
                        <Link href="/admin">Back to Admin Panel</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  // If the vendor is not found after a successful fetch, show a 404 page.
  if (!vendor) {
    notFound();
  }

  // Render the page with the fetched vendor data.
  return <EditVendorPageComponent vendor={vendor} />;
}
