import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import { auth, provider, db } from "@/firebase";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Zap, Mail, Lock, Chrome, Eye, EyeOff } from "lucide-react";

async function createOrUpdateProfile(user: any): Promise<"admin" | "super_admin" | "owner" | "student"> {
  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) {
    await set(userRef, {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Student",
      email: user.email,
      photoURL: user.photoURL || null,
      coins: 0,
      xp: 0,
      level: 1,
      streak: 1,
      role: "student",
      createdAt: Date.now(),
      lastLogin: Date.now(),
    });
  } else {
    await update(userRef, { lastLogin: Date.now() });
  }
  const role = snapshot.exists() ? snapshot.val()?.role : "student";
  return role === "admin" || role === "super_admin" || role === "owner" ? role : "student";
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const role = await createOrUpdateProfile(result.user);
      toast({ title: "স্বাগতম! 🎉", description: `${result.user.displayName || "আপনি"} logged in হয়েছেন।` });
      setLocation(role === "admin" ? "/admin" : "/home");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        toast({ title: "Login failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const role = await createOrUpdateProfile(result.user);
      toast({ title: "স্বাগতম! 🎉" });
      setLocation(role === "admin" ? "/admin" : "/home");
    } catch (err: any) {
      let msg = "Login failed. Please try again.";
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        msg = "এই email দিয়ে কোনো account নেই। Sign up করুন।";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Password ভুল হয়েছে।";
      } else if (err.code === "auth/too-many-requests") {
        msg = "অনেকবার চেষ্টা করেছেন। কিছুক্ষণ পর try করুন।";
      }
      toast({ title: "Login Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-secondary/10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary items-center justify-center mb-4 glow-purple">
            <Zap className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-primary">PROCLASS</span> NEXUS
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Sign in to continue your journey</p>
        </div>

        <GlowButton
          className="w-full h-14 text-base font-semibold mb-6 flex items-center gap-3"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <Chrome className="w-5 h-5" />
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </GlowButton>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">or email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email" className="text-sm text-muted-foreground mb-1.5 block">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-sm text-muted-foreground mb-1.5 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 bg-white/5 border-white/10 focus:border-primary"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <GlowButton type="submit" className="w-full h-12 mt-2" disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign In"}
          </GlowButton>
        </form>

        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign up
            </Link>
          </p>
          <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-white transition-colors">
            Forgot password?
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
