
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

// This config object is now hardcoded with the values provided by the Firebase platform.
export const firebaseConfig = {
  projectId: "thru-vendor-xqmf1",
  appId: "1:211475032425:web:aba3df27ff211aff4775f8",
  storageBucket: "thru-vendor-xqmf1.appspot.com",
  apiKey: "AIzaSyDpF9CVWya0YbVlfxMPyP8U0VrphEC6UJI",
  authDomain: "thru-vendor-xqmf1.firebaseapp.com",
  messagingSenderId: "211475032425",
  measurementId: "G-K3G19E152P" // Added Measurement ID if available, can be empty string
};

// This function is intended to be called from the server side.
// It is simplified to use the same hardcoded config.
export const getFirebaseAuth = () => {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    return getAuth(app);
};
