
import admin from 'firebase-admin';
import { getApps, getApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// This is the standard and most robust way to initialize the Firebase Admin SDK.
// It relies on Application Default Credentials, which are automatically available
// in deployed Google Cloud environments (like App Hosting) and can be configured
// locally by running `gcloud auth application-default login`.
const firebaseAdminConfig = {
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

// Initialize the app only if it hasn't been initialized yet.
// This prevents errors during hot-reloading in development.
const app = !getApps().length
  ? initializeApp(firebaseAdminConfig)
  : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
