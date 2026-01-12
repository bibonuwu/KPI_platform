import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // users/{uid}
  const [loading, setLoading] = useState(true);
  const unsubProfileRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setProfile(null);

      // stop old listener
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }

      if (!u) {
        setLoading(false);
        return;
      }

      const ref = doc(db, "users", u.uid);

      // Create user doc ONLY if it doesn't exist (important: do not overwrite saved profile)
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            uid: u.uid,
            email: u.email ?? "",
            displayName: u.displayName ?? "",
            // profile fields:
            school: "",
            subject: "",
            experienceYears: 0,
            phone: "",
            city: "",
            position: "",
            role: "teacher",
            totalPoints: 0,
            createdAt: serverTimestamp()
          });
        } else {
          // keep email in sync (do NOT overwrite teacher-entered FIO)
          const patch = { email: u.email ?? "" };
          if (u.displayName) patch.displayName = u.displayName;
          await setDoc(ref, patch, { merge: true });
        }
      } catch (e) {
        // ignore
      }

      // Live subscription to profile changes (points after approval etc.)
      unsubProfileRef.current = onSnapshot(ref, (snap) => {
        setProfile(snap.exists() ? snap.data() : null);
        setLoading(false);
      });
    });

    return () => {
      if (unsubProfileRef.current) unsubProfileRef.current();
      unsubAuth();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    role: profile?.role ?? null,
    logout: () => signOut(auth)
  }), [user, profile, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
