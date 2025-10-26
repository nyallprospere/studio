'use server';

import { generateElectionPredictions } from '@/ai/flows/generate-election-predictions';
import { assessNewsImpact } from '@/ai/flows/assess-news-impact';
import { summarizeArticle as summarizeArticleFlow } from '@/ai/flows/summarize-article';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

// Helper to initialize Firebase Admin SDK - cached for performance
let adminApp: admin.app.App;
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }
    
    try {
        const credentials = JSON.parse(serviceAccountKey);
        adminApp = admin.initializeApp({
            credential: admin.credential.cert(credentials),
            storageBucket: credentials.project_id + '.appspot.com',
        });
    } catch(e) {
        console.error("Failed to parse service account key", e)
        throw new Error("Failed to initialize Firebase Admin. Service account key may be invalid.");
    }

  } else {
    adminApp = admin.app();
  }
  return adminApp;
}

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
      imageUrl: imageUrl, 
    });

    return { id: mapDocRef.id, imageUrl: imageUrl };
  } catch (error) {
    console.error('Error saving user map:', error);
    return { error: 'Could not save your map. Please try again.' };
  }
}
