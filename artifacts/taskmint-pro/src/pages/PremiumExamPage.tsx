import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ref, onValue, off, set, get } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Crown, Clock, Users, Trophy, Lock, Zap, CheckCircle2 } from "lucide-react";

const SAMPLE_EXAMS = [
  {
    id: "exam1",
    title: "SSC Math Championship",
    description: "SSC level math exam — top scorer wins prize pool. 30 MCQ questions.",
    entryFee: 20,
    currency: "BDT",
    prizePool: 500,
    duration: 30,
    totalQuestions: 30,
    participants: 24,
    maxParticipants: 100,
    category: "Math",
    status: "open",
    startTime: Date.now() + 3600000,
    level: "SSC",
  },
  {
    id: "exam2",
    title: "HSC Physics Showdown",
    description: "Advanced physics exam for HSC students. Winner takes 70% of prize pool.",
    entryFee: 50,
    currency: "BDT",
    prizePool: 1500,
    duration: 45,
    totalQuestions: 40,
    participants: 18,
    maxParticipants: 50,
    category: "Physics",
    status: "open",
    startTime: Date.now() + 7200000,
    level: "HSC",
  },
  {
    id: "exam3",
    title: "Programming Quiz Cup",
    description: "Python & JS quiz for programmers. Top 3 win prizes.",
    entryFee: 30,
    currency: "BDT",
    prizePool: 800,
    duration: 25,
    totalQuestions: 25,
    participants: 41,
    maxParticipants: 100,
    category: "Programming",
    status: "open",
    startTime: Date.now() + 1800000,
    level: "All",
  },
  {
    id: "exam4",
    title: "General Knowledge Grand Prix",
    description: "Test your general knowledge across all subjects. Open to everyone.",
    entryFee: 10,
    currency: "BDT",
    prizePool: 300,
    duration: 20,
    totalQuestions: 20,
    participants: 67,
    maxParticipants: 200,
    category: "General",
    status: "open",
    startTime: Date.now() + 900000,
    level: "All",
  },
];

export default function PremiumExamPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinedExams, setJoinedExams] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    const examRef = ref(db, "premiumExams");
    const unsub = onValue(examRef, (snap) => {
      const data = snap.val();
      setExams(data ? Object.values(data) : SAMPLE_EXAMS);
      setLoading(false);
    });
    return () => off(examRef);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const entryRef = ref(db, `examEntries/${currentUser.uid}`);
    const unsub = onValue(entryRef, (snap) => {
      const data = snap.val();
      if (data) setJoinedExams(Object.keys(data));
    });
    return () => off(entryRef);
  }, [currentUser]);

  const handleJoin = (exam: any) => {
    if (!currentUser) return;
    if (joinedExams.includes(exam.id)) {
      setLocation(`/exam-room/${exam.id}`);
      return;
    }
    setLocation(`/payment/${exam.id}`);
  };

  const filters = ["all", "Math", "Physics", "Programming", "General"];
  const filtered = activeFilter === "all" ? exams : exams.filter((e) => e.category === activeFilter);

  const formatTime = (ms: number) => {
    const mins = Math.floor((ms - Date.now()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Premium Exams</h1>
            <p className="text-xs text-muted-foreground">টাকা দিয়ে ঢুকুন, জিতলে পুরস্কার নিন</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-orange-500/10 to-red-500/10 border border-yellow-500/20"
        >
          <div className="flex items-start gap-3">
            <Crown className="w-8 h-8 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">কীভাবে কাজ করে?</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                বিকাশে entry fee দিন → Exam দিন → সবচেয়ে বেশি নম্বর পেলে Admin আপনার বিকাশে prize পাঠাবে।
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                activeFilter === f
                  ? "bg-yellow-500 text-black"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {f === "all" ? "সব" : f}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading ? (
            [0, 1, 2].map((i) => <SkeletonCard key={i} />)
          ) : filtered.map((exam, i) => {
            const isJoined = joinedExams.includes(exam.id);
            const spotsLeft = exam.maxParticipants - exam.participants;
            const fillPercent = Math.round((exam.participants / exam.maxParticipants) * 100);

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass-card rounded-2xl overflow-hidden relative"
              >
                <div className="h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-base">{exam.title}</h3>
                        {isJoined && (
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {exam.description}
                      </p>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shrink-0 text-xs">
                      {exam.level}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Entry Fee</p>
                      <p className="font-bold text-sm text-yellow-400">৳{exam.entryFee}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Prize Pool</p>
                      <p className="font-bold text-sm text-green-400">৳{exam.prizePool}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-bold text-sm">{exam.duration} min</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />{exam.participants} joined
                      </span>
                      <span>{spotsLeft} spots left</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>শুরু হবে: {formatTime(exam.startTime)}</span>
                    </div>
                    <GlowButton
                      size="sm"
                      glowColor={isJoined ? "blue" : "purple"}
                      className="h-9 px-5 text-xs"
                      onClick={() => handleJoin(exam)}
                      data-testid={`btn-join-exam-${exam.id}`}
                    >
                      {isJoined ? (
                        <><Zap className="w-3.5 h-3.5 mr-1" />Exam দিন</>
                      ) : (
                        <><Lock className="w-3.5 h-3.5 mr-1" />৳{exam.entryFee} দিয়ে ঢুকুন</>
                      )}
                    </GlowButton>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
