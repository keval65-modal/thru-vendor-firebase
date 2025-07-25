
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import admin from 'firebase-admin';
import { getApps, getApp, initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';


// Robustly construct the service account object from individual environment variables
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!privateKey || !clientEmail || !projectId) {
    let missingVars = [];
    if (!privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
    if (!clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    throw new Error(`The following required environment variables are not set: ${missingVars.join(', ')}. Please check your .env.local file.`);
}

const serviceAccount: ServiceAccount = {
    projectId: projectId,
    clientEmail: clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'), // Replace literal \n with actual newlines
};


const app = !getApps().length
  ? initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
  : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
