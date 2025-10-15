'use server';

/**
 * @fileOverview Election prediction flow using Genkit.
 *
 * - generateElectionPredictions - A function that generates election predictions based on input data.
 * - GenerateElectionPredictionsInput - The input type for the generateElectionPredictions function.
 * - GenerateElectionPredictionsOutput - The output type for the generateElectionPredictions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateElectionPredictionsInputSchema = z.object({
  pollingData: z.string().describe('Current polling data as a JSON string.'),
  historicalData: z.string().describe('Historical election results data as a JSON string.'),
  recentEvents: z.string().describe('Recent news and events that might impact the election.'),
});
export type GenerateElectionPredictionsInput = z.infer<typeof GenerateElectionPredictionsInputSchema>;

const GenerateElectionPredictionsOutputSchema = z.object({
  summary: z.string().describe('A summary of the election predictions.'),
  detailedPredictions: z.string().describe('Detailed predictions for each constituency.'),
  confidenceLevel: z.string().describe('The confidence level of the predictions (e.g., High, Medium, Low).'),
});
export type GenerateElectionPredictionsOutput = z.infer<typeof GenerateElectionPredictionsOutputSchema>;

export async function generateElectionPredictions(input: GenerateElectionPredictionsInput): Promise<GenerateElectionPredictionsOutput> {
  return generateElectionPredictionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateElectionPredictionsPrompt',
  input: {schema: GenerateElectionPredictionsInputSchema},
  output: {schema: GenerateElectionPredictionsOutputSchema},
  prompt: `You are a seasoned political analyst tasked with predicting the outcome of the upcoming St. Lucia General Elections in 2026.

  Based on the following information, provide a summary of the overall election predictions, detailed predictions for each constituency, and the confidence level of your predictions.

  Current Polling Data:
  {{pollingData}}

  Historical Election Results Data:
  {{historicalData}}

  Recent News and Events:
  {{recentEvents}}

  Format your response as a JSON object:
  {
    "summary": "",
    "detailedPredictions": "",
    "confidenceLevel": ""
  }`,
});

const generateElectionPredictionsFlow = ai.defineFlow(
  {
    name: 'generateElectionPredictionsFlow',
    inputSchema: GenerateElectionPredictionsInputSchema,
    outputSchema: GenerateElectionPredictionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
