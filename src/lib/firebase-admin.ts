
import admin from 'firebase-admin';
import { getApps, getApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// This is the standard and recommended way to initialize the Admin SDK in a Google Cloud environment.
// It uses Application Default Credentials (ADC) which are automatically available in App Hosting.
const firebaseAdminConfig = {
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const app = !getApps().length
  ? initializeApp(firebaseAdminConfig)
  : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
