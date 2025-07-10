
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
  defaultCategory: z.string().describe("A specific category for the item (e.g., 'Dairy', 'Pain Relief')."),
  defaultUnit: z.string().describe("The unit of measurement or sale (e.g., '1kg', 'bottle', 'packet')."),
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

The first row of the CSV is the header row. The expected headers are:
itemName,sharedItemType,defaultCategory,defaultUnit,brand,mrp,defaultImageUrl,description,barcode

- You must handle cases where some optional fields (like brand, mrp, defaultImageUrl, description, barcode) might be empty.
- The 'sharedItemType' MUST be one of the following values: 'grocery', 'medical', 'liquor', 'other'. If you encounter a different value, map it to 'other'.
- The 'mrp' field should be parsed as a number. If it is empty or invalid, omit it from the output for that item.
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
    console.log(`[parseItemsFlow] Starting CSV parsing. Input length: ${input.csvData.length}`);
    try {
      const { output } = await prompt(input);
      if (!output) {
        console.error("[parseItemsFlow] The AI model did not return any output.");
        throw new Error("AI model returned no output for CSV parsing.");
      }
      console.log(`[parseItemsFlow] Successfully parsed ${output.parsedItems.length} items from CSV.`);
      return output;
    } catch (error) {
      console.error(`[parseItemsFlow] Error during Genkit prompt execution:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI processing.";
      throw new Error(`AI processing error: ${errorMessage}`);
    }
  }
);
