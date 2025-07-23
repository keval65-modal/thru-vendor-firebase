// This file now exports the configuration and types for Firebase.
// The actual initialization is handled by the FirebaseAuthProvider to ensure it only runs on the client.

import type { FirebaseApp } from 'firebase/app';
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

// We define a type for our context to be used in the provider and consumer hooks.
export interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
}

// This config object is populated at runtime by fetching from /api/config
// It is no longer read from process.env here.
export let firebaseConfig: Record<string, string | undefined> = {};

// This function is intended to be called from the server side, specifically for actions
// that need the client SDK on the server (e.g., password reset email).
// This might fail if server actions also have issues accessing env vars.
export const getFirebaseAuth = () => {
    // This server-side function will need its own way to get config if used.
    // For now, focusing on client-side initialization.
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    return getAuth(app);
};
