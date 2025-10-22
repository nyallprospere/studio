
'use server';

import { generateElectionPredictions } from '@/ai/flows/generate-election-predictions';
import { assessNewsImpact } from '@/ai/flows/assess-news-impact';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { headers } from 'next/headers';
import type { UserMap } from './types';


async function getCollectionData(collectionName: string) {
    const { firestore } = initializeFirebase();
    const collRef = collection(firestore, collectionName);
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getLatestHistoricalResult() {
    const { firestore } = initializeFirebase();
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
        const { firestore } = initializeFirebase();
        const headersList = headers();
        const ip = headersList.get('x-forwarded-for') || 'unknown';

        const docRef = await addDoc(collection(firestore, 'user_maps'), {
            mapData,
            createdAt: serverTimestamp(),
            ipAddress: ip,
        });

        return { id: docRef.id };
    } catch (e) {
        console.error('Error saving map:', e);
        return { error: 'Could not save your map. Please try again.' };
    }
}
