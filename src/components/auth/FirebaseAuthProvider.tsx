'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeFirebaseApp, type FirebaseContextValue, firebaseConfig } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const FirebaseAuthContext = createContext<FirebaseContextValue | null>(null);

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  if (!context.app) {
     throw new Error('Firebase has not been initialized. useFirebaseAuth must be used within an initialized FirebaseAuthProvider.');
  }
  return context as Required<FirebaseContextValue>;
};

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [firebase, setFirebase] = useState<FirebaseContextValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
        const app = initializeFirebaseApp();
        const auth = getAuth(app);
        const db = getFirestore(app);
        const storage = getStorage(app);
        
        setFirebase({ app, auth, db, storage });
    } catch (e: any) {
        console.error("Failed to initialize Firebase:", e);
        setError(e.message || "An unknown error occurred during Firebase initialization.");
        setFirebase({ app: null, auth: null, db: null, storage: null });
    } finally {
        setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
  }

  if (error || !firebase?.app) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Firebase Initialization Failed</AlertTitle>
                <AlertDescription>
                    <p>Could not connect to Firebase services. Please ensure your environment variables are correctly configured in `.env.local` and that the API key is valid.</p>
                    <p className="mt-2 text-xs"><strong>Error:</strong> {error || "No Firebase app available."}</p>
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <FirebaseAuthContext.Provider value={firebase}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}
