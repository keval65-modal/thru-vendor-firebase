
import { NextResponse } from 'next/server';

export async function GET() {
  // This route now directly constructs and returns the config object.
  // The environment variables are provided by the App Hosting environment at runtime.
  // The previous check for missing variables was causing the 500 error and has been removed.
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // A simple check to see if the crucial variables are missing on the server, which would indicate a problem
  // with the App Hosting secret configuration itself.
  if (!config.apiKey || !config.projectId) {
    console.error('[API/CONFIG] Server-side environment variables are not loaded. Check App Hosting secrets.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  return NextResponse.json(config);
}
