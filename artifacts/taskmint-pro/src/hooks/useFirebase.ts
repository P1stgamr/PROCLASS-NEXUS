import { auth, db, storage, provider } from "@/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { createUserNo } from "@/lib/userId";

export function useFirebase() {
  const googleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const userRef = ref(db, "users/" + result.user.uid);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        await set(userRef, {
          uid: result.user.uid,
          userNo: createUserNo(result.user.uid),
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          coins: 0,
          xp: 0,
          level: 1,
          streak: 0,
          role: "student",
          createdAt: Date.now(),
          lastLogin: Date.now()
        });
      } else {
        await set(ref(db, "users/" + result.user.uid + "/lastLogin"), Date.now());
      }
      return result.user;
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  return { auth, db, storage, googleLogin, logout };
}
