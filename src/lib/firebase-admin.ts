
'use server';

import admin from 'firebase-admin';
import { getApps, getApp, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  throw new Error('The FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for server-side operations.');
}

let serviceAccount;
try {
    // The key might be wrapped in single quotes if copied from some terminals, remove them.
    const cleanedKey = serviceAccountKey.trim().startsWith("'") && serviceAccountKey.trim().endsWith("'")
        ? serviceAccountKey.trim().slice(1, -1)
        : serviceAccountKey.trim();

    serviceAccount = JSON.parse(cleanedKey);
} catch (e) {
    console.error("Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY. Raw key from env (first 50 chars):", serviceAccountKey.substring(0, 50));
    throw new Error('Failed to parse the FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string in your .env.local file.');
}


const app = !getApps().length
  ? initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
    })
  : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
