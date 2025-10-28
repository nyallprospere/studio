
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

  Analyze the provided data:
  - Historical Results for {{constituencyName}}: {{historicalData}}
  - Candidate Information: {{candidateInfo}}
  - National Swing Data: {{nationalSwingData}}
  - Regional Constituency Data: {{regionalConstituencyData}}
  - Recent Polling: {{pollingData}}

  Follow these steps for your analysis:

  1.  **Calculate Volatility Index**:
      - For {{constituencyName}}, calculate the absolute change in the margin of victory between each consecutive election from the historical data.
      - The Volatility Index is the average of these absolute changes. A high index means the seat is prone to large swings.

  2.  **Assess Regional Trends**:
      - Review the results from the other constituencies in the region provided in \`regionalConstituencyData\`.
      - Determine if there was a consistent voting pattern or swing in the region in the last election. Note if {{constituencyName}} typically follows or diverges from this regional trend.

  3.  **Compare Constituency vs. National Swing**:
      - Using the \`nationalSwingData\` and the constituency's historical results, compare the constituency's swing to the national swing in the last couple of elections.
      - Did {{constituencyName}} swing more or less than the national average? Did it swing in the opposite direction? This indicates how sensitive it is to national moods.

  4.  **Factor in Critical St. Lucian Political Dynamics**:
      - **Incumbency Advantage/Disadvantage**: There is a general trend of declining support for incumbents. The negative effect of being the incumbent *party* in government is significantly stronger than that of an individual incumbent candidate. Factor this in accordingly.
      - **Comeback Candidates**: Note when a former incumbent is running to reclaim their seat and assess their chances based on past performance and current context.
      - **Party Leader Impact**: The public perception of party leaders is very influential. Specifically, consider that a significant portion of the St. Lucian electorate holds a negative opinion of Allen Chastanet, which generally has a detrimental effect on the UWP's performance.
      - **Candidate Specific Factors (Micoud North Case Study)**: For Micoud North, it's known that the UWP candidate in 2021 was highly unpopular. The current UWP candidate, Jeremiah, has much higher approval ratings. When analyzing the 2021 swing for this constituency, you must account for this anomaly. A significant portion of the negative swing against the UWP was due to the specific candidate, not just a party-level trend. Therefore, you should moderate the expected swing *against* the UWP for the upcoming election, as the new candidate is not burdened by the same negative perception.

  5.  **Synthesize and Predict**:
      - Based on all the factors above (Volatility, Regional Trends, Swing Analysis, Political Dynamics, and Candidate Info), formulate your prediction.
      - Your analysis must explicitly mention the calculated volatility index and how it, along with regional and national swing comparisons, influenced your decision.

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

