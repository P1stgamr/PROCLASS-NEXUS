import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Crown, Clock, Users, Trophy, Lock, Zap, CheckCircle2, ChevronDown, ChevronUp, Radio, CalendarClock, CalendarX } from "lucide-react";
import { calcPrizes } from "@/lib/prizeUtils";


type ExamStatus = "upcoming" | "live" | "ended";
function getExamStatus(exam: any): ExamStatus {
  const now = Date.now();
  if (exam.endTime && now > exam.endTime) return "ended";
  if (exam.startTime && now < exam.startTime) return "upcoming";
  return "live";
}

function StatusBadge({ status }: { status: ExamStatus }) {
  if (status === "live") return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />LIVE
    </span>
  );
  if (status === "upcoming") return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
      <CalendarClock className="w-3 h-3" />শীঘ্রই
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-muted-foreground text-[10px] font-bold">
      <CalendarX className="w-3 h-3" />শেষ হয়েছে
    </span>
  );
}

function PrizeBreakdown({ exam }: { exam: any }) {
  const totalPool = (exam.participants || 0) * (exam.entryFee || 0);
  const p = calcPrizes(totalPool);
  const rows = [
    { label: "🥇 ১ম স্থান", amount: p.first, pct: "৪০%" },
    { label: "🥈 ২য় স্থান", amount: p.second, pct: "২০%" },
    { label: "🥉 ৩য় স্থান", amount: p.third, pct: "১০%" },
    { label: "🏅 ৪র্থ–১০ম (each)", amount: p.fourth10Each, pct: "~১.৪%" },
  ];

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-muted-foreground font-medium">Prize Distribution</span>
        <span className="text-green-400 font-bold">Total Pool: ৳{totalPool.toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
            <span className="text-[11px] text-muted-foreground">{r.label}</span>
            <span className="text-[11px] font-bold text-yellow-400">৳{r.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/10">
        <span className="text-[11px] text-muted-foreground">🏦 Platform cut</span>
        <span className="text-[11px] font-bold text-red-400">৳{p.admin.toLocaleString()} (২০%)</span>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        * Prize pool = অংশগ্রহণকারী × Entry fee | আরো join করলে prize বাড়বে
      </p>
    </div>
  );
}

export default function PremiumExamPage() {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinedExams, setJoinedExams] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedPrize, setExpandedPrize] = useState<string | null>(null);

  useEffect(() => {
    const examRef = ref(db, "premiumExams");
    const unsub = onValue(examRef, (snap) => {
      const data = snap.val();
      setExams(data ? Object.values(data) : []);
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
    const status = getExamStatus(exam);
    if (status === "ended") {
      toast({ title: "Exam শেষ হয়েছে", description: "এই exam-এ আর যোগ দেওয়া যাবে না", variant: "destructive" });
      return;
    }
    if (status === "upcoming") {
      const mins = Math.round((exam.startTime - Date.now()) / 60000);
      toast({ title: "Exam এখনো শুরু হয়নি", description: `${mins} মিনিট পরে শুরু হবে`, variant: "destructive" });
      return;
    }
    if (joinedExams.includes(exam.id)) {
      setLocation(exam.modelTest ? `/premium-model-test/${exam.id}` : `/exam-room/${exam.id}`);
    } else {
      setLocation(`/payment/${exam.id}`);
    }
  };

  const filters = ["all", "Math", "Physics", "Programming", "General"];
  const filtered = activeFilter === "all" ? exams : exams.filter((e) => e.category === activeFilter);

  const formatCountdown = (ms: number) => {
    const diff = ms - Date.now();
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} মিনিটে`;
    return `${Math.floor(mins / 60)}ঘণ্টা ${mins % 60}মিনিটে`;
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
            <p className="text-xs text-muted-foreground">টাকা দিন → Exam দিন → Prize জিতুন</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-5">
        {/* Prize system explanation */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-orange-500/10 to-red-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <Crown className="w-8 h-8 text-yellow-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-bold text-sm">Prize Distribution System</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {[
                  { label: "🥇 ১ম", val: "৪০%" },
                  { label: "🥈 ২য়", val: "২০%" },
                  { label: "🥉 ৩য়", val: "১০%" },
                  { label: "🏅 ৪-১০ম", val: "১০% ভাগ" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between bg-white/10 rounded-lg px-2 py-1">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-bold text-yellow-400">{r.val}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                বিকাশে entry fee দিন → Exam দিন → Admin আপনার বিকাশে prize পাঠাবে
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                activeFilter === f ? "bg-yellow-500 text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}>
              {f === "all" ? "সব" : f}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading ? [0, 1, 2].map((i) => <SkeletonCard key={i} />) :
            filtered.map((exam, i) => {
              const isJoined = joinedExams.includes(exam.id);
              const spotsLeft = exam.maxParticipants - exam.participants;
              const fillPercent = Math.round((exam.participants / exam.maxParticipants) * 100);
              const totalPool = exam.participants * exam.entryFee;
              const prizes = calcPrizes(totalPool);
              const isExpanded = expandedPrize === exam.id;
              const examStatus = getExamStatus(exam);
              const isDisabled = examStatus !== "live";

              return (
                <motion.div key={exam.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }} className="glass-card rounded-2xl overflow-hidden">
                  <div className={`h-1 ${examStatus === "live" ? "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" : examStatus === "upcoming" ? "bg-gradient-to-r from-blue-500 to-blue-700" : "bg-white/10"}`} />
                  <div className={`p-5 space-y-4 ${isDisabled ? "opacity-70" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-base">{exam.title}</h3>
                          {isJoined && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                          <StatusBadge status={examStatus} />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{exam.description}</p>
                        {examStatus === "upcoming" && exam.startTime && (
                          <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" />
                            {formatCountdown(exam.startTime)} শুরু হবে
                          </p>
                        )}
                        {examStatus === "live" && exam.endTime && (
                          <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatCountdown(exam.endTime)} পর শেষ হবে
                          </p>
                        )}
                        {examStatus === "ended" && (
                          <p className="text-xs text-muted-foreground mt-1">এই exam শেষ হয়েছে</p>
                        )}
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shrink-0 text-xs">
                        {exam.level}
                      </Badge>
                    </div>

                    {/* Key stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-muted-foreground">Entry Fee</p>
                        <p className="font-bold text-sm text-yellow-400">৳{exam.entryFee}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-muted-foreground">🥇 ১ম Prize</p>
                        <p className="font-bold text-sm text-green-400">৳{prizes.first.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-bold text-sm">{exam.duration} min</p>
                      </div>
                    </div>

                    {/* Prize pool total highlight */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-semibold">Total Prize Pool</span>
                      </div>
                      <span className="text-lg font-extrabold text-yellow-400">৳{totalPool.toLocaleString()}</span>
                    </div>

                    {/* Participants */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{exam.participants} joined</span>
                        <span>{spotsLeft} spots left</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                          style={{ width: `${fillPercent}%` }} />
                      </div>
                    </div>

                    {/* Expandable prize breakdown */}
                    <button onClick={() => setExpandedPrize(isExpanded ? null : exam.id)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? "Prize breakdown লুকান" : "Prize breakdown দেখুন"}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <PrizeBreakdown exam={exam} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs">
                        {examStatus === "live" && exam.endTime && (
                          <span className="flex items-center gap-1 text-green-400">
                            <Radio className="w-3 h-3 animate-pulse" />
                            শেষ: {new Date(exam.endTime).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {examStatus === "upcoming" && exam.startTime && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <Clock className="w-3 h-3" />
                            শুরু: {formatCountdown(exam.startTime)}
                          </span>
                        )}
                        {examStatus === "ended" && (
                          <span className="text-muted-foreground">Exam শেষ</span>
                        )}
                      </div>
                      <GlowButton size="sm"
                        glowColor={isJoined && !isDisabled ? "blue" : "purple"}
                        className={`h-9 px-5 text-xs ${isDisabled ? "opacity-50" : ""}`}
                        onClick={() => handleJoin(exam)}>
                        {examStatus === "ended"
                          ? <><CalendarX className="w-3.5 h-3.5 mr-1" />শেষ হয়েছে</>
                          : examStatus === "upcoming"
                          ? <><CalendarClock className="w-3.5 h-3.5 mr-1" />শীঘ্রই</>
                          : isJoined
                          ? <><Zap className="w-3.5 h-3.5 mr-1" />Exam দিন</>
                          : <><Lock className="w-3.5 h-3.5 mr-1" />৳{exam.entryFee} দিয়ে ঢুকুন</>}
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
