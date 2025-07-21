import { config } from 'dotenv';
config({ path: `.env` });

import '@/ai/flows/stock-alert.ts';
import '@/ai/flows/extract-menu-flow.ts';
import '@/ai/flows/process-csv-flow.ts';
