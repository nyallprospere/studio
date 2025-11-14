
'use server';

import { generateElectionPredictions } from '@/ai/flows/generate-election-predictions';
import { assessNewsImpact } from '@/ai/flows/assess-news-impact';
import { summarizeArticle as summarizeArticleFlow } from '@/ai/flows/summarize-article';
import { analyzeConstituencyOutcome as analyzeConstituencyOutcomeFlow, type AnalyzeConstituencyOutcomeInput } from '@/ai/flows/analyze-constituency-outcome';
import { analyzePastElection as analyzePastElectionFlow, type PastElectionAnalysisInput } from '@/ai/flows/analyze-past-election';
import { collection, addDoc, serverTimestamp, getFirestore, updateDoc, doc, increment } from "firebase/firestore";
import { initializeFirebase } from '@/firebase';


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

export async function analyzePastElection(input: PastElectionAnalysisInput) {
    try {
        const result = await analyzePastElectionFlow(input);
        return result;
    } catch (error) {
        console.error('Error analyzing past election:', error);
        return "Failed to generate analysis.";
    }
}

export async function subscribeToMailingList(data: { firstName: string; email: string }) {
  try {
    const { firestore } = initializeFirebase();
    const subscribersCollection = collection(firestore, 'mailing_list_subscribers');
    await addDoc(subscribersCollection, {
      ...data,
      subscribedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Mailing list subscription error:', error);
    if (error.code === 'permission-denied') {
      return { error: 'You do not have permission to perform this action.' };
    }
    return { error: 'An unexpected error occurred. Please try again.' };
  }
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

export async function trackAdClick(adId: string) {
    let locationData: { ipAddress?: string; city?: string; country?: string } = {};
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        locationData = {
            ipAddress: data.ip,
            city: data.city,
            country: data.country_name,
        };
    } catch(e) {
        console.warn("Could not fetch location data", e);
    }

    try {
        const { firestore } = initializeFirebase();
        const adClicksCollection = collection(firestore, 'ad_clicks');
        await addDoc(adClicksCollection, {
            adId,
            timestamp: serverTimestamp(),
            ...locationData
        });

        const adRef = doc(firestore, 'ads', adId);
        await updateDoc(adRef, {
            clicks: increment(1)
        });

        return { success: true };
    } catch (error) {
        console.error('Ad click tracking error:', error);
        return { success: false, error: 'Failed to track ad click.' };
    }
}
