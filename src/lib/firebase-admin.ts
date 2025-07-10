
import * as admin from 'firebase-admin';

// This ensures that we are only initializing the admin app once, on the server.
function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString || serviceAccountString.trim() === '') {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set or is empty.');
    }

    const serviceAccountJson = JSON.parse(serviceAccountString);
    
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJson),
    });

  } catch (error: any) {
    let errorMessage = `Failed to initialize Firebase Admin SDK.`;
    if (error.message.includes('JSON.parse')) {
        errorMessage += ' The FIREBASE_SERVICE_ACCOUNT environment variable is likely not valid JSON.';
    } else {
        errorMessage += ` Details: ${error.message}`;
    }
    console.error("[CRITICAL] FIREBASE ADMIN INIT FAILED:", errorMessage);
    // Instead of crashing, we throw to prevent further execution that depends on adminDb
    // The detailed console log is the key part for debugging.
    throw new Error(errorMessage);
  }
}

// Export a server-side DB instance for server actions
const adminDb = () => getAdminApp().firestore();

export { adminDb };
