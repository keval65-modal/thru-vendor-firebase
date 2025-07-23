import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  if (Object.values(config).some(value => !value)) {
    console.error('SERVER-SIDE ERROR: At least one Firebase environment variable is missing in the deployment environment.');
    return NextResponse.json({ error: 'Server-side Firebase configuration is incomplete.' }, { status: 500 });
  }

  return NextResponse.json(config);
}
