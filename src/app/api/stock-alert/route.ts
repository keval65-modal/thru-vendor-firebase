// /src/app/api/stock-alert/route.ts
import { z } from 'zod';

const stockSchema = z.object({
  data: z.object({
    stock: z.any(), // Keeping this flexible as per original suggestion
  }),
});

export async function POST(req: Request) {
  try {
    const reqBody = await req.json();
    
    // Validate the request body against the schema
    const validated = stockSchema.parse(reqBody);

    const stock = validated.data.stock;

    // Your logic here using `stock`
    console.log('Received stock data via API route:', stock);

    // Return a success response
    return new Response(JSON.stringify({ success: true, message: "Stock data received." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Handle validation errors or other server errors
    console.error('Error in stock-alert API route:', err);
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request payload.', details: err.errors }), {
        status: 400, // Bad Request
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
      status: 500, // Internal Server Error
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
