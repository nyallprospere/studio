
'use server';

import { generateElectionPredictions } from '@/ai/flows/generate-election-predictions';
import { assessNewsImpact } from '@/ai/flows/assess-news-impact';
import { summarizeArticle as summarizeArticleFlow } from '@/ai/flows/summarize-article';
import { v4 as uuidv4 } from 'uuid';

export async function getPrediction(newsSummary: string) {
  try {
    // This function is now simplified as it doesn't fetch data from Firestore.
    // In a real application, you might fetch data here if needed.
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

export async function subscribeToMailingList(data: { firstName: string; email: string }) {
    // In a real application, this would save to a database.
    // For this example, we'll simulate a successful subscription.
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
