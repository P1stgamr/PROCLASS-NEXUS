import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Zap, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
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
        <Link href="/login">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl gradient-primary items-center justify-center mb-4 glow-purple">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reset Password</h1>
          <p className="text-muted-foreground mt-1 text-sm">আপনার email দিন, reset link পাঠানো হবে</p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 glass-card rounded-3xl"
          >
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="font-extrabold text-xl mb-2">Email Sent!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              <span className="text-white font-semibold">{email}</span> তে password reset link পাঠানো হয়েছে। Email check করুন।
            </p>
            <Link href="/login">
              <GlowButton className="w-full h-12">Back to Login</GlowButton>
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground mb-1.5 block">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-white/5 border-white/10 focus:border-primary rounded-xl"
                  autoFocus
                />
              </div>
            </div>
            <GlowButton type="submit" className="w-full h-12 mt-2" disabled={loading || !email.trim()}>
              {loading ? "Sending..." : "Send Reset Link"}
            </GlowButton>
            <p className="text-center text-sm text-muted-foreground">
              মনে পড়ে গেছে?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
