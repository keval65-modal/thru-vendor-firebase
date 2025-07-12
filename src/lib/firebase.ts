
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function getFirebaseApp(): FirebaseApp {
    if (getApps().length === 0) {
        if (!firebaseConfig.apiKey) {
            throw new Error("Firebase config is missing. Ensure NEXT_PUBLIC_ environment variables are set and loaded correctly.");
        }
        return initializeApp(firebaseConfig);
    } else {
        return getApp();
    }
}

function getFirebaseAuth(): Auth {
    if (!auth) {
        app = getFirebaseApp();
        auth = getAuth(app);
    }
    return auth;
}

function getFirebaseDb(): Firestore {
    if (!db) {
        app = getFirebaseApp();
        db = getFirestore(app);
    }
    return db;
}

function getFirebaseStorage(): FirebaseStorage {
    if (!storage) {
        app = getFirebaseApp();
        storage = getStorage(app);
    }
    return storage;
}


export { getFirebaseApp, getFirebaseAuth, getFirebaseDb, getFirebaseStorage };
