'use server';

import { checkStockLevels, type CheckStockLevelsInput, type CheckStockLevelsOutput } from '@/ai/flows/stock-alert';
import { z } from 'zod';

const StockAlertFormSchema = z.object({
  historicalOrderData: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    { message: 'Historical order data must be valid JSON.' }
  ),
  currentStockLevels: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    { message: 'Current stock levels must be valid JSON.' }
  ),
});

export type StockAlertFormState = {
  result?: CheckStockLevelsOutput;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

export async function handleCheckStockLevels(
  prevState: StockAlertFormState,
  formData: FormData
): Promise<StockAlertFormState> {
  const rawFormData = {
    historicalOrderData: formData.get('historicalOrderData'),
    currentStockLevels: formData.get('currentStockLevels'),
  };

  const validatedFields = StockAlertFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      error: 'Invalid form data. Please check the JSON inputs.',
      fields: {
        historicalOrderData: validatedFields.error.flatten().fieldErrors.historicalOrderData?.[0] ?? '',
        currentStockLevels: validatedFields.error.flatten().fieldErrors.currentStockLevels?.[0] ?? '',
      }
    };
  }

  const inputData: CheckStockLevelsInput = {
    historicalOrderData: validatedFields.data.historicalOrderData,
    currentStockLevels: validatedFields.data.currentStockLevels,
  };

  try {
    const result = await checkStockLevels(inputData);
    return { result, message: 'Stock levels analyzed successfully.' };
  } catch (error) {
    console.error('Error in handleCheckStockLevels:', error);
    return { error: 'Failed to analyze stock levels. Please try again.' };
  }
}
