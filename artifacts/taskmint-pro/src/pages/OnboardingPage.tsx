import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { GlowButton } from "@/components/GlowButton";
import { BookOpen, Trophy, Bot, Crown, ChevronRight, Zap } from "lucide-react";

const slides = [
  {
    icon: BookOpen,
    color: "from-blue-500 to-cyan-500",
    emoji: "📚",
    title: "Learn & Grow",
    subtitle: "Bangladesh's #1 Student Platform",
    description: "SSC, HSC, Olympiad, Programming — সব কিছু এক জায়গায়। Interactive quizzes, video lessons, এবং AI-powered personalized learning path।",
    accent: "text-blue-400",
    stats: [{ label: "Courses", value: "50+" }, { label: "Students", value: "10K+" }, { label: "Subjects", value: "15+" }],
  },
  {
    icon: Trophy,
    color: "from-yellow-500 to-orange-500",
    emoji: "🏆",
    title: "Compete & Win",
    subtitle: "Real prizes, real competition",
    description: "Premium exams-এ অংশ নিন, leaderboard-এ শীর্ষে উঠুন, এবং bKash-এ real prizes জিতুন। Bangladesh-এর সেরা students-দের সাথে compete করুন।",
    accent: "text-yellow-400",
    stats: [{ label: "Prize Pool", value: "৳5K+" }, { label: "Contests", value: "20+" }, { label: "Winners", value: "500+" }],
  },
  {
    icon: Bot,
    color: "from-violet-500 to-purple-600",
    emoji: "🤖",
    title: "AI-Powered Study",
    subtitle: "Gemini AI আপনার study partner",
    description: "Homework help, code debugging, essay writing — PROCLASS NEXUS AI সব পারে। আপনার প্রশ্নের instant answer পান, যেকোনো সময়, যেকোনো জায়গা থেকে।",
    accent: "text-violet-400",
    stats: [{ label: "AI Answers", value: "∞" }, { label: "Subjects", value: "All" }, { label: "Response", value: "<2s" }],
  },
  {
    icon: Crown,
    color: "from-emerald-500 to-teal-500",
    emoji: "💎",
    title: "Earn While Learning",
    subtitle: "Coins, rewards, bKash withdrawal",
    description: "প্রতিটি quiz জিততে coins earn করুন। Top leaderboard-এ উঠুন। Coins → bKash-এ withdraw করুন। Learning is now profitable!",
    accent: "text-emerald-400",
    stats: [{ label: "Earn Coins", value: "1000+" }, { label: "Withdrawal", value: "bKash" }, { label: "Daily", value: "Free" }],
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
    <div className="flex min-h-screen flex-col items-center justify-between bg-background overflow-hidden">
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center justify-between min-h-screen py-10 px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-extrabold">
              <span className="text-primary">PROCLASS</span> NEXUS
            </span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? "w-8 bg-primary" : i < current ? "w-3 bg-primary/50" : "w-3 bg-white/20"}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col items-center gap-6 text-center w-full"
          >
            {/* Icon */}
            <motion.div
              className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center shadow-2xl relative`}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon className="w-16 h-16 text-white" />
              <div className="absolute -top-3 -right-3 text-3xl">{slide.emoji}</div>
            </motion.div>

            {/* Text */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${slide.accent}`}>{slide.subtitle}</p>
              <h2 className="text-3xl font-extrabold tracking-tight mb-3">{slide.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{slide.description}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {slide.stats.map((s, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="glass-card rounded-2xl py-3 px-2 text-center">
                  <p className={`text-lg font-extrabold ${slide.accent}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <GlowButton className="w-full h-14 text-base font-semibold" onClick={next}>
            {current === slides.length - 1 ? "NEXUS শুরু করুন 🚀" : "পরবর্তী"}
            <ChevronRight className="w-5 h-5 ml-1" />
          </GlowButton>
          {current < slides.length - 1 && (
            <button className="text-muted-foreground text-sm hover:text-white transition-colors py-2"
              onClick={() => setLocation("/login")}>
              Skip করুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
