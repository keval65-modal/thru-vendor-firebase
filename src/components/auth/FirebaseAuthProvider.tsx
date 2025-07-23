'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { type FirebaseContextValue } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

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
    const initializeFirebase = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.statusText}`);
        }
        const firebaseConfig = await response.json();

        if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
            const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
            const auth = getAuth(app);
            const db = getFirestore(app);
            const storage = getStorage(app);
            
            setFirebase({ app, auth, db, storage });
        } else {
            throw new Error("Firebase config fetched from API is missing required fields.");
        }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during Firebase initialization.";
        console.error("Failed to initialize Firebase:", errorMessage);
        setError(errorMessage);
        setFirebase({ app: null, auth: null, db: null, storage: null });
    } finally {
        setIsLoading(false);
    }
    };

    initializeFirebase();
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-destructive p-4 text-destructive-foreground">
            <div className="w-full max-w-md space-y-4 text-center">
                <h1 className="text-2xl font-bold">Firebase Initialization Failed</h1>
                <p>Could not connect to Firebase services. Please check the console for errors and verify your configuration.</p>
                {error && <p className="mt-2 text-sm bg-destructive-foreground/20 p-2 rounded">Error: {error}</p>}
            </div>
        </div>
    );
  }

  return (
    <FirebaseAuthContext.Provider value={firebase}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}
