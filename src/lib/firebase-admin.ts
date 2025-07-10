
import * as admin from 'firebase-admin';

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

export { adminDb };
