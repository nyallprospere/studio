
'use server';

import { generateElectionPredictions } from '@/ai/flows/generate-election-predictions';
import { assessNewsImpact } from '@/ai/flows/assess-news-impact';
import { summarizeArticle as summarizeArticleFlow } from '@/ai/flows/summarize-article';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

// Helper to initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return admin.app();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  const credentials = JSON.parse(serviceAccountKey);

  return admin.initializeApp({
    credential: admin.credential.cert(credentials),
    storageBucket: credentials.project_id + '.appspot.com',
  });
}

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

interface SaveMapData {
  mapData: {
    constituencyId: string;
    politicalLeaning: string;
  }[];
  imageDataUrl: string;
}

export async function saveUserMap(data: SaveMapData) {
  try {
    const adminApp = initializeFirebaseAdmin();
    const firestore = admin.firestore();
    const storage = admin.storage();
    const bucket = storage.bucket();

    // 1. Handle Image Upload
    const imageBuffer = Buffer.from(data.imageDataUrl.split(',')[1], 'base64');
    const imageId = uuidv4();
    const imagePath = `SavedMaps/${imageId}.png`;
    const file = bucket.file(imagePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
      },
    });
    
    // The public URL is constructed manually.
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${imagePath}`;

    // 2. Save Map Data to Firestore
    const mapDocRef = await firestore.collection('user_maps').add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      mapData: data.mapData,
      imageUrl: imageUrl, // Save the public URL
    });

    return { id: mapDocRef.id, imageUrl: imageUrl };
  } catch (error) {
    console.error('Error saving user map:', error);
    return { error: 'Could not save your map. Please try again.' };
  }
}
