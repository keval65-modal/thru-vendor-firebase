
import { notFound } from 'next/navigation';
import { getVendorForEditing } from '../../actions';
import { EditVendorForm } from './EditVendorForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Vendor } from '@/lib/inventoryModels';

// Props for the page component, defining the shape of `params` for a dynamic route.
type EditVendorPageProps = {
  params: {
    vendorId: string;
  };
};

/**
 * This is the non-async presentation component. It only receives data and renders UI.
 * This avoids the complex type issues associated with async server components that take params.
 */
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

/**
 * This is the async server component that Next.js will render for the page.
 * It handles the data fetching and then passes the result to the simple
 * presentation component above.
 */
export default async function EditVendorPage({ params }: EditVendorPageProps) {
  const { vendor, error } = await getVendorForEditing(params.vendorId);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!vendor) {
    notFound();
  }

  return <EditVendorPageComponent vendor={vendor} />;
}
