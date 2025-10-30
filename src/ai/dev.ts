import { config } from 'dotenv';
config();

import '@/ai/flows/assess-news-impact.ts';
import '@/ai/flows/generate-election-predictions.ts';
import '@/ai/flows/summarize-article.ts';
import '@/ai/flows/analyze-constituency-outcome.ts';
import '@/ai/flows/analyze-past-election.ts';
import '@/ai/flows/calculate-volatility-index.ts';

    
