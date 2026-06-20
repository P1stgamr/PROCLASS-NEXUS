import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { ref, onValue, off } from "firebase/database";
import { auth, db } from "@/firebase";

export interface UserProfile {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  coins: number;
  xp: number;
  level: number;
  streak: number;
  role: "student" | "admin";
  bkashNumber?: string;
  createdAt: number;
  lastLogin: number;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDb: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (unsubscribeDb) {
        unsubscribeDb();
        unsubscribeDb = null;
      }

      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        unsubscribeDb = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserProfile(snapshot.val() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDb) unsubscribeDb();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
