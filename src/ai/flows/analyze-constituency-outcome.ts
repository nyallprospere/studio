
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
  nationalSwingData: z.string().describe('National popular vote swing data for past elections as a JSON string.'),
  regionalConstituencyData: z.string().describe('Historical results for other constituencies in the same region as a JSON string.'),
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
  prompt: `You are an expert St. Lucian political analyst. Your task is to predict the outcome for the {{constituencyName}} constituency in the {{electionYear}} election.

  Analyze the provided data to make your prediction:
  - Historical Results for {{constituencyName}}: {{historicalData}}
  - Candidate Information: {{candidateInfo}}
  - National Swing Data: {{nationalSwingData}}
  - Regional Constituency Data: {{regionalConstituencyData}}
  - Recent Polling: {{pollingData}}

  Consider the following factors in your analysis:
  1.  **Historical Volatility**: How much has the vote swung in this constituency in the past? Is it a stable seat or prone to large changes?
  2.  **Regional & National Trends**: Does this constituency tend to vote with its region or follow the national mood? How does its swing compare to the national average?
  3.  **Critical St. Lucian Political Dynamics**:
      - **Incumbency**: There's often a disadvantage for the incumbent *party* in government. Consider this alongside the individual candidate's incumbency status.
      - **Comeback Candidates**: Assess the chances of any former incumbents attempting to reclaim their seat.
      - **Party Leader Impact**: The negative public perception of UWP leader Allen Chastanet can impact the party's performance.
      - **Candidate Specific Factors**: Acknowledge anomalies. For example, in Micoud North for the 2021 election, the specific UWP candidate was highly unpopular. The current candidate, Jeremiah, is viewed more favorably, so you should moderate the expected swing *against* the UWP accordingly, as the new candidate isn't burdened by the same negative perception.

  Synthesize these factors to formulate your prediction. Your analysis should be concise and explain the key reasons for your conclusion.

  Provide the following output:
  1.  **predictedWinner**: The acronym of the party you predict will win (SLP, UWP, or IND).
  2.  **confidenceLevel**: Your confidence in this prediction (High, Medium, or Low).
  3.  **analysis**: A concise explanation for your prediction, citing the data and the specific factors you analyzed.
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
