
import { notFound } from 'next/navigation';
import { getVendorForEditing } from '../../actions';
import { EditVendorForm } from './EditVendorForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  UserCog,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';

type RouteParams = { vendorId: string };

// NOTE: params is typed as a Promise to satisfy Next’s generated .next/types for this route.
// `await params` also works if Next passes a plain object at runtime (harmless no-op).
export default async function EditVendorPage(
  { params }: { params: Promise<RouteParams> }
) {
  const { vendorId } = await params; // works if object or promise

  const { vendor, error } = await getVendorForEditing(vendorId);

  // If there was a database error during fetch, display an alert.
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-2xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Vendor</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // If the vendor was not found (but no error occurred), render the 404 page.
  if (!vendor) {
    notFound();
  }

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
            Update details for{' '}
            <span className="font-semibold text-foreground">
              {vendor.shopName}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditVendorForm vendor={vendor} />
        </CardContent>
      </Card>
    </div>
  );
}
