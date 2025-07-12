
'use server';
/**
 * @fileOverview A Genkit flow to parse raw CSV text into structured GlobalItem data.
 * This flow sends the raw CSV data to the model and asks it to perform the parsing,
 * leveraging the model's ability to understand various data layouts and formats.
 *
 * - processCsvData - A function that handles the CSV processing.
 * - ProcessCsvInput - The input type for the processCsvData function.
 * - ProcessCsvOutput - The return type for the processCsvData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ParsedItemSchema = z.object({
  itemName: z.string().describe("The name of the product."),
  sharedItemType: z.enum(['grocery', 'medical', 'liquor', 'other']).describe("The high-level type of the item (grocery, medical, liquor, other). If not specified, infer or default to 'other'."),
  defaultCategory: z.string().describe("A specific category for the item (e.g., 'Dairy', 'Pain Relief', 'Dry Fruits'). If a sub-category is present, use it. Otherwise, use the main category."),
  defaultUnit: z.string().describe("The unit of measurement or sale (e.g., '1kg', 'bottle', 'packet', '500 gm'). Default to 'unit' if not specified."),
  brand: z.string().optional().describe("The brand name of the product."),
  mrp: z.number().optional().describe("The Maximum Retail Price of the product. Extract numeric values from price columns."),
  defaultImageUrl: z.string().url().optional().describe("A URL for the product's image."),
  description: z.string().optional().describe("A brief description of the product."),
  barcode: z.string().optional().describe("The barcode or UPC of the product."),
});

const ProcessCsvInputSchema = z.object({
  csvData: z.string().describe("A string containing comma-separated values (CSV) of items to be parsed. The string includes the header row."),
});
export type ProcessCsvInput = z.infer<typeof ProcessCsvInputSchema>;

const ProcessCsvOutputSchema = z.object({
  parsedItems: z.array(ParsedItemSchema).describe('An array of structured item objects parsed from the CSV.'),
});
export type ProcessCsvOutput = z.infer<typeof ProcessCsvOutputSchema>;


export async function processCsvData(input: ProcessCsvInput): Promise<ProcessCsvOutput> {
  return processCsvFlow(input);
}


const processCsvFlow = ai.defineFlow(
  {
    name: 'processCsvFlow',
    inputSchema: ProcessCsvInputSchema,
    outputSchema: ProcessCsvOutputSchema,
  },
  async (input) => {
    console.log(`[processCsvFlow] Started: Processing CSV data with AI.`);
    
    if (!input.csvData || input.csvData.trim().length === 0) {
        console.warn("[processCsvFlow] Input CSV data is empty.");
        return { parsedItems: [] };
    }

    const prompt = `You are an expert data parsing AI. You will be given a string of raw CSV data.
    Your task is to analyze the data, identify the columns that correspond to our target schema, and extract the information for each row.

    Our target schema for each item is:
    - itemName: The name of the product. This is a required field.
    - sharedItemType: Must be one of 'grocery', 'medical', 'liquor', or 'other'. Infer this from a 'category' or 'type' column. If no clear mapping exists, default to 'other'.
    - defaultCategory: The specific sub-category of the item (e.g., 'Dairy', 'Pain Relief'). If a 'SubCategory' or similar column exists, use it. Otherwise, use the main category.
    - defaultUnit: The unit of sale (e.g., 'kg', 'bottle'). If not specified, default to 'unit'.
    - brand: The brand of the product.
    - mrp: The price of the product. It should be a number.
    - description: A description of the product.
    - defaultImageUrl: A URL for an image of the product.
    - barcode: The product's barcode.

    Carefully parse the provided CSV data below and return a JSON object containing a key "parsedItems", which is an array of objects matching our target schema. Filter out any rows that do not have an item name.

    Here is the CSV data:
    ---
    ${input.csvData}
    ---
    `;

    try {
        const { output } = await ai.generate({
            model: 'googleai/gemini-1.5-flash-latest',
            prompt: prompt,
            output: {
                schema: ProcessCsvOutputSchema,
            },
        });
        
        if (!output || !output.parsedItems) {
            console.error("[processCsvFlow] AI parsing failed to return valid items.");
            return { parsedItems: [] };
        }
        
        console.log(`[processCsvFlow] Successfully parsed ${output.parsedItems.length} items.`);
        return output;

    } catch (error) {
        console.error("[processCsvFlow] An error occurred during AI processing:", error);
        throw new Error("The AI failed to process the CSV data. Please ensure the format is correct and try again.");
    }
  }
);
