'use client';

import { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { MainLayout } from '@/components/layout/main-layout';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    if (typeof window !== 'undefined' && firebaseServices.firebaseApp) {
      // This allows you to use the App Check debug token in development.
      // Set this to true to enable debug mode.
      // The SDK will automatically generate a debug token and log it to the console.
      (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;

      try {
        initializeAppCheck(firebaseServices.firebaseApp, {
          provider: new ReCaptchaV3Provider('6Ld-pB8qAAAAAPj-G1g3P3_CqX9U9sO0qX_xYz4e'), // Replace with your reCAPTCHA v3 site key
          isTokenAutoRefreshEnabled: true
        });
      } catch (error) {
        console.warn('App Check initialization failed. This may happen in environments where it is not fully configured, but the app will continue to run.', error);
      }
    }
  }, [firebaseServices.firebaseApp]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      <MainLayout>{children}</MainLayout>
    </FirebaseProvider>
  );
}
