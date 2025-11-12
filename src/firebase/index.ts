'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  let firebaseApp;
  if (!getApps().length) {
    try {
      // This will automatically initialize Firebase from the client-side config
      // if it's available. This is the recommended approach for App Hosting.
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Automatic initialization failed. Falling back to firebaseConfig object. This is expected in local development.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  // Initialize App Check
  if (typeof window !== 'undefined') {
    try {
      // Create a ReCaptchaV3Provider instance with your reCAPTCHA v3 site key
      // and a debug token for development.
      // NOTE: The debug token will be logged to the console when the app runs.
      // You must add this token to the Firebase Console (App Check > Apps > Your App > Manage debug tokens).
      const appCheck = initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider('6Ld-0-UpAAAAABb-p-3-1-1-1-1-1-1-1-1-1-1-1-1-1-1-1'), // Placeholder
        isTokenAutoRefreshEnabled: true,
      });
      console.log('Firebase App Check initialized.');
    } catch (error) {
      console.error('Error initializing Firebase App Check:', error);
      console.warn(
        'App Check initialization failed. This may be due to the Firebase App Check API not being enabled in your Google Cloud project. Please check your project settings.'
      );
    }
  }


  // If already initialized, return the SDKs with the existing App
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
export * from './storage';
