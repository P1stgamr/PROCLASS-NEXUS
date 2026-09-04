import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { AdModal } from "@/components/AdModal";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Code2, FlaskConical, Globe, Calculator, Cpu,
  Clock, Star, Zap, Target, Play, Lock,
  CheckCircle2, BarChart3
} from "lucide-react";
import { MCQ_SUBJECTS } from "@/lib/mcqSubjects";

const CATEGORIES = [
  { id: "all", label: "সব" },
  { id: "ssc", label: "SSC" },
  { id: "hsc", label: "HSC" },
  { id: "code", label: "Coding" },
  { id: "general", label: "General" },
];

const SUBJECT_ICONS = [BookOpen, FlaskConical, Calculator, Globe, Cpu, Code2];
const SUBJECT_COLORS = [
  ["text-blue-400", "bg-blue-500/15"], ["text-purple-400", "bg-purple-500/15"],
  ["text-green-400", "bg-green-500/15"], ["text-yellow-400", "bg-yellow-500/15"],
  ["text-cyan-400", "bg-cyan-500/15"], ["text-orange-400", "bg-orange-500/15"],
];
const SUBJECTS = MCQ_SUBJECTS.map((subject, index) => ({
  ...subject,
  icon: SUBJECT_ICONS[index % SUBJECT_ICONS.length],
  color: SUBJECT_COLORS[index % SUBJECT_COLORS.length][0],
  bg: SUBJECT_COLORS[index % SUBJECT_COLORS.length][1],
  cat: subject.group.toLowerCase(),
}));

const diffColor: Record<string, string> = {
  Easy: "bg-green-500/20 text-green-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Hard: "bg-red-500/20 text-red-400",
};

export default function StudyPage() {
  const { userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("quiz");
  const [activeCat, setActiveCat] = useState("all");
  const [adTarget, setAdTarget] = useState<any | null>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [quizLoading, setQuizLoading] = useState(true);
  const [challengeLoading, setChallengeLoading] = useState(true);

  useEffect(() => {
    const qRef = ref(db, "quizzes");
    const unsub = onValue(qRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        setQuizzes(arr);
      } else {
        setQuizzes([]);
      }
      setQuizLoading(false);
    });
    return () => off(qRef);
  }, []);

  useEffect(() => {
    const cRef = ref(db, "codingChallenges");
    const unsub = onValue(cRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        arr.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setChallenges(arr);
      } else {
        setChallenges([]);
      }
      setChallengeLoading(false);
    });
    return () => off(cRef);
  }, []);

  const filteredQuizzes = activeCat === "all"
    ? quizzes
    : quizzes.filter((q) => q.cat === activeCat);

  const solvedCount = challenges.filter((c) => c.solved).length;
  const totalXP = challenges.filter((c) => c.solved).reduce((s, c) => s + (c.xp || 0), 0);

  const handleStartQuiz = (quiz: any) => {
    if (quiz.premium) {
      toast({ title: "Premium Quiz", description: "এই quiz টি premium — unlock করতে হবে", variant: "destructive" });
      return;
    }
    setAdTarget(quiz);
  };

  const handleAdComplete = () => {
    if (!adTarget) return;
    setAdTarget(null);
    toast({
      title: `${adTarget.title} শুরু হচ্ছে!`,
      description: `${adTarget.questions}টি প্রশ্ন · ${adTarget.duration} মিনিট · +${adTarget.reward} coins`,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <AdModal
        open={!!adTarget}
        title="Ad দেখুন — তারপর quiz শুরু হবে"
        onComplete={handleAdComplete}
        onClose={() => setAdTarget(null)}
      />

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
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id ? "gradient-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                }`}>
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
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5">
                <span className="text-sm">📺</span>
                <p className="text-xs text-yellow-300">Free quiz শুরু করতে একটি Ad দেখতে হবে</p>
              </div>
              <button onClick={() => setLocation("/practice")} className="w-full glass-card-hover rounded-2xl p-4 text-left flex items-center justify-between border border-primary/20 bg-primary/5">
                <div><p className="font-bold text-sm">Model Test & MCQ Practice</p><p className="text-xs text-muted-foreground mt-1">Timed tests, daily quizzes, topic-wise analysis</p></div>
                <Target className="w-5 h-5 text-primary" />
              </button>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activeCat === cat.id ? "gradient-primary text-white" : "glass-card text-muted-foreground hover:text-white"
                    }`}>
                    {cat.label}
                  </button>
                ))}
              </div>

              {quizLoading ? (
                <div className="space-y-3">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <span className="text-5xl">📝</span>
                  <p className="text-base font-bold text-muted-foreground">কোনো quiz নেই</p>
                  <p className="text-xs text-muted-foreground/60">Admin এখনো কোনো quiz তৈরি করেননি।<br/>শীঘ্রই আসছে!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuizzes.map((quiz, i) => (
                    <motion.div key={quiz.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className="glass-card-hover rounded-2xl overflow-hidden">
                      <div className="h-0.5 gradient-primary" />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-sm mb-0.5">{quiz.title}</h3>
                            <p className="text-xs text-muted-foreground">{quiz.subject}</p>
                          </div>
                          <Badge className={`text-[10px] shrink-0 ${diffColor[quiz.difficulty] || "bg-white/10 text-muted-foreground"}`}>
                            {quiz.difficulty}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1"><Target className="w-3 h-3" />{quiz.questions} Q</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.duration} min</span>
                          {quiz.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{quiz.rating}</span>}
                          {quiz.attempts && <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{quiz.attempts}</span>}
                        </div>
                        {quiz.tags && quiz.tags.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            {quiz.tags.map((t: string) => (
                              <span key={t} className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-muted-foreground">{t}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-xs font-bold text-yellow-400">+{quiz.reward || 0} coins</span>
                          </div>
                          <GlowButton size="sm" className="h-8 px-4 text-xs" onClick={() => handleStartQuiz(quiz)}>
                            {quiz.premium
                              ? <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Premium</span>
                              : <span className="flex items-center gap-1"><Play className="w-3 h-3" />📺 Start</span>}
                          </GlowButton>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "coding" && (
            <motion.div key="coding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Solved</p>
                  <p className="text-2xl font-extrabold">{solvedCount}/{challenges.length}</p>
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

              {challengeLoading ? (
                <div className="space-y-3">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>
              ) : challenges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <span className="text-5xl">💻</span>
                  <p className="text-base font-bold text-muted-foreground">কোনো coding challenge নেই</p>
                  <p className="text-xs text-muted-foreground/60">Admin এখনো কোনো challenge তৈরি করেননি।<br/>শীঘ্রই আসছে!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {challenges.map((ch, i) => (
                    <motion.div key={ch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${ch.solved ? "glass-card border border-green-500/20" : "glass-card-hover cursor-pointer"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ch.solved ? "bg-green-500/20" : "bg-white/5"}`}>
                        {ch.solved ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Code2 className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${ch.solved ? "text-muted-foreground line-through" : ""}`}>{ch.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={`text-[10px] ${diffColor[ch.difficulty] || "bg-white/10 text-muted-foreground"}`}>{ch.difficulty}</Badge>
                          {ch.tag && <span className="text-[10px] text-muted-foreground">{ch.tag}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold text-primary">+{ch.xp} XP</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "subjects" && (
            <motion.div key="subjects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <p className="text-xs text-muted-foreground">একটি subject বেছে নিন এবং practice শুরু করুন</p>
              <div className="grid grid-cols-2 gap-3">
                {SUBJECTS.map((s, i) => (
                  <motion.button key={s.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setLocation(`/practice?subject=${s.id}`)}
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
