import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// This function should only be used in SERVER-SIDE code.
export function getFirebaseAdmin() {
  if (!getApps().length) {
    // If you are using Firebase App Hosting, you can remove the firebaseConfig
    // and just call initializeApp()
    const firebaseApp = initializeApp(firebaseConfig);

    return {
      firestore: getFirestore(firebaseApp),
    };
  }

  const app = getApp();
  return {
    firestore: getFirestore(app),
  };
}
