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
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  if (typeof window !== 'undefined') {
    // This allows you to use the App Check debug token in development.
    // Set this to true to enable debug mode.
    // The SDK will automatically generate a debug token and log it to the console.
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;

    try {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider('6Le-i-wUAAAAAAN-g_lA_s-g_lA_s-g_lA_s-g_lA_s'),
        isTokenAutoRefreshEnabled: true
      });
    } catch (error) {
      console.warn('App Check initialization failed. This may happen in environments where it is not fully configured, but the app will continue to run.', error);
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
