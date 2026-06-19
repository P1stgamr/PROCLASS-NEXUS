import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Code2, FlaskConical, Globe, Calculator, Cpu,
  Clock, Star, Zap, Target, Play, Lock,
  CheckCircle2, BarChart3
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "সব" },
  { id: "ssc", label: "SSC" },
  { id: "hsc", label: "HSC" },
  { id: "code", label: "Coding" },
  { id: "general", label: "General" },
];

const SUBJECTS = [
  { id: "math", label: "Mathematics", icon: Calculator, color: "text-blue-400", bg: "bg-blue-500/15", cat: "ssc" },
  { id: "physics", label: "Physics", icon: FlaskConical, color: "text-purple-400", bg: "bg-purple-500/15", cat: "hsc" },
  { id: "chemistry", label: "Chemistry", icon: FlaskConical, color: "text-green-400", bg: "bg-green-500/15", cat: "hsc" },
  { id: "biology", label: "Biology", icon: FlaskConical, color: "text-emerald-400", bg: "bg-emerald-500/15", cat: "ssc" },
  { id: "english", label: "English", icon: Globe, color: "text-yellow-400", bg: "bg-yellow-500/15", cat: "ssc" },
  { id: "ict", label: "ICT", icon: Cpu, color: "text-cyan-400", bg: "bg-cyan-500/15", cat: "hsc" },
  { id: "python", label: "Python", icon: Code2, color: "text-orange-400", bg: "bg-orange-500/15", cat: "code" },
  { id: "js", label: "JavaScript", icon: Code2, color: "text-yellow-500", bg: "bg-yellow-500/10", cat: "code" },
  { id: "cpp", label: "C++", icon: Code2, color: "text-pink-400", bg: "bg-pink-500/15", cat: "code" },
  { id: "gk", label: "General Knowledge", icon: Globe, color: "text-indigo-400", bg: "bg-indigo-500/15", cat: "general" },
];

type Quiz = { id: string; title: string; subject: string; difficulty: string; questions: number; duration: number; reward: number; rating: number; attempts: number; cat: string; tags: string[]; premium?: boolean };

const QUIZZES: Quiz[] = [
  { id: "q1", title: "SSC Math: Algebra", subject: "Mathematics", difficulty: "Easy", questions: 10, duration: 15, reward: 50, rating: 4.8, attempts: 234, cat: "ssc", tags: ["Algebra", "Equations"] },
  { id: "q2", title: "HSC Physics: Mechanics", subject: "Physics", difficulty: "Medium", questions: 15, duration: 20, reward: 80, rating: 4.6, attempts: 189, cat: "hsc", tags: ["Newton", "Motion"] },
  { id: "q3", title: "Python Basics", subject: "Programming", difficulty: "Easy", questions: 12, duration: 18, reward: 60, rating: 4.9, attempts: 412, cat: "code", tags: ["Python", "Basics"] },
  { id: "q4", title: "JavaScript: DOM & Events", subject: "Programming", difficulty: "Medium", questions: 10, duration: 20, reward: 70, rating: 4.7, attempts: 156, cat: "code", tags: ["JS", "DOM"] },
  { id: "q5", title: "English Grammar Mastery", subject: "English", difficulty: "Easy", questions: 20, duration: 25, reward: 60, rating: 4.5, attempts: 378, cat: "ssc", tags: ["Grammar", "Vocabulary"] },
  { id: "q6", title: "Bangladesh: History & Culture", subject: "General Knowledge", difficulty: "Medium", questions: 15, duration: 20, reward: 50, rating: 4.4, attempts: 203, cat: "general", tags: ["History", "Culture"] },
  { id: "q7", title: "HSC Chemistry: Organic", subject: "Chemistry", difficulty: "Hard", questions: 20, duration: 30, reward: 120, rating: 4.8, attempts: 98, cat: "hsc", tags: ["Organic", "Reactions"], premium: true },
  { id: "q8", title: "C++: Data Structures", subject: "Programming", difficulty: "Hard", questions: 15, duration: 25, reward: 100, rating: 4.9, attempts: 87, cat: "code", tags: ["DSA", "C++"], premium: true },
];

