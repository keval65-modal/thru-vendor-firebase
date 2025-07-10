
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import getConfig from 'next/config';

const { publicRuntimeConfig } = getConfig() || {};

const firebaseConfig = {
  apiKey: publicRuntimeConfig?.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: publicRuntimeConfig?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: publicRuntimeConfig?.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: publicRuntimeConfig?.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: publicRuntimeConfig?.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: publicRuntimeConfig?.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: publicRuntimeConfig?.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
if (getApps().length === 0) {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
  } else {
    // This case will be hit if the config is not available, which helps in debugging
    console.error("Firebase config is missing. Ensure publicRuntimeConfig is set in next.config.js");
  }
} else {
  app = getApp();
}


const auth: Auth = getAuth(app!);
const db: Firestore = getFirestore(app!);
const storage: FirebaseStorage = getStorage(app!);

export { app, auth, db, storage };
