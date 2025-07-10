
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Save, FileUp } from 'lucide-react';
import { handleCsvUpload, type CsvParseFormState, handleBulkSaveItems, type BulkSaveFormState } from '@/app/(app)/inventory/actions';
import { useToast } from '@/hooks/use-toast';

const initialCsvParseState: CsvParseFormState = {};
const initialBulkSaveState: BulkSaveFormState = {};

interface BulkAddDialogProps {
  onItemsAdded: () => void;
  children: React.ReactNode;
}

export function BulkAddDialog({ onItemsAdded, children }: BulkAddDialogProps) {
    const [csvParseState, csvParseFormAction, isParsing] = useActionState(handleCsvUpload, initialCsvParseState);
    const [bulkSaveState, bulkSaveFormAction, isSaving] = useActionState(handleBulkSaveItems, initialBulkSaveState);
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (csvParseState.error) {
            toast({ variant: "destructive", title: "Parsing Error", description: csvParseState.error });
        }
    }, [csvParseState, toast]);

    useEffect(() => {
        if (bulkSaveState.success) {
            toast({ title: "Success", description: bulkSaveState.message });
            onItemsAdded();
            setIsOpen(false); // Close dialog on success
        }
        if (bulkSaveState.error) {
            toast({ variant: "destructive", title: "Save Error", description: bulkSaveState.error });
        }
    }, [bulkSaveState, toast, onItemsAdded]);

    // Example CSV content tailored for the Kaggle dataset structure
    const exampleCsv = `Name,Brand,Price,Category,SubCategory,Quantity,Description
Premia Badam (Almonds),Premia,451,Grocery,Dry Fruits,500 gm,"Premium quality almonds"
Parle-G Gold,Parle,120,Grocery,Biscuits,1kg pack,"The original gluco biscuit"
Crocin Pain Relief,GSK,55.50,Medical,Tablets,15 tablets,"For headache and body pain"
`;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Bulk Add Global Items via CSV</DialogTitle>
                    <DialogDescription>
                        Paste CSV data to add multiple items to the global catalog at once. The AI will map columns automatically.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <form action={csvParseFormAction} className="space-y-4">
                            <Label htmlFor="csvData">Paste CSV Data</Label>
                            <Textarea
                                id="csvData"
                                name="csvData"
                                rows={10}
                                placeholder="Paste your comma-separated data here..."
                                className="font-mono text-sm"
                                defaultValue={exampleCsv}
                                disabled={isParsing}
                            />
                             <p className="text-xs text-muted-foreground">
                                Headers like `Name`, `Price`, `Category`, `SubCategory`, and `Quantity` will be automatically mapped by the AI.
                             </p>
                            <Button type="submit" disabled={isParsing} className="w-full">
                                {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Parse & Preview Items
                            </Button>
                        </form>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Preview</h4>
                        <div className="border rounded-md h-[320px] overflow-auto">
                            {isParsing ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : csvParseState.parsedItems && csvParseState.parsedItems.length > 0 ? (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>MRP</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {csvParseState.parsedItems.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.itemName}</TableCell>
                                                    <TableCell>{item.sharedItemType}</TableCell>
                                                    <TableCell>₹{item.mrp?.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-muted-foreground">Waiting for data to preview...</p>
                                </div>
                            )}
                        </div>
                        {csvParseState.parsedItems && csvParseState.parsedItems.length > 0 && (
                            <form action={bulkSaveFormAction} className="mt-4">
                                <input type="hidden" name="itemsJson" value={JSON.stringify(csvParseState.parsedItems)} />
                                <Button type="submit" disabled={isSaving} className="w-full bg-green-600 hover:bg-green-700">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Confirm & Save {csvParseState.parsedItems.length} Items
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
