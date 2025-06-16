'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Loader2, Lightbulb } from 'lucide-react';
import { handleCheckStockLevels, type StockAlertFormState } from '@/app/(app)/stock-alerts/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const initialState: StockAlertFormState = {};

const exampleHistoricalData = JSON.stringify(
  [
    { "productName": "Coffee Beans", "quantitySold": 120, "period": "last 30 days" },
    { "productName": "Green Tea", "quantitySold": 80, "period": "last 30 days" },
    { "productName": "Chocolate Bar", "quantitySold": 200, "period": "last 30 days" }
  ], null, 2
);

const exampleCurrentStock = JSON.stringify(
  [
    { "productName": "Coffee Beans", "currentStock": 30 },
    { "productName": "Green Tea", "currentStock": 15 },
    { "productName": "Chocolate Bar", "currentStock": 50 }
  ], null, 2
);


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
        </>
      ) : (
        <>
          <Lightbulb className="mr-2 h-4 w-4" /> Analyze Stock
        </>
      )}
    </Button>
  );
}

export function StockAlertForm() {
  const [state, formAction] = useFormState(handleCheckStockLevels, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: "destructive",
        title: "Analysis Error",
        description: state.error,
      });
    }
    if (state?.message && !state.error) {
       toast({
        title: "Analysis Complete",
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6 text-primary" /> AI Stock Alert Analysis</CardTitle>
        <CardDescription>
          Provide historical order data and current stock levels in JSON format to predict low-stock items and get restocking suggestions.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="historicalOrderData" className="font-semibold">Historical Order Data (JSON)</Label>
            <Textarea
              id="historicalOrderData"
              name="historicalOrderData"
              rows={8}
              placeholder='e.g., [{"productName": "Coffee", "quantitySold": 100, "period": "last 30 days"}]'
              className="font-mono text-sm mt-1"
              defaultValue={exampleHistoricalData}
              aria-describedby="historicalOrderData-error"
            />
            {state?.fields?.historicalOrderData && <p id="historicalOrderData-error" className="text-sm text-destructive mt-1">{state.fields.historicalOrderData}</p>}
            <p className="text-xs text-muted-foreground mt-1">Paste your historical sales data here.</p>
          </div>
          <div>
            <Label htmlFor="currentStockLevels" className="font-semibold">Current Stock Levels (JSON)</Label>
            <Textarea
              id="currentStockLevels"
              name="currentStockLevels"
              rows={8}
              placeholder='e.g., [{"productName": "Coffee", "currentStock": 20}]'
              className="font-mono text-sm mt-1"
              defaultValue={exampleCurrentStock}
              aria-describedby="currentStockLevels-error"
            />
            {state?.fields?.currentStockLevels && <p id="currentStockLevels-error" className="text-sm text-muted-foreground mt-1">{state.fields.currentStockLevels}</p>}
            <p className="text-xs text-muted-foreground mt-1">Paste your current inventory levels here.</p>
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>

      {state?.result && (
        <div className="p-6 border-t">
          <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> Analysis Results
          </h3>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Low Stock Items</AlertTitle>
              <AlertDescription>
                {state.result.lowStockItems.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {state.result.lowStockItems.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No items are predicted to be low in stock currently.</p>
                )}
              </AlertDescription>
            </Alert>
            <Alert variant="default" className="bg-secondary">
               <Lightbulb className="h-4 w-4" />
              <AlertTitle>Restock Suggestions</AlertTitle>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md">
                  {state.result.restockSuggestions || "No specific restock suggestions provided."}
                </pre>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
    </Card>
  );
}
