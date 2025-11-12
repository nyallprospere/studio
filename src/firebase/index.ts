'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
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
    
    // Initialize App Check only on the client side
    if (typeof window !== 'undefined') {
      try {
        // Use a debug token for local development.
        // This will be printed to your browser's console.
        // Add it to the Firebase console (App Check section) to allow requests.
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        
        // The reCAPTCHA key here is a placeholder. The debug token will override it in development.
        initializeAppCheck(firebaseApp, {
          provider: new ReCaptchaV3Provider('6Ld_s_spAAAAAPy41lwz0p0SAENp5sJ2A4MRuPbA'), 
          isTokenAutoRefreshEnabled: true
        });
      } catch (e: any) {
        console.error("App Check initialization failed. This can happen if the 'Firebase App Check API' is not enabled in your Google Cloud project. Please enable it to resolve this issue.", e);
      }
    }
    
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the existing App
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