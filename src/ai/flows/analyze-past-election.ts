'use server';

/**
 * @fileOverview A flow to analyze a past election's results.
 * 
 * - analyzePastElection - A function that takes election data and returns a concise analysis.
 * - PastElectionAnalysisInput - The input type for the analyzePastElection function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PastElectionAnalysisInputSchema = z.object({
    electionYear: z.string().describe('The year of the election.'),
    electionName: z.string().describe('The name of the election.'),
    results: z.string().describe('A JSON string of the overall election results summary (seats, vote percentages).'),
    constituencyResults: z.string().describe('A JSON string of the results for each constituency.'),
});

export type PastElectionAnalysisInput = z.infer<typeof PastElectionAnalysisInputSchema>;

export async function analyzePastElection(input: PastElectionAnalysisInput): Promise<string> {
    return analyzePastElectionFlow(input);
}

const analyzePastElectionFlow = ai.defineFlow(
  {
    name: 'analyzePastElectionFlow',
    inputSchema: PastElectionAnalysisInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const llmResponse = await ai.generate({
        prompt: `You are a St. Lucian political analyst. Provide a concise analysis (max 200 words) of the ${input.electionName}.

        Key Data:
        - Overall Results: ${input.results}
        - Constituency Breakdown: ${input.constituencyResults}

        Your analysis should touch upon:
        1. The final seat count and what it meant for the winning party (e.g., narrow majority, landslide).
        2. The popular vote split and any significant differences from the seat distribution.
        3. Mention any particularly surprising constituency flips or key races that defined the election's narrative.
        4. Briefly note any major national trends or factors that influenced this outcome (e.g., economic conditions, major scandals, campaign messaging).
        
        Keep it brief, insightful, and focused on the provided data.`,
    });

    return llmResponse.text;
  }
);
