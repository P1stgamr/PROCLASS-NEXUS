import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off, set, get } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, XCircle, Trophy, ArrowRight, Medal, Crown } from "lucide-react";
import { calcPrizes, getRankPrize } from "@/lib/prizeUtils";
import { endExamMode, startExamMode } from "@/lib/examMode";
import { isTeacherRole } from "@/lib/roles";


function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-3xl">🥇</span>;
  if (rank === 2) return <span className="text-3xl">🥈</span>;
  if (rank === 3) return <span className="text-3xl">🥉</span>;
  if (rank <= 10) return <span className="text-3xl">🏅</span>;
  return <span className="text-3xl">📊</span>;
}

export default function ExamRoomPage() {
  const params = useParams<{ examId: string }>();
  const [, setLocation] = useLocation();
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const examId = params?.examId || "";

  const [questions, setQuestions] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [examEnded, setExamEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [examTitle, setExamTitle] = useState("Premium Exam");
  const [examData, setExamData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<number>(0);
  const [myPrize, setMyPrize] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTeacher = isTeacherRole(userProfile?.role);

  useEffect(() => {
    if (isTeacher) return;
    startExamMode(examId);
    const dbRef = ref(db, `premiumExams/${examId}`);
    const unsub = onValue(dbRef, (snap) => {
      const data = snap.val();
      if (data) {
        startExamMode(examId, Math.max(60, Number(data.duration || 180)) * 60 * 1000);
        setExamData(data);
        setExamTitle(data.title);
        setTimeLeft(data.duration * 60);
         if (data.questions) setQuestions(Object.entries(data.questions).map(([id, value]: [string, any]) => ({ id, ...value })));
       }
    }, () => {
      toast({ title: "Exam could not be loaded", description: "Please return to the exam list and try again.", variant: "destructive" });
      setExamEnded(true);
    });
    return () => off(dbRef);
  }, [examId, isTeacher, toast]);

  useEffect(() => {
    if (isTeacher) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTeacher]);

  if (isTeacher) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="glass-card rounded-3xl p-6 max-w-sm text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-yellow-400" />
          <h1 className="text-xl font-extrabold">Students only</h1>
          <p className="text-sm text-muted-foreground mt-2">Teachers cannot take student exams.</p>
          <GlowButton className="mt-5" onClick={() => setLocation("/community")}>Go to Community</GlowButton>
        </div>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setAnswers((prev) => ({ ...prev, [questions[current].id]: idx }));
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
    } else {
      handleSubmitExam();
    }
  };

  const handleSubmitExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    endExamMode(examId);
    let total = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct) total += q.points;
    });
    setScore(total);

    if (!currentUser) { setExamEnded(true); return; }

    try {
      await set(ref(db, `examResults/${examId}/${currentUser.uid}`), {
        uid: currentUser.uid,
        name: userProfile?.name || "Student",
        bkashNumber: userProfile?.bkashNumber || "",
        score: total,
        totalPossible: questions.reduce((s, q) => s + q.points, 0),
        submittedAt: Date.now(),
      });

      // fetch leaderboard
      const snap = await get(ref(db, `examResults/${examId}`));
      if (snap.exists()) {
        const results = Object.values(snap.val()) as any[];
        const sorted = results.sort((a, b) => b.score - a.score || a.submittedAt - b.submittedAt);
        setLeaderboard(sorted.slice(0, 10));
        const rank = sorted.findIndex((r) => r.uid === currentUser.uid) + 1;
        setMyRank(rank);
        const participants = examData?.participants || sorted.length;
        const entryFee = examData?.entryFee || 0;
        const totalPool = participants * entryFee;
        setMyPrize(getRankPrize(rank, totalPool));
      }
    } catch {}
    setExamEnded(true);
  };

  const totalPossible = questions.reduce((s, q) => s + q.points, 0);
  const percentage = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;
  const isUrgent = timeLeft < 120;

  if (examEnded) {
    const totalPool = (examData?.participants || 0) * (examData?.entryFee || 0);
    const prizes = calcPrizes(totalPool);

    return (
      <div className="min-h-screen bg-background overflow-y-auto pb-10">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm mx-auto px-5 pt-10 space-y-5">

          {/* Score card */}
          <div className="text-center space-y-3">
            <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center border-4 ${
              percentage >= 60 ? "border-green-500 bg-green-500/20" : "border-red-500/50 bg-red-500/10"}`}>
              {percentage >= 60
                ? <Trophy className="w-12 h-12 text-yellow-400" />
                : <XCircle className="w-12 h-12 text-red-400" />}
            </div>
            <div>
              <h2 className="text-3xl font-extrabold">{score}/{totalPossible}</h2>
              <p className="text-muted-foreground">
                {percentage >= 80 ? "অসাধারণ! 🎉" : percentage >= 60 ? "ভালো করেছেন!" : "আরও practice করুন"}
              </p>
            </div>
          </div>

          {/* Rank & Prize card */}
          {myRank > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className={`glass-card rounded-2xl p-5 text-center border ${
                myRank <= 3 ? "border-yellow-500/30 bg-yellow-500/5" :
                myRank <= 10 ? "border-primary/30" : "border-white/10"}`}>
              <RankBadge rank={myRank} />
              <p className="text-2xl font-extrabold mt-2">
                {myRank}{myRank === 1 ? "ম" : myRank === 2 ? "য়" : myRank === 3 ? "য়" : "র্থ"} স্থান
              </p>
              {myPrize > 0 ? (
                <>
                  <p className="text-muted-foreground text-sm mt-1">আপনার prize</p>
                  <p className="text-3xl font-extrabold text-green-400 mt-1">৳{myPrize.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Admin শীঘ্রই আপনার বিকাশে prize পাঠাবে
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm mt-2">
                  {myRank <= 10 ? `আপনি top 10-এ আছেন!` : "আপনি prize পাননি — আবার চেষ্টা করুন!"}
                </p>
              )}
            </motion.div>
          )}

          {/* Stats */}
          <div className="glass-card p-5 rounded-2xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">সঠিক উত্তর</span>
              <span className="text-green-400 font-bold">
                {questions.filter((q) => answers[q.id] === q.correct).length}/{questions.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span className="font-bold">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {/* Top 10 Leaderboard */}
          {leaderboard.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="glass-card rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                <h3 className="font-bold text-sm">Leaderboard (Top 10)</h3>
              </div>
              <div className="divide-y divide-white/5">
                {leaderboard.map((r, i) => {
                  const rank = i + 1;
                  const prize = getRankPrize(rank, totalPool);
                  const isMe = r.uid === currentUser?.uid;
                  return (
                    <div key={r.uid} className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-primary/10" : ""}`}>
                      <span className="w-6 text-center text-sm">
                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isMe ? "text-primary" : ""}`}>
                          {r.name}{isMe ? " (আপনি)" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.score} pts</p>
                      </div>
                      {prize > 0 && (
                        <span className="text-xs font-bold text-green-400">৳{prize.toLocaleString()}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Prize breakdown */}
          {totalPool > 0 && (
            <div className="glass-card rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Prize Breakdown</p>
              {[
                { label: "🥇 ১ম", val: prizes.first },
                { label: "🥈 ২য়", val: prizes.second },
                { label: "🥉 ৩য়", val: prizes.third },
                { label: "🏅 ৪–১০ম (each)", val: prizes.fourth10Each },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-bold text-yellow-400">৳{r.val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <GlowButton className="w-full h-12" onClick={() => setLocation("/premium-exams")}>
              Exams-এ ফিরে যান
            </GlowButton>
            <button className="text-sm text-muted-foreground hover:text-white transition-colors"
              onClick={() => setLocation("/home")}>
              Home-এ যান
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const q = questions[current];
  if (!q) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading exam questions…</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/5 px-5 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground line-clamp-1">{examTitle}</p>
              <p className="text-xs font-medium text-primary">{current + 1} / {questions.length} প্রশ্ন</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
              isUrgent ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"}`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <Progress value={((current + 1) / questions.length) * 100} className="h-1.5" />
        </div>
      </div>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="space-y-5">
            <div className="glass-card p-5 rounded-2xl">
              <div className="flex items-start gap-3">
                <Badge className="bg-primary/20 text-primary border-primary/30 shrink-0 text-xs">Q{current + 1}</Badge>
                <h3 className="font-semibold text-base leading-relaxed">{q.question}</h3>
              </div>
              <p className="text-xs text-yellow-500 mt-2">+{q.points} points</p>
            </div>

            <div className="space-y-3">
              {q.options.map((option: string, i: number) => {
                const isSelected = selected === i;
                const isCorrect = selected !== null && i === q.correct;
                const isWrong = selected !== null && isSelected && i !== q.correct;
                return (
                  <motion.button key={i}
                    whileHover={selected === null ? { scale: 1.01 } : {}}
                    whileTap={selected === null ? { scale: 0.99 } : {}}
                    onClick={() => handleAnswer(i)}
                    disabled={selected !== null}
                    className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${
                      isCorrect ? "bg-green-500/20 border border-green-500/50 text-green-300" :
                      isWrong ? "bg-red-500/20 border border-red-500/50 text-red-300" :
                      isSelected ? "bg-primary/20 border border-primary/50" :
                      "glass-card hover:bg-white/10 border border-transparent"}`}>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ${
                      isCorrect ? "border-green-500 bg-green-500/30" :
                      isWrong ? "border-red-500 bg-red-500/30" :
                      isSelected ? "border-primary bg-primary/30" : "border-white/20"}`}>
                      {isCorrect ? <CheckCircle2 className="w-4 h-4" /> :
                       isWrong ? <XCircle className="w-4 h-4" /> :
                       String.fromCharCode(65 + i)}
                    </div>
                    <span className="font-medium text-sm">{option}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-5 pb-8 pt-4 max-w-md mx-auto w-full">
        <GlowButton className="w-full h-12" onClick={handleNext} disabled={selected === null}>
          {current === questions.length - 1 ? "Submit করুন" : <><ArrowRight className="w-4 h-4 mr-2" />পরের প্রশ্ন</>}
        </GlowButton>
      </div>
    </div>
  );
}
