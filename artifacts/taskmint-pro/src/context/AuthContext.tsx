import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { ref, onValue, off, update } from "firebase/database";
import { auth, db } from "@/firebase";
import { createUserNo } from "@/lib/userId";
import { AppRole, normalizeRole } from "@/lib/roles";

export interface UserProfile {
  uid: string;
  userNo?: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  coins: number;
  xp: number;
  level: number;
  streak: number;
  role: AppRole;
  membership?: "free" | "silver" | "gold" | "platinum";
  membershipExpiry?: number;
  membershipPlanId?: string;
  membershipBenefits?: string[];
  profileComplete?: boolean;
  phone?: string;
  schoolName?: string;
  grade?: string;
  bio?: string;
  github?: string;
  linkedin?: string;
  username?: string;
  communityId?: string;
  communityName?: string;
  communityLogo?: string | null;
  bkashNumber?: string;
  createdAt: number;
  lastLogin: number;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  needsProfileSetup: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  needsProfileSetup: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

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
          if (!snapshot.exists()) {
            setUserProfile(null);
            setNeedsProfileSetup(true);
            setLoading(false);
            return;
          }
          const rawProfile = snapshot.val() as UserProfile;
          const profile = { ...rawProfile, role: normalizeRole(rawProfile.role) } as UserProfile;
          const userNo = profile.userNo || createUserNo(user.uid);
          setUserProfile({ ...profile, userNo });
          setNeedsProfileSetup(profile.profileComplete !== true);
          if (!profile.userNo) {
            update(userRef, { userNo }).catch((error) => {
              console.error("Could not backfill user ID number:", error);
            });
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setNeedsProfileSetup(false);
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
    <AuthContext.Provider value={{ currentUser, userProfile, loading, needsProfileSetup }}>
      {children}
    </AuthContext.Provider>
  );
}
