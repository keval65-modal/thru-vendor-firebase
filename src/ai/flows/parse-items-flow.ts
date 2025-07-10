
'use server';
/**
 * @fileOverview A Genkit flow to parse raw CSV text into structured GlobalItem data.
 * This flow uses a hybrid approach:
 * 1. An AI model (getMapping) quickly determines the mapping between CSV headers and the target schema.
 * 2. The robust `papaparse` library then parses the entire CSV data using this mapping, which is much faster
 *    and more reliable than asking the AI to parse the whole file, thus avoiding timeouts and parsing errors.
 *
 * - parseCsvData - A function that handles the CSV parsing process.
 * - ParseCsvInput - The input type for the parseCsvData function.
 * - ParseCsvOutput - The return type for the parseCsvData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import Papa from 'papaparse';

// This schema should mirror the GlobalItem interface but is used for AI output validation.
const ParsedItemSchema = z.object({
  itemName: z.string().describe("The name of the product."),
  sharedItemType: z.enum(['grocery', 'medical', 'liquor', 'other']).describe("The high-level type of the item (grocery, medical, liquor, other)."),
  defaultCategory: z.string().describe("A specific category for the item (e.g., 'Dairy', 'Pain Relief', 'Dry Fruits')."),
  defaultUnit: z.string().describe("The unit of measurement or sale (e.g., '1kg', 'bottle', 'packet', '500 gm')."),
  brand: z.string().optional().describe("The brand name of the product."),
  mrp: z.number().optional().describe("The Maximum Retail Price of the product."),
  defaultImageUrl: z.string().url().optional().describe("A URL for the product's image."),
  description: z.string().optional().describe("A brief description of the product."),
  barcode: z.string().optional().describe("The barcode or UPC of the product."),
});

const ParseCsvInputSchema = z.object({
  csvData: z.string().describe("A string containing comma-separated values (CSV) of items to be parsed."),
});
export type ParseCsvInput = z.infer<typeof ParseCsvInputSchema>;

const ParseCsvOutputSchema = z.object({
  parsedItems: z.array(ParsedItemSchema).describe('An array of structured item objects parsed from the CSV.'),
});
export type ParseCsvOutput = z.infer<typeof ParseCsvOutputSchema>;


export async function parseCsvData(input: ParseCsvInput): Promise<ParseCsvOutput> {
  return parseItemsFlow(input);
}


// New, fast AI flow just for mapping headers
const MappingInputSchema = z.object({
    csvHeader: z.string().describe("The header row of the CSV file."),
});

const MappingOutputSchema = z.object({
    itemName: z.string().describe("The exact column name from the CSV header that maps to item name (e.g., 'Name', 'Product Name')."),
    brand: z.string().optional().describe("The exact column name for brand."),
    mrp: z.string().optional().describe("The exact column name for price/mrp."),
    sharedItemType: z.string().optional().describe("The exact column name for the main category (e.g., 'Category')."),
    defaultCategory: z.string().optional().describe("The exact column name for the sub-category (e.g., 'SubCategory', 'Sub Category')."),
    defaultUnit: z.string().optional().describe("The exact column name for the unit or quantity (e.g., 'Quantity')."),
    description: z.string().optional().describe("The exact column name for description."),
    defaultImageUrl: z.string().optional().describe("The exact column name for an image URL."),
    barcode: z.string().optional().describe("The exact column name for the barcode."),
}).describe("A JSON object mapping our required fields to the exact column names found in the CSV header.");

const getMapping = ai.definePrompt({
    name: "getMappingPrompt",
    input: { schema: MappingInputSchema },
    output: { schema: MappingOutputSchema },
    model: 'googleai/gemini-1.5-flash-latest',
    prompt: `You are a CSV header mapping expert. You will be given a single line of text, which is the header row from a CSV file.
    Your only job is to determine which column name from the input maps to our required data fields.
    Our required fields are: "itemName", "brand", "mrp", "sharedItemType", "defaultCategory", "defaultUnit", "description", "defaultImageUrl", "barcode".

    Analyze the provided CSV header and return a JSON object where the keys are our required fields and the values are the EXACT corresponding column names from the header.
    - For 'itemName', look for headers like 'Name', 'Item Name', or 'Product Name'. This is a required field.
    - For 'sharedItemType', look for 'Category'.
    - For 'defaultCategory', look for 'SubCategory' or 'Sub Category'.
    - For 'mrp', look for 'Price' or 'MRP'.
    - For 'defaultUnit', look for 'Quantity' or 'Unit' or 'Size'.

    If a mapping for an optional field cannot be found, omit it from the output.

    CSV Header:
    {{{csvHeader}}}
    `,
});


const parseItemsFlow = ai.defineFlow(
  {
    name: 'parseItemsFlow',
    inputSchema: ParseCsvInputSchema,
    outputSchema: ParseCsvOutputSchema,
  },
  async (input) => {
    console.log(`[parseItemsFlow] Started: Parsing CSV data.`);
    const { data: rows, meta } = Papa.parse<Record<string, string>>(input.csvData.trim(), {
        header: true,
        skipEmptyLines: true,
    });

    if (rows.length === 0 || !meta.fields) {
      console.error("[parseItemsFlow] PapaParse resulted in no data rows or headers.");
      return { parsedItems: [] };
    }

    const header = meta.fields.join(',');
    console.log(`[parseItemsFlow] CSV Header detected by PapaParse: "${header}"`);
    console.log(`[parseItemsFlow] Found ${rows.length} data rows.`);

    // Step 1: Use AI to get the header mapping (fast operation)
    console.log(`[parseItemsFlow] Calling AI to get header mapping...`);
    const { output: mapping } = await getMapping({ csvHeader: header });
    
    if (!mapping) {
        throw new Error("AI failed to return a header mapping.");
    }
    console.log('[parseItemsFlow] AI returned mapping:', JSON.stringify(mapping, null, 2));

    if (!mapping.itemName) {
        throw new Error("Could not determine the column for 'itemName' from the CSV header. This is a required field.");
    }

    // Step 2: Parse the data rows using the mapping (fast, non-AI operation)
    const parsedItems = rows.map(row => {
        const getVal = (field: keyof typeof mapping) => {
            const colName = mapping[field];
            return colName ? row[colName]?.trim() : undefined;
        };

        const sharedItemTypeRaw = getVal('sharedItemType')?.toLowerCase() || 'other';
        const sharedItemType: 'grocery' | 'medical' | 'liquor' | 'other' = 
            ['grocery', 'medical', 'liquor'].includes(sharedItemTypeRaw) 
            ? sharedItemTypeRaw as 'grocery' | 'medical' | 'liquor' 
            : 'other';

        const mrpRaw = getVal('mrp');
        const mrp = mrpRaw ? parseFloat(mrpRaw.replace(/[^0-9.]/g, '')) : undefined;

        const item: z.infer<typeof ParsedItemSchema> = {
            itemName: getVal('itemName') || '',
            sharedItemType,
            defaultCategory: getVal('defaultCategory') || 'Uncategorized',
            defaultUnit: getVal('defaultUnit') || 'unit',
            brand: getVal('brand'),
            mrp: mrp && !isNaN(mrp) ? mrp : undefined,
            description: getVal('description'),
            defaultImageUrl: getVal('defaultImageUrl'),
            barcode: getVal('barcode'),
        };
        return item;
    }).filter(item => item.itemName); // Filter out any empty rows

    console.log(`[parseItemsFlow] Successfully parsed ${parsedItems.length} items using hybrid approach.`);
    return { parsedItems };
  }
);
