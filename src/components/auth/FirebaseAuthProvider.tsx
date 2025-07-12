
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig, type FirebaseContextValue } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

// Create the context with a default null value.
const FirebaseAuthContext = createContext<FirebaseContextValue | null>(null);

// Export a hook that components can use to access the context.
export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};

// The provider component that initializes Firebase and wraps the application.
export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [firebase, setFirebase] = useState<FirebaseContextValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if Firebase config keys are present
    if (firebaseConfig.apiKey) {
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);
      const storage = getStorage(app);
      
      setFirebase({ app, auth, db, storage });
    } else {
      console.error("Firebase config is missing. Ensure NEXT_PUBLIC_ environment variables are set.");
      setFirebase({ app: null, auth: null, db: null, storage: null });
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
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

  return (
    <FirebaseAuthContext.Provider value={firebase}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}
