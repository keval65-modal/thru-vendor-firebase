// This file is a workaround for server actions needing client-compatible services
// that still run on the server. It uses the normal client SDK initialization
// but is intended to be used from 'use server' files. This avoids pulling
// the full 'firebase-admin' SDK into contexts where it might cause issues.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './firebase';

function initializeClientSDK() {
    if (getApps().length > 0) {
        return getApp();
    }
    return initializeApp(firebaseConfig);
}

const app = initializeClientSDK();
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };