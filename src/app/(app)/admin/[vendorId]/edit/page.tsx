
import { notFound } from 'next/navigation';
import { getVendorForEditing } from '../../actions';
import { EditVendorForm } from './EditVendorForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// This is the correct type definition for a page component with dynamic params
export default async function EditVendorPage({ params }: { params: { vendorId: string } }) {
  const { vendor, error } = await getVendorForEditing(params.vendorId);

  if (error) {
    // This could render a more specific error page if needed
    return <div>Error: {error}</div>;
  }

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
