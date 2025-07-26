
import admin from 'firebase-admin';
import { getApps, getApp, initializeApp, type AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const firebaseConfig: AppOptions = {
  credential: admin.credential.applicationDefault(),
};

// Only add storageBucket and databaseURL if the environment variables are set.
// This prevents initialization errors if they are missing.
if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
  firebaseConfig.storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
}
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  firebaseConfig.databaseURL = `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`;
}

const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
