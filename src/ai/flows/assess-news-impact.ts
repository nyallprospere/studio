'use server';

/**
 * @fileOverview A flow to assess the impact of recent news on election predictions.
 *
 * - assessNewsImpact - A function that assesses the impact of news on election predictions.
 * - AssessNewsImpactInput - The input type for the assessNewsImpact function.
 * - AssessNewsImpactOutput - The return type for the assessNewsImpact function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessNewsImpactInputSchema = z.object({
  newsSummary: z
    .string()
    .describe('A summary of recent news or events related to the election.'),
  currentPrediction: z
    .string()
    .describe('The current election prediction (e.g., party likely to win).'),
});

export type AssessNewsImpactInput = z.infer<typeof AssessNewsImpactInputSchema>;

const AssessNewsImpactOutputSchema = z.object({
  impactAssessment: z
    .string()
    .describe(
      'An assessment of how the news is likely to impact the election prediction. Include a confidence level (high, medium, low) in the assessment.'
    ),
  revisedPrediction: z
    .string()
    .describe('A revised election prediction, if the news warrants a change.'),
});

export type AssessNewsImpactOutput = z.infer<typeof AssessNewsImpactOutputSchema>;

export async function assessNewsImpact(input: AssessNewsImpactInput): Promise<AssessNewsImpactOutput> {
  return assessNewsImpactFlow(input);
}

const assessNewsImpactPrompt = ai.definePrompt({
  name: 'assessNewsImpactPrompt',
  input: {schema: AssessNewsImpactInputSchema},
  output: {schema: AssessNewsImpactOutputSchema},
  prompt: `You are a seasoned political analyst assessing the impact of recent news on election predictions.

  Here's a summary of recent news or events:
  {{newsSummary}}

  The current election prediction is:
  {{currentPrediction}}

  Analyze the news and provide an assessment of its likely impact on the election prediction. Include a confidence level (high, medium, low) in your assessment.

  Based on your analysis, revise the election prediction if necessary. If the news does not warrant a change, state that the prediction remains unchanged.
  Return the impact assessment and the revised prediction in the format specified in the output schema. Adhere to the schema descriptions.
  Remember to be as brief as possible and to not include any preamble or filler text.
  `,
});

const assessNewsImpactFlow = ai.defineFlow(
  {
    name: 'assessNewsImpactFlow',
    inputSchema: AssessNewsImpactInputSchema,
    outputSchema: AssessNewsImpactOutputSchema,
  },
  async input => {
    const {output} = await assessNewsImpactPrompt(input);
    return output!;
  }
);
