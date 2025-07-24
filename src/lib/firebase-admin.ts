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
    serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
    throw new Error('Failed to parse the FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string.');
}


const app = !getApps().length
  ? initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `gs://${serviceAccount.project_id}.appspot.com`
    })
  : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
