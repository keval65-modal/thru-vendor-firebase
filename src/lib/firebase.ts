
// This file now exports the configuration and types for Firebase.
// The actual initialization is handled by the FirebaseAuthProvider to ensure it only runs on the client.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

// We define a type for our context to be used in the provider and consumer hooks.
export interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
}

// This config object is now populated from environment variables provided by App Hosting.
// This is the recommended approach to avoid hardcoding values.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function initializeFirebaseApp() {
    return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

// This function is intended to be called from the server side.
export const getFirebaseAuth = () => {
    const app = initializeFirebaseApp();
    return getAuth(app);
};

// Export a getter for client-side use within the provider.
export { initializeFirebaseApp };
