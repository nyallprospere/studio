
'use server';

import { generateElectionPredictions } from '@/ai/flows/generate-election-predictions';
import { assessNewsImpact } from '@/ai/flows/assess-news-impact';
import { summarizeArticle as summarizeArticleFlow } from '@/ai/flows/summarize-article';
import { analyzeConstituencyOutcome as analyzeConstituencyOutcomeFlow, type AnalyzeConstituencyOutcomeInput, type AnalyzeConstituencyOutcomeOutput } from '@/ai/flows/analyze-constituency-outcome';


export async function getPrediction(newsSummary: string) {
  try {
    const initialPrediction = {
        summary: 'SLP projected to win a majority.',
        detailedPredictions: 'SLP wins 12 seats, UWP wins 5 seats.',
        confidenceLevel: 'Medium'
    };

    const impactAssessment = await assessNewsImpact({
      newsSummary: newsSummary,
      currentPrediction: initialPrediction.summary,
    });

    return {
      initialPrediction: initialPrediction,
      impactAssessment: impactAssessment,
    };
  } catch (error) {
    console.error('Error getting prediction:', error);
    return {
        error: "An error occurred while generating the prediction. Please try again."
    };
  }
}

export async function analyzeConstituencyOutcome(input: AnalyzeConstituencyOutcomeInput) {
    try {
        const result = await analyzeConstituencyOutcomeFlow(input);
        return result;
    } catch (error) {
        console.error('Error analyzing constituency outcome:', error);
        return {
            error: "An error occurred while analyzing the constituency. Please try again."
        };
    }
}

export async function subscribeToMailingList(data: { firstName: string; email: string }) {
    console.log('Subscribing:', data);
    return { success: true };
}

export async function summarizeArticle(content: string): Promise<string> {
    try {
        const summary = await summarizeArticleFlow(content);
        return summary;
    } catch (e) {
        console.error("Error summarizing article:", e);
        return "Could not generate summary.";
    }
}
