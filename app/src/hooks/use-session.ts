
'use client';

import { useState, useEffect } from 'react';
import { getSession as getServerSession, type SessionData } from '@/lib/auth';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { ADMIN_UID } from '@/config/constants';

export function useSession() {
  const { auth, db } = useFirebaseAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      // Firebase context is not ready yet, wait for it.
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User is authenticated via Firebase Auth.
        // Now, set up a real-time listener for their vendor document.
        if (user.uid === ADMIN_UID) {
            // For the admin user, we can fetch their data once as it's static
            const adminSession = await getServerSession();
            setSession(adminSession);
            setIsLoading(false);
        } else {
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
                    id: docSnap.id,
                  } as SessionData);
                } else {
                  // User is authenticated but has no vendor profile document.
                  // This could be a race condition during signup or an error state.
                  setSession({ isAuthenticated: false });
                }
                setIsLoading(false);
              },
              (error) => {
                console.error("Error listening to vendor document:", error);
                setSession({ isAuthenticated: false });
                setIsLoading(false);
              }
            );
            return () => unsubscribeFirestore(); // Cleanup Firestore listener
        }
      } else {
        // User is not authenticated.
        setSession({ isAuthenticated: false });
        setIsLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup Auth listener
  }, [auth, db]);

  return { session, isLoading };
}
