
'use server';

/**
 * @fileOverview A flow to analyze and predict the outcome of a specific constituency.
 *
 * - analyzeConstituencyOutcome - A function that predicts the winner of a constituency.
 * - AnalyzeConstituencyOutcomeInput - The input type for the analyzeConstituencyOutcome function.
 * - AnalyzeConstituencyOutcomeOutput - The return type for the analyzeConstituencyOutcome function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeConstituencyOutcomeInputSchema = z.object({
  constituencyName: z.string().describe('The name of the constituency to analyze.'),
  electionYear: z.string().describe('The year of the election.'),
  historicalData: z.string().describe('Historical election results for the constituency as a JSON string.'),
  pollingData: z.string().describe('Recent polling data for the constituency as a JSON string.'),
  candidateInfo: z.string().describe('Information about the candidates running in the constituency as a JSON string.'),
});

export type AnalyzeConstituencyOutcomeInput = z.infer<typeof AnalyzeConstituencyOutcomeInputSchema>;

const AnalyzeConstituencyOutcomeOutputSchema = z.object({
  predictedWinner: z
    .string()
    .describe(
      'The predicted winning party acronym (e.g., "SLP", "UWP", "IND").'
    ),
  confidenceLevel: z
    .string()
    .describe('The confidence level of the prediction (High, Medium, or Low).'),
  analysis: z
    .string()
    .describe(
      'A detailed analysis explaining the prediction, including factors considered.'
    ),
  predictedMargin: z.number().describe('The predicted percentage point margin of victory.'),
});

export type AnalyzeConstituencyOutcomeOutput = z.infer<typeof AnalyzeConstituencyOutcomeOutputSchema>;

export async function analyzeConstituencyOutcome(input: AnalyzeConstituencyOutcomeInput): Promise<AnalyzeConstituencyOutcomeOutput> {
  return analyzeConstituencyOutcomeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeConstituencyOutcomePrompt',
  input: {schema: AnalyzeConstituencyOutcomeInputSchema},
  output: {schema: AnalyzeConstituencyOutcomeOutputSchema},
  prompt: `You are a St. Lucian political analyst. Your task is to predict the outcome for the {{constituencyName}} constituency in the {{electionYear}} election.

  Analyze the provided data:
  - Historical Results: {{historicalData}}
  - Recent Polling: {{pollingData}}
  - Candidate Information: {{candidateInfo}}
  
  Based on your analysis, provide the following:
  1.  **predictedWinner**: The acronym of the party you predict will win (SLP, UWP, or IND).
  2.  **confidenceLevel**: Your confidence in this prediction (High, Medium, or Low).
  3.  **analysis**: A concise explanation for your prediction, citing the data provided. Mention key factors like incumbency, historical swing, or candidate popularity.
  4.  **predictedMargin**: Your predicted margin of victory in percentage points.`,
});

const analyzeConstituencyOutcomeFlow = ai.defineFlow(
  {
    name: 'analyzeConstituencyOutcomeFlow',
    inputSchema: AnalyzeConstituencyOutcomeInputSchema,
    outputSchema: AnalyzeConstituencyOutcomeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
