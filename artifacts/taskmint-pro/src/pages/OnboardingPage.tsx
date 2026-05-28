import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { GlowButton } from "@/components/GlowButton";
import { Zap, Trophy, MessageSquare, ChevronRight } from "lucide-react";

const slides = [
  {
    icon: Zap,
    color: "from-purple-500 to-blue-500",
    title: "Learn & Earn Coins",
    description: "Complete study tasks, solve quizzes, and earn real coins for every achievement. Your effort has real value here.",
    accent: "text-purple-400",
  },
  {
    icon: Trophy,
    color: "from-yellow-500 to-orange-500",
    title: "Compete & Rise",
    description: "Join daily competitions, climb the leaderboard, and win exclusive prizes. The best students get recognized.",
    accent: "text-yellow-400",
  },
  {
    icon: MessageSquare,
    color: "from-blue-500 to-cyan-500",
    title: "Connect & Grow",
    description: "Chat with peers in real-time, share knowledge, collaborate on contests, and build your study network.",
    accent: "text-blue-400",
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const [, setLocation] = useLocation();

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      setLocation("/login");
    }
  };

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background p-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background" />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center justify-between h-full min-h-screen py-12">
        <div className="flex gap-2 mt-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === current ? "w-8 bg-primary" : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex flex-col items-center gap-8 text-center"
          >
            <motion.div
              className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center shadow-2xl`}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon className="w-14 h-14 text-white" />
            </motion.div>

            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">{slide.title}</h2>
              <p className="text-muted-foreground mt-3 text-base leading-relaxed max-w-xs">
                {slide.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-3 w-full">
          <GlowButton
            className="w-full h-14 text-base font-semibold"
            onClick={next}
            data-testid="btn-onboarding-next"
          >
            {current === slides.length - 1 ? "Get Started" : "Continue"}
            <ChevronRight className="w-5 h-5 ml-1" />
          </GlowButton>
          {current < slides.length - 1 && (
            <button
              className="text-muted-foreground text-sm hover:text-white transition-colors"
              onClick={() => setLocation("/login")}
              data-testid="btn-skip-onboarding"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
