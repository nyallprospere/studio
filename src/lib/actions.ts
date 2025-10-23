
'use server';

import { generateElectionPredictions } from '@/ai/flows/generate-election-predictions';
import { assessNewsImpact } from '@/ai/flows/assess-news-impact';
import { summarizeArticle as summarizeArticleFlow } from '@/ai/flows/summarize-article';
import { getFirebaseAdmin } from '@/firebase/server';
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { headers } from 'next/headers';
import type { UserMap } from './types';


async function getCollectionData(collectionName: string) {
    const { firestore } = getFirebaseAdmin();
    const collRef = collection(firestore, collectionName);
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getLatestHistoricalResult() {
    const { firestore } = getFirebaseAdmin();
    const resultsRef = collection(firestore, 'election_results');
    const q = query(resultsRef, orderBy('year', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}


export async function getPrediction(newsSummary: string) {
  try {
    const pollsData = await getCollectionData('polling_data');
    const latestHistoricalResult = await getLatestHistoricalResult();

    // Step 1: Generate a baseline prediction
    const initialPrediction = await generateElectionPredictions({
      pollingData: JSON.stringify(pollsData),
      historicalData: JSON.stringify(latestHistoricalResult),
      recentEvents: 'Standard political climate, no major recent events before this news.',
    });

    if (!initialPrediction.summary) {
        throw new Error('Failed to get initial prediction');
    }

    // Step 2: Assess the impact of the new event
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
    // It's better to return a structured error than to throw
    return {
        error: "An error occurred while generating the prediction. Please try again."
    };
  }
}

export async function saveUserMap(mapData: UserMap['mapData']) {
    try {
        const { firestore } = getFirebaseAdmin();
        const headersList = headers();
        const ip = headersList.get('x-forwarded-for') || 'unknown';
        const city = headersList.get('x-vercel-ip-city') || 'unknown';
        const country = headersList.get('x-vercel-ip-country') || 'unknown';

        const docRef = await addDoc(collection(firestore, 'user_maps'), {
            mapData,
            createdAt: serverTimestamp(),
            ipAddress: ip,
            city,
            country,
        });

        return { id: docRef.id };
    } catch (e) {
        console.error('Error saving map:', e);
        return { error: 'Could not save your map. Please try again.' };
    }
}

export async function subscribeToMailingList(data: { firstName: string; email: string }) {
    const { firestore } = getFirebaseAdmin();
    const subscribersCollection = collection(firestore, 'mailing_list_subscribers');
    
    try {
        // Check if email already exists
        const q = query(subscribersCollection, where("email", "==", data.email));
        const existingSubscriber = await getDocs(q);
        if (!existingSubscriber.empty) {
            return { error: "This email is already subscribed." };
        }

        const dataToSave = {
            ...data,
            subscribedAt: serverTimestamp(),
        };

        await addDoc(subscribersCollection, dataToSave);
        return { success: true };
    } catch (e: any) {
        console.error('Error subscribing to mailing list:', e);

        // This is a server action, so we can't use the client-side errorEmitter.
        // We will simulate the error message that the client-side architecture would create.
        if (e.code === 'permission-denied') {
             const errorMessage = `Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
{
  "auth": null,
  "method": "create",
  "path": "/databases/(default)/documents/mailing_list_subscribers"
}`;
            return { error: errorMessage }
        }

        return { error: 'Could not subscribe. Please try again.' };
    }
}

export async function summarizeArticle(content: string) {
    try {
        const result = await summarizeArticleFlow(content);
        // The flow now returns a string, so we can pass it directly.
        return { summary: result };
    } catch (e) {
        console.error("Error summarizing article:", e);
        return { error: "Could not generate summary." };
    }
}
