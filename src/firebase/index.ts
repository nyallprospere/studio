
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
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
    
    // Initialize App Check
    if (typeof window !== 'undefined') {
      if (process.env.NODE_ENV === 'development') {
        // Use a debug token in development. This allows App Check to work without a reCAPTCHA key.
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (siteKey) {
          try {
              initializeAppCheck(firebaseApp, {
                  provider: new ReCaptchaV3Provider(siteKey),
                  isTokenAutoRefreshEnabled: true
              });
          } catch(e) {
              console.error("App Check initialization failed. This can happen if the App Check API is not enabled in your Google Cloud project.", e);
          }
      } else {
          console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. App Check will not be initialized for production. This may result in Firestore connection errors if App Check is enforced on the backend.");
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
