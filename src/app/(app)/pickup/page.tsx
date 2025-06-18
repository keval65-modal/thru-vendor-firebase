
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { QrCode, CheckCircle, Clock, Search } from "lucide-react"; // Changed UserClock to Clock

// Mock data for customer arrival
const customerArrivalInfo = {
  name: "Alice Wonderland",
  orderId: "ORD001",
  eta: "5 minutes",
  vehicle: "Blue Sedan - ABC 123",
};

export default function PickupPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pickup Confirmation</h1>
        <p className="text-muted-foreground">Confirm customer pickups efficiently.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Customer Arrival Information */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6 text-primary" /> Customer En Route</CardTitle> {/* Changed UserClock to Clock */}
            <CardDescription>Information about the next arriving customer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerArrivalInfo ? (
              <>
                <p className="text-lg font-semibold text-foreground">{customerArrivalInfo.name}</p>
                <p><strong className="text-muted-foreground">Order ID:</strong> {customerArrivalInfo.orderId}</p>
                <p><strong className="text-muted-foreground">ETA:</strong> <span className="font-medium text-accent">{customerArrivalInfo.eta}</span></p>
                <p><strong className="text-muted-foreground">Vehicle:</strong> {customerArrivalInfo.vehicle}</p>
                <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">View Order Details</Button>
              </>
            ) : (
              <p className="text-muted-foreground">No customers currently en route.</p>
            )}
          </CardContent>
        </Card>

        {/* Pickup Confirmation Methods */}
        <div className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><QrCode className="mr-2 h-6 w-6 text-primary" /> Scan QR Code</CardTitle>
              <CardDescription>Use a QR code scanner or device camera to confirm pickup.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {/* Placeholder for QR Scanner UI */}
              <div className="w-full h-48 bg-muted rounded-md flex items-center justify-center mb-4">
                <QrCode className="h-24 w-24 text-muted-foreground opacity-50" />
              </div>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <QrCode className="mr-2 h-4 w-4" /> Start Scanner
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Ensure camera permissions are enabled.</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6 text-primary" /> Manual Confirmation</CardTitle>
              <CardDescription>Enter order ID to confirm pickup manually.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <label htmlFor="orderId" className="block text-sm font-medium text-muted-foreground mb-1">Order ID</label>
                  <Input id="orderId" type="text" placeholder="e.g., ORD001" />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <CheckCircle className="mr-2 h-4 w-4" /> Confirm Pickup
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
