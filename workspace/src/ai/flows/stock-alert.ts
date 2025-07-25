
'use server';

/**
 * @fileOverview This file defines a Genkit flow for predicting low stock items and suggesting restocking.
 *
 * - checkStockLevels - A function that initiates the stock level check and alerting process.
 * - CheckStockLevelsInput - The input type for the checkStockLevels function.
 * - CheckStockLevelsOutput - The return type for the checkStockLevels function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CheckStockLevelsInputSchema = z.object({
  historicalOrderData: z
    .string()
    .describe('Historical order data in JSON format, including product names and quantities.'),
  currentStockLevels: z
    .string()
    .describe('Current stock levels in JSON format, including product names and quantities.'),
});
export type CheckStockLevelsInput = z.infer<typeof CheckStockLevelsInputSchema>;

const CheckStockLevelsOutputSchema = z.object({
  lowStockItems: z
    .array(z.string())
    .describe('List of product names that are predicted to be low in stock.'),
  restockSuggestions: z
    .string()
b/    .describe('Suggestions for restocking, including product names and quantities.'),
});
export type CheckStockLevelsOutput = z.infer<typeof CheckStockLevelsOutputSchema>;

export async function checkStockLevels(input: CheckStockLevelsInput): Promise<CheckStockLevelsOutput> {
  return checkStockLevelsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'checkStockLevelsPrompt',
  input: {schema: CheckStockLevelsInputSchema},
  output: {schema: CheckStockLevelsOutputSchema},
  prompt: `You are an AI assistant specializing in inventory management and stock prediction.

You are provided with historical order data and current stock levels. Analyze the data to predict which items are likely to run low in stock soon.

Based on the analysis, provide a list of items that need restocking and suggest the quantities to restock.

Historical Order Data: {{{historicalOrderData}}}
Current Stock Levels: {{{currentStockLevels}}}

Output the lowStockItems and restockSuggestions fields appropriately.
`,
});

const checkStockLevelsFlow = ai.defineFlow(
  {
    name: 'checkStockLevelsFlow',
    inputSchema: CheckStockLevelsInputSchema,
    outputSchema: CheckStockLevelsOutputSchema,
  },
  async input => {
    const llmResponse = await ai.generate({
      model: 'gemini-1.5-flash',
      prompt: prompt.prompt!,
      input: input,
      output: {
        schema: CheckStockLevelsOutputSchema,
      },
    });

    const output = llmResponse.output();
    if (!output) {
      throw new Error("AI model returned no output for stock level analysis.");
    }
    return output;
  }
);
