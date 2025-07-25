
import admin from 'firebase-admin';
import { getApps, getApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

let app: App;

const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log("Initializing Firebase Admin with local service account key.");
    app = !getApps().length
      ? initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
        })
      : getApp();
  } else {
    console.log("Initializing Firebase Admin with application default credentials.");
    app = !getApps().length
      ? initializeApp({
          credential: admin.credential.applicationDefault(),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
        })
      : getApp();
  }
} catch (error) {
  console.error("Firebase Admin initialization failed:", error);
  if (!getApps().length) {
    // If initialization fails and there are no apps, we might be in a situation
    // where we need to fallback or it's a critical configuration error.
    // For now, we'll let it proceed and subsequent calls will fail,
    // which might provide more specific logs.
  }
  app = getApp(); // Attempt to get the app if it was initialized in a different context
}


const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
