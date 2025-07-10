
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import * as admin from 'firebase-admin';

// --- Client-Side Firebase Initialization ---
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

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

// --- Server-Side Firebase Admin Initialization ---
// This ensures that we are only initializing the admin app once, on the server.
function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  }

  try {
    const serviceAccountJson = JSON.parse(serviceAccount);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJson),
    });
  } catch (error: any) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", error);
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

// Export a server-side DB instance for server actions
const adminDb = () => getAdminApp().firestore();

export { app, auth, db, storage, adminDb };
