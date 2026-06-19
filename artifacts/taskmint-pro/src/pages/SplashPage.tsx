import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Zap } from "lucide-react";

export default function SplashPage() {
  const [, setLocation] = useLocation();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    const maxWait = setTimeout(() => {
      setLocation("/onboarding");
    }, 6000);

    if (loading) return () => clearTimeout(maxWait);

    const timer = setTimeout(() => {
      clearTimeout(maxWait);
      if (currentUser) {
        setLocation("/home");
      } else {
        setLocation("/onboarding");
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(maxWait);
    };
  }, [currentUser, loading, setLocation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/10" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-purple shadow-2xl"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          <Zap className="w-12 h-12 text-white" fill="white" />
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-white to-secondary bg-clip-text text-transparent">
            TaskMint Pro
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium tracking-widest uppercase">
            Study. Compete. Earn.
          </p>
        </motion.div>

        <motion.div
          className="flex gap-2 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
