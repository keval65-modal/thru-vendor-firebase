import { StockAlertForm } from '@/components/stock-alerts/StockAlertForm';

export default function StockAlertsPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Stock Alerting</h1>
        <p className="text-muted-foreground mt-2">
          Leverage AI to predict low-stock items and receive intelligent restocking suggestions.
        </p>
      </div>
      <StockAlertForm />
       <p className="mt-8 text-center text-sm text-muted-foreground">
        <strong>Note:</strong> This tool provides suggestions based on the data you provide.
        Always use your professional judgment when making inventory decisions.
      </p>
    </div>
  );
}
