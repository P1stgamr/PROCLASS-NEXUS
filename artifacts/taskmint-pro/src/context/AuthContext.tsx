import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { ref, onValue, off, update } from "firebase/database";
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
  role: "student" | "moderator" | "admin" | "super_admin" | "owner";
  membership?: "free" | "silver" | "gold" | "platinum";
  membershipExpiry?: number;
  bio?: string;
  github?: string;
  linkedin?: string;
  username?: string;
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
    let activeInterval: ReturnType<typeof setInterval> | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (unsubscribeDb) { unsubscribeDb(); unsubscribeDb = null; }
      if (activeInterval) { clearInterval(activeInterval); activeInterval = null; }

      if (user) {
        // Track lastActive so admin can see online users (green dot)
        update(ref(db, `users/${user.uid}`), { lastActive: Date.now() });
        activeInterval = setInterval(() => {
          update(ref(db, `users/${user.uid}`), { lastActive: Date.now() });
        }, 3 * 60 * 1000);

        const userRef = ref(db, `users/${user.uid}`);
        unsubscribeDb = onValue(userRef, (snapshot) => {
          setUserProfile(snapshot.exists() ? (snapshot.val() as UserProfile) : null);
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
      if (activeInterval) clearInterval(activeInterval);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
