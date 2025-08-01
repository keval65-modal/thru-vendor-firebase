
'use server';
/**
 * @fileOverview A Genkit flow to determine column mappings from a CSV sample.
 * This flow receives a small sample of a CSV file (headers and a few rows)
 * and determines how the columns in the CSV map to the target GlobalItem schema fields.
 *
 * - processCsvData - A function that handles the CSV mapping process.
 * - ProcessCsvInput - The input type for the processCsvData function.
 * - ProcessCsvOutput - The return type for the processCsvData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Describes the expected output: a mapping from our schema fields to the CSV column headers.
const CsvMappingSchema = z.object({
  itemName: z.string().describe("The name of the column in the CSV that maps to the product's name. Likely 'Name' or 'Product Name'."),
  sharedItemType: z.string().optional().describe("The column name for the high-level item type (e.g., 'grocery', 'medical'). This is likely the 'Category' column."),
  defaultCategory: z.string().describe("The column name for the specific item category. This is likely the 'SubCategory' column, or 'Category' if SubCategory is not present."),
  defaultUnit: z.string().optional().describe("The column name for the unit of measurement. Likely 'Quantity' or 'Unit'."),
  brand: z.string().optional().describe("The column name for the product's brand. Likely 'Brand'."),
  mrp: z.string().optional().describe("The column name for the Maximum Retail Price. This should be the original, non-discounted price column, likely 'Price'."),
  price: z.string().optional().describe("The column name for the actual selling price. This is likely the 'DiscountedPrice' or 'Selling Price' column."),
  description: z.string().optional().describe("The column name for the product's description. Likely 'Description'."),
  barcode: z.string().optional().describe("The column name for the product's barcode or UPC."),
});


const ProcessCsvInputSchema = z.object({
  csvSample: z.string().describe("A string containing the comma-separated header row of a CSV file, used to determine column mappings."),
});
export type ProcessCsvInput = z.infer<typeof ProcessCsvInputSchema>;

const ProcessCsvOutputSchema = z.object({
  mappings: CsvMappingSchema.describe('An object where keys are our target schema fields and values are the corresponding column names from the CSV header.'),
});
export type ProcessCsvOutput = z.infer<typeof ProcessCsvOutputSchema>;


export async function processCsvData(input: ProcessCsvInput): Promise<ProcessCsvOutput> {
  return processCsvFlow(input);
}


const prompt = ai.definePrompt({
    name: 'processCsvPrompt',
    input: { schema: ProcessCsvInputSchema },
    output: { schema: ProcessCsvOutputSchema },
    prompt: `You are an expert data mapping AI. You will be given a string of comma-separated column headers from a CSV file.
    Your task is to analyze the headers and determine which column header corresponds to each field in our target schema.

    Our target schema fields are:
    - itemName: The name of the product.
    - sharedItemType: The general type like 'grocery' or 'medical'. Use the 'Category' column.
    - defaultCategory: The specific category. Use 'SubCategory' if available, otherwise use 'Category'.
    - defaultUnit: The unit of sale (e.g., '500 gm'). Use 'Quantity' or similar.
    - brand: The brand of the product.
    - mrp: The Maximum Retail Price (original price). Map this from a column named 'Price' or similar.
    - price: The actual selling price. Map this from a column named 'DiscountedPrice' or similar.
    - description: A description of the product.
    - barcode: The product's barcode.

    Your output MUST be a valid JSON object that conforms to the specified schema, and nothing else. Do not include any extra text, explanations, or markdown formatting like \`\`\`json.

    Here are the CSV headers:
    ---
    {{{csvSample}}}
    ---
    `,
});


const processCsvFlow = ai.defineFlow(
  {
    name: 'processCsvFlow',
    inputSchema: ProcessCsvInputSchema,
    outputSchema: ProcessCsvOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output || !output.mappings) {
      throw new Error("AI could not determine column mappings from the provided CSV sample.");
    }
    
    console.log(`[processCsvFlow] Successfully determined column mappings:`, output.mappings);
    return output;
  }
);
