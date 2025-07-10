
'use server';
/**
 * @fileOverview A Genkit flow to parse raw CSV text into structured GlobalItem data.
 *
 * - parseCsvData - A function that handles the CSV parsing process.
 * - ParseCsvInput - The input type for the parseCsvData function.
 * - ParseCsvOutput - The return type for the parseCsvData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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

const prompt = ai.definePrompt({
  name: 'parseItemsPrompt',
  input: { schema: ParseCsvInputSchema },
  output: { schema: ParseCsvOutputSchema },
  prompt: `You are an expert data processing AI. You will be given a string of comma-separated values (CSV).
Your task is to parse this CSV data and convert it into a structured JSON array of objects.

The first row of the CSV is the header row. The headers might be different from the target schema.
You must intelligently map the source columns to the target schema fields. Here are the mapping rules:
- 'Name' or 'itemName' should be mapped to 'itemName'.
- 'Brand' or 'brand' should be mapped to 'brand'.
- 'Price' or 'mrp' should be mapped to 'mrp'. Ensure it is a number.
- 'Category' (the main one) should be mapped to 'sharedItemType'. It MUST be one of 'grocery', 'medical', 'liquor', 'other'. If you see something else like 'Electronics', map it to 'other'.
- 'SubCategory' or 'defaultCategory' should be mapped to 'defaultCategory'. If it contains slashes or arrows (e.g., 'Grocery/Dry Fruits'), use the last part ('Dry Fruits').
- 'Quantity' or 'defaultUnit' should be mapped to 'defaultUnit'. Extract the unit part (e.g., from '500 gm', use '500 gm').
- 'Description' or 'description' should be mapped to 'description'.
- 'defaultImageUrl' and 'barcode' should be mapped if present.

- You must handle cases where some optional fields (like brand, defaultImageUrl, description, barcode) might be empty.
- Clean up any leading/trailing whitespace from the values.
- If a row is malformed or empty, skip it.

Here is the CSV data to process:
{{{csvData}}}

Return the result in the 'parsedItems' array.
`,
});

const parseItemsFlow = ai.defineFlow(
  {
    name: 'parseItemsFlow',
    inputSchema: ParseCsvInputSchema,
    outputSchema: ParseCsvOutputSchema,
  },
  async (input) => {
    console.log(`DEBUG: [parseItemsFlow] ----------------- FLOW STARTED -----------------`);
    console.log(`DEBUG: [parseItemsFlow] Starting CSV parsing. Input length: ${input.csvData.length}`);
    try {
      console.log(`DEBUG: [parseItemsFlow] Calling the AI prompt...`);
      const response = await prompt.generate(input);
      const output = response.output();
      
      console.log(`DEBUG: [parseItemsFlow] Raw AI output received:`, JSON.stringify(output, null, 2));

      if (!output) {
        console.error("DEBUG: [parseItemsFlow] The AI model did not return any output.");
        throw new Error("AI model returned no output for CSV parsing.");
      }
      if (!output.parsedItems) {
        console.warn("DEBUG: [parseItemsFlow] AI output is missing 'parsedItems'.");
         // Return a valid empty structure if items are missing
        return { parsedItems: [] };
      }
      
      console.log(`DEBUG: [parseItemsFlow] Successfully parsed ${output.parsedItems.length} items from CSV.`);
      console.log(`DEBUG: [parseItemsFlow] ----------------- FLOW FINISHED -----------------`);
      return output;

    } catch (error) {
      console.error(`DEBUG: [parseItemsFlow] CRITICAL ERROR during Genkit prompt execution:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI processing.";
      throw new Error(`AI processing error: ${errorMessage}`);
    }
  }
);
