import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;
let initError: Error | null = null;

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0] as admin.app.App;
    return;
  }

  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString || serviceAccountString.trim() === '') {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set or is empty.');
    }

    const serviceAccountJson = JSON.parse(serviceAccountString);
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJson),
    });

  } catch (error: any) {
    let errorMessage = `[CRITICAL] Firebase Admin SDK initialization failed. Server-side features will be disabled.`;
    if (error.message.includes('JSON.parse')) {
        errorMessage += ' The FIREBASE_SERVICE_ACCOUNT environment variable is likely not valid JSON.';
    } else {
        errorMessage += ` Details: ${error.message}`;
    }
    console.error(errorMessage);
    initError = new Error(errorMessage); // Store the error
  }
}

// Call initialization only once
initializeAdminApp();

// Export a function that provides the db instance, or throws if initialization failed.
const adminDb = () => {
  if (initError) {
    // This allows individual functions to handle the case where the admin SDK is not available.
    return null;
  }
  if (!adminApp) {
    // This case should ideally not be hit if initializeAdminApp is called, but as a safeguard:
    return null;
  }
  return adminApp.firestore();
};

export { adminDb };
