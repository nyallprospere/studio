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
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Automatic initialization failed. Falling back to firebaseConfig object. This is expected in local development.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  if (typeof window !== 'undefined') {
    // Pass your reCAPTCHA v3 site key (public key) to activate(). Make sure this
    // key is the counterpart to the secret key you set in the Firebase console.
    try {
      // Set the debug token to allow local development.
      // This will be logged to the console. You must then add it to your
      // Firebase project's App Check settings.
      (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NODE_ENV !== 'production';

      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider('6Ld-i-wUAAAAAOf-1-g_lA_s-g_lA_s-g_lA_s-g'),
        isTokenAutoRefreshEnabled: true
      });
      console.log('App Check initialized');
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
