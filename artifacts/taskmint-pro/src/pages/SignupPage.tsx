import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "@/firebase";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Zap, Mail, Lock, User } from "lucide-react";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await set(ref(db, `users/${result.user.uid}`), {
        uid: result.user.uid,
        name,
        email,
        photoURL: null,
        coins: 100,
        xp: 0,
        level: 1,
        streak: 1,
        role: "student",
        createdAt: Date.now(),
        lastLogin: Date.now(),
      });
      setLocation("/home");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/15 via-background to-primary/10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary items-center justify-center mb-4 glow-blue">
            <Zap className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Join TaskMint Pro</h1>
          <p className="text-muted-foreground mt-1 text-sm">Start earning coins from day one</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name" className="text-sm text-muted-foreground mb-1.5 block">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10 focus:border-secondary"
                data-testid="input-name"
              />
            </div>
          </div>

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
                className="pl-10 h-12 bg-white/5 border-white/10 focus:border-secondary"
                data-testid="input-email"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-sm text-muted-foreground mb-1.5 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10 focus:border-secondary"
                data-testid="input-password"
              />
            </div>
          </div>

          <GlowButton
            type="submit"
            glowColor="blue"
            className="w-full h-12 mt-2"
            disabled={loading}
            data-testid="btn-signup"
          >
            {loading ? "Creating account..." : "Create Account"}
          </GlowButton>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors" data-testid="link-login">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
