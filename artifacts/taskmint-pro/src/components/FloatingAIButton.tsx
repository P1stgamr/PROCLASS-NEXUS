import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function FloatingAIButton() {
  const [location, setLocation] = useLocation();
  const { currentUser } = useAuth();

  const hiddenPaths = ["/", "/login", "/signup", "/onboarding", "/ai"];
  const isHidden =
    !currentUser ||
    hiddenPaths.includes(location) ||
    location.startsWith("/exam-room/") ||
    location.startsWith("/ai");

  if (isHidden) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      onClick={() => setLocation("/ai")}
      className="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/40"
      data-testid="floating-ai-btn"
      style={{ boxShadow: "0 0 24px 4px rgba(139,92,246,0.35), 0 4px 24px rgba(0,0,0,0.4)" }}
    >
      <div className="relative">
        <Bot className="w-6 h-6 text-white" />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400"
        />
      </div>
    </motion.button>
  );
}
