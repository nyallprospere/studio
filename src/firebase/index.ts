'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from 'firebase/app-check';


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
    
    // Initialize App Check
    if (typeof window !== 'undefined') {
      try {
        if (process.env.NODE_ENV !== 'production') {
          // Use a debug token for local development
          // This will be printed to the console of your browser.
          // Add it to the Firebase console to allow requests from your local machine.
          (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
          console.log("Firebase App Check debug token enabled. Look for the token in your browser's console and add it to your Firebase project settings.");
        }
        initializeAppCheck(firebaseApp, {
          provider: new ReCaptchaV3Provider('6Ld_s_spAAAAAPy41lwz0p0SAENp5sJ2A4MRuPbA'), // Use a dummy key; debug token will override
          isTokenAutoRefreshEnabled: true
        });
      } catch (e) {
        console.error("App Check initialization failed", e);
      }
    }
    
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
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
