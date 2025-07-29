
'use server';
/**
 * @fileOverview A Genkit flow to extract structured menu data from a PDF data URI.
 *
 * - extractMenuData - A function that handles the menu extraction process.
 * - ExtractMenuInput - The input type for the extractMenuData function.
 * - ExtractMenuOutput - The return type for the extractMenuData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const MenuItemSchema = z.object({
  category: z.string().describe('The category of the menu item (e.g., Appetizers, Main Courses, Desserts).'),
  itemName: z.string().describe('The name of the menu item.'),
  price: z.string().describe('The price of the menu item (as a string, e.g., "$10.99", "£8.50").'),
  description: z.string().optional().describe('A brief description of the menu item, if available.'),
});

const ExtractMenuInputSchema = z.object({
  menuDataUri: z
    .string()
    .describe(
      "The menu document (typically a PDF) as a data URI. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
  vendorId: z.string().describe('The ID of the vendor uploading the menu.'),
});
export type ExtractMenuInput = z.infer<typeof ExtractMenuInputSchema>;

const ExtractMenuOutputSchema = z.object({
 extractedItems: z.array(MenuItemSchema).describe('An array of extracted menu items.'),
 rawText: z.string().optional().describe('Raw text extracted if structured parsing fails or as supplementary info.')
});
export type ExtractMenuOutput = z.infer<typeof ExtractMenuOutputSchema>;

export async function extractMenuData(input: ExtractMenuInput): Promise<ExtractMenuOutput> {
  return extractMenuFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractMenuPrompt',
  input: {schema: ExtractMenuInputSchema},
  output: {schema: ExtractMenuOutputSchema},
  prompt: `You are an expert menu parsing AI. You are given a document, which is a restaurant menu, provided as a data URI.
Your task is to meticulously analyze this menu and extract all food and beverage items.

For each item, identify:
1.  Its category (e.g., "Appetizers", "Soups", "Main Courses", "Desserts", "Beverages"). If items are not explicitly categorized, infer logical categories based on common menu structures.
2.  The name of the item.
3.  The price of the item. Ensure you capture the currency symbol if present.
4.  A brief description of the item, if one is provided on the menu.

Structure your output as a JSON object containing a key "extractedItems". The value of "extractedItems" should be an array of objects, where each object represents a menu item and has the following fields: "category", "itemName", "price", and an optional "description".

If you also extract raw text from the document that might be useful context, provide it in the "rawText" field.

Menu Document:
{{media url=menuDataUri}}
`,
});

const extractMenuFlow = ai.defineFlow(
  {
    name: 'extractMenuFlow',
    inputSchema: ExtractMenuInputSchema,
    outputSchema: ExtractMenuOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      console.error("[extractMenuFlow] The AI model did not return any output.");
      throw new Error("AI model returned no output for menu extraction.");
    }
    if (!output.extractedItems) {
      console.warn("[extractMenuFlow] AI model output is missing 'extractedItems'. Output:", JSON.stringify(output));
      return { extractedItems: [], rawText: output.rawText || "AI output was present but no 'extractedItems' array found." };
    }
    console.log(`[extractMenuFlow] Successfully extracted ${output.extractedItems.length} items for vendor: ${input.vendorId}`);
    return output;
  }
);