const CODING_CHALLENGES = [
  { id: "c1", title: "Two Sum", difficulty: "Easy", xp: 50, solved: true, tag: "Array" },
  { id: "c2", title: "Palindrome Check", difficulty: "Easy", xp: 50, solved: true, tag: "String" },
  { id: "c3", title: "Binary Search", difficulty: "Medium", xp: 100, solved: false, tag: "Search" },
  { id: "c4", title: "Fibonacci DP", difficulty: "Medium", xp: 100, solved: false, tag: "DP" },
  { id: "c5", title: "Graph BFS/DFS", difficulty: "Hard", xp: 200, solved: false, tag: "Graph" },
];

const diffColor: Record<string, string> = {
  Easy: "bg-green-500/20 text-green-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Hard: "bg-red-500/20 text-red-400",
};

export default function StudyPage() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("quiz");
  const [activeCat, setActiveCat] = useState("all");

  const filteredQuizzes = activeCat === "all"
    ? [...QUIZZES]
    : [...QUIZZES].filter(q => q.cat === activeCat);

  const totalXP = CODING_CHALLENGES.filter(c => c.solved).reduce((s, c) => s + c.xp, 0);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Study Hub</h1>
              <p className="text-[11px] text-muted-foreground">শিখুন, practice করুন, এগিয়ে যান</p>
            </div>
          </div>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {[
              { id: "quiz", label: "Quizzes" },
              { id: "coding", label: "Coding" },
              { id: "subjects", label: "Subjects" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? "gradient-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto">
        <AnimatePresence mode="wait">

          {activeTab === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${activeCat === cat.id ? "gradient-primary text-white" : "glass-card text-muted-foreground hover:text-white"}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {filteredQuizzes.map((quiz, i) => (
                  <motion.div key={quiz.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="glass-card-hover rounded-2xl overflow-hidden cursor-pointer">
                    <div className="h-0.5 gradient-primary" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-sm mb-0.5">{quiz.title}</h3>
                          <p className="text-xs text-muted-foreground">{quiz.subject}</p>
                        </div>
                        <Badge className={`text-[10px] shrink-0 ${diffColor[quiz.difficulty]}`}>{quiz.difficulty}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" />{quiz.questions} Q</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.duration} min</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{quiz.rating}</span>
                        <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{quiz.attempts}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {quiz.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-muted-foreground">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400">+{quiz.reward} coins</span>
                        </div>
                        <GlowButton size="sm" className="h-8 px-4 text-xs">
                          {quiz.premium
                            ? <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Premium</span>
                            : <span className="flex items-center gap-1"><Play className="w-3 h-3" />Start</span>
                          }
                        </GlowButton>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "coding" && (
            <motion.div key="coding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Solved</p>
                  <p className="text-2xl font-extrabold">{CODING_CHALLENGES.filter(c => c.solved).length}/{CODING_CHALLENGES.length}</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">XP Earned</p>
                  <p className="text-2xl font-extrabold text-primary">{totalXP}</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Streak</p>
                  <p className="text-2xl font-extrabold text-orange-400">{userProfile?.streak || 0}d</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {CODING_CHALLENGES.map((ch, i) => (
                  <motion.div key={ch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${ch.solved ? "glass-card border border-green-500/20" : "glass-card-hover cursor-pointer"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ch.solved ? "bg-green-500/20" : "bg-white/5"}`}>
                      {ch.solved
                        ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                        : <Code2 className="w-5 h-5 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${ch.solved ? "text-muted-foreground line-through" : ""}`}>{ch.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className={`text-[10px] ${diffColor[ch.difficulty]}`}>{ch.difficulty}</Badge>
                        <span className="text-[10px] text-muted-foreground">{ch.tag}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-primary">+{ch.xp} XP</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "subjects" && (
            <motion.div key="subjects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <p className="text-xs text-muted-foreground">একটি subject বেছে নিন এবং practice শুরু করুন</p>
              <div className="grid grid-cols-2 gap-3">
                {SUBJECTS.map((s, i) => (
                  <motion.button key={s.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }} whileTap={{ scale: 0.97 }}
                    className="glass-card-hover rounded-2xl p-4 text-left flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{s.cat}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
