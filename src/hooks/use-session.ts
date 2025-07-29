
'use client';

import { useState, useEffect } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { doc, onSnapshot } from 'firebase/firestore';
import type { SessionData } from '@/lib/auth';

export function useSession() {
  const { auth, db } = useFirebaseAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      // Defer loading until firebase is ready
      return;
    }

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is authenticated, listen for profile changes
        const vendorDocRef = doc(db, 'vendors', user.uid);
        const unsubscribeFirestore = onSnapshot(
          vendorDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const vendorData = docSnap.data();
              setSession({
                ...vendorData,
                isAuthenticated: true,
                uid: user.uid,
                id: docSnap.id, // Restore the missing id property
              } as SessionData);
            } else {
              // User is authenticated but has no vendor profile.
              setSession({isAuthenticated: false});
            }
            setIsLoading(false);
          },
          (error) => {
            console.error("Error listening to vendor document:", error);
            setSession({isAuthenticated: false});
            setIsLoading(false);
          }
        );
        return () => unsubscribeFirestore(); // Cleanup Firestore listener
      } else {
        // User is not authenticated
        setSession({isAuthenticated: false});
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth(); // Cleanup Auth listener
  }, [auth, db]);

  return { session, isLoading };
}
