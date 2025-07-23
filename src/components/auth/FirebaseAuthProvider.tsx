'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { type FirebaseContextValue, firebaseConfig } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

// Create the context with a default null value.
const FirebaseAuthContext = createContext<FirebaseContextValue | null>(null);

// Export a hook that components can use to access the context.
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

// The provider component that initializes Firebase and wraps the application.
export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [firebase, setFirebase] = useState<FirebaseContextValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
        if (firebaseConfig && firebaseConfig.apiKey) {
            const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
            const auth = getAuth(app);
            const db = getFirestore(app);
            const storage = getStorage(app);
            
            setFirebase({ app, auth, db, storage });
        } else {
            console.error("Firebase config is missing or invalid.");
            setFirebase({ app: null, auth: null, db: null, storage: null });
        }
    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        setFirebase({ app: null, auth: null, db: null, storage: null });
    } finally {
        setIsLoading(false);
    }
  }, []);

  if (isLoading || !firebase) {
    // You can render a loading skeleton or a blank page while Firebase initializes.
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

  if (!firebase.app) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-destructive p-4 text-destructive-foreground">
            <div className="w-full max-w-md space-y-4 text-center">
                <h1 className="text-2xl font-bold">Firebase Initialization Failed</h1>
                <p>Could not connect to Firebase services. Please check the console for errors and verify your configuration.</p>
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
