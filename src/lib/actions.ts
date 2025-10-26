
'use server';

import { generateElectionPredictions } from '@/ai/flows/generate-election-predictions';
import { assessNewsImpact } from '@/ai/flows/assess-news-impact';
import { summarizeArticle as summarizeArticleFlow } from '@/ai/flows/summarize-article';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { collection, getDocs, query, orderBy, limit, addDoc, where } from 'firebase/firestore';
import type { UserMap } from './types';
import { firebaseConfig } from '@/firebase/config';


function getFirebaseAdmin(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    // In a server environment, you can use service account credentials
    // For simplicity here, we'll rely on ADC or previously set credentials
    // Make sure your server environment is authenticated (e.g., running on Google Cloud)
    return initializeApp({
        credential: undefined, // Rely on Application Default Credentials
        projectId: firebaseConfig.projectId,
    });
}


async function getCollectionData(collectionName: string) {
    const adminApp = getFirebaseAdmin();
    const firestore = getFirestore(adminApp);
    const collRef = firestore.collection(collectionName);
    const snapshot = await collRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getLatestHistoricalResult() {
    const adminApp = getFirebaseAdmin();
    const firestore = getFirestore(adminApp);
    const resultsRef = firestore.collection('election_results');
    const q = resultsRef.orderBy('year', 'desc').limit(1);
    const snapshot = await q.get();
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
        const adminApp = getFirebaseAdmin();
        const firestore = getFirestore(adminApp);
        
        const docRef = await firestore.collection('user_maps').add({
            mapData,
            createdAt: new Date(),
        });

        return { id: docRef.id };
    } catch (e) {
        console.error('Error saving map:', e);
        return { error: 'Could not save your map. Please try again.' };
    }
}

export async function subscribeToMailingList(data: { firstName: string; email: string }) {
    const adminApp = getFirebaseAdmin();
    const firestore = getFirestore(adminApp);
    const subscribersCollection = firestore.collection('mailing_list_subscribers');
    
    try {
        // Check if email already exists
        const q = subscribersCollection.where("email", "==", data.email);
        const existingSubscriber = await q.get();
        if (!existingSubscriber.empty) {
            return { error: "This email is already subscribed." };
        }

        const dataToSave = {
            ...data,
            subscribedAt: new Date(),
        };

        await subscribersCollection.add(dataToSave);
        return { success: true };
    } catch (e: any) {
        console.error('Error subscribing to mailing list:', e);
        return { error: 'Could not subscribe. Please try again.' };
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
