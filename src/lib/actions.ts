'use server';

import { generateElectionPredictions } from '@/ai/flows/generate-election-predictions';
import { assessNewsImpact } from '@/ai/flows/assess-news-impact';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '@/firebase/admin';

async function getCollectionData(collectionName: string) {
    const adminApp = getFirebaseAdminApp();
    const firestore = getFirestore(adminApp);
    const q = query(collection(firestore, collectionName));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getLatestHistoricalResult() {
    const adminApp = getFirebaseAdminApp();
    const firestore = getFirestore(adminApp);
    const q = query(collection(firestore, 'historicalResults'), orderBy('year', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}


export async function getPrediction(newsSummary: string) {
  try {
    const polls = await getCollectionData('polls');
    const latestHistoricalResult = await getLatestHistoricalResult();

    // Step 1: Generate a baseline prediction
    const initialPrediction = await generateElectionPredictions({
      pollingData: JSON.stringify(polls),
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
