
'use client';

import { useState, useEffect } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { Vendor } from '@/lib/inventoryModels';

export interface SessionData extends Vendor {
  isAuthenticated: boolean;
  uid: string;
}

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
              const vendorData = docSnap.data() as Vendor;
              setSession({
                ...vendorData,
                isAuthenticated: true,
                uid: user.uid,
                id: user.uid, // Ensure id is set
              });
            } else {
              // User is authenticated but has no vendor profile.
              // This can happen during signup or if data is inconsistent.
              setSession(null);
            }
            setIsLoading(false);
          },
          (error) => {
            console.error("Error listening to vendor document:", error);
            setSession(null);
            setIsLoading(false);
          }
        );
        return () => unsubscribeFirestore(); // Cleanup Firestore listener
      } else {
        // User is not authenticated
        setSession(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth(); // Cleanup Auth listener
  }, [auth, db]);

  return { session, isLoading };
}
