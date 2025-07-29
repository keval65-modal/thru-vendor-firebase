
'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Save, FileUp } from 'lucide-react';
import { handleCsvUpload, handleBulkSaveItems, type CsvParseFormState } from '@/app/(app)/inventory/actions';
import { useToast } from '@/hooks/use-toast';

interface BulkAddDialogProps {
  onItemsAdded: () => void;
  children: React.ReactNode;
}

export function BulkAddDialog({ onItemsAdded, children }: BulkAddDialogProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parsedData, setParsedData] = useState<CsvParseFormState | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setSelectedFile(file || null);
        setParsedData(null); // Reset preview when file changes
    };

    const handleParseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedFile) {
            toast({ variant: "destructive", title: "No File", description: "Please select a CSV file to upload." });
            return;
        }

        setIsParsing(true);
        setParsedData(null);
        const formData = new FormData();
        formData.append('csvFile', selectedFile);

        try {
            const result = await handleCsvUpload({ parsedItems: [], error: undefined, message: undefined }, formData);
            if (result.error) {
                toast({ variant: "destructive", title: "Parsing Error", description: result.error });
            }
            if (result.parsedItems) {
                setParsedData(result);
                toast({ title: "Parsing Complete", description: `Successfully parsed ${result.parsedItems.length} items for preview.` });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during file parsing.";
            toast({ variant: "destructive", title: "Parsing Failed", description: errorMessage });
        } finally {
            setIsParsing(false);
        }
    };
    
    const handleSaveSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!parsedData?.parsedItems || parsedData.parsedItems.length === 0) {
            toast({ variant: "destructive", title: "No Data", description: "There are no items to save." });
            return;
        }

        setIsSaving(true);
        const formData = new FormData();
        formData.append('itemsJson', JSON.stringify(parsedData.parsedItems));
        
        try {
            const result = await handleBulkSaveItems({ success: false, error: undefined, message: undefined }, formData);
             if (result.success) {
                toast({ title: "Success", description: result.message });
                onItemsAdded();
                setIsOpen(false); // Close dialog on success
            }
            if (result.error) {
                toast({ variant: "destructive", title: "Save Error", description: result.error });
            }
        } catch(error) {
             toast({ variant: "destructive", title: "Save Failed", description: "An unexpected error occurred while saving." });
        } finally {
            setIsSaving(false);
        }
    };
    
    // Reset state when dialog is closed
    useEffect(() => {
        if (!isOpen) {
            setSelectedFile(null);
            setParsedData(null);
            setIsParsing(false);
            setIsSaving(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Bulk Add Global Items via CSV File</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to add multiple items to the global catalog at once. The AI will analyze the content to extract items.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <form onSubmit={handleParseSubmit} className="space-y-4">
                            <Label htmlFor="csvFile">Upload CSV File</Label>
                            <Input
                                id="csvFile"
                                name="csvFile"
                                type="file"
                                accept=".csv,text/csv"
                                required
                                disabled={isParsing}
                                onChange={handleFileChange}
                                ref={fileInputRef}
                                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            />
                            {selectedFile && (
                                <p className="text-xs text-muted-foreground">Selected file: {selectedFile.name}</p>
                            )}
                             <p className="text-xs text-muted-foreground">
                                The CSV should contain headers. The AI will attempt to map columns like 'Name', 'Price', 'Category', etc., automatically.
                             </p>
                            <Button type="submit" disabled={isParsing || !selectedFile} className="w-full">
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
                            ) : parsedData?.parsedItems && parsedData.parsedItems.length > 0 ? (
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
                                            {parsedData.parsedItems.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.itemName}</TableCell>
                                                    <TableCell>{item.sharedItemType}</TableCell>
                                                    <TableCell>₹{item.mrp?.toFixed(2) || 'N/A'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-muted-foreground">Waiting for file to preview...</p>
                                </div>
                            )}
                        </div>
                        {parsedData?.parsedItems && parsedData.parsedItems.length > 0 && (
                            <form onSubmit={handleSaveSubmit} className="mt-4">
                                <Button type="submit" disabled={isSaving || isParsing} className="w-full bg-green-600 hover:bg-green-700">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Confirm & Save {parsedData.parsedItems.length} Items
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
