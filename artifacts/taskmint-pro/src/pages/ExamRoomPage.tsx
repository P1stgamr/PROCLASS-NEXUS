import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off, set, push } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, XCircle, Trophy, ArrowRight } from "lucide-react";

const SAMPLE_QUESTIONS = [
  {
    id: "q1",
    question: "নিচের কোনটি মৌলিক সংখ্যা?",
    options: ["1", "4", "7", "9"],
    correct: 2,
    points: 10,
  },
  {
    id: "q2",
    question: "বাংলাদেশের রাজধানীর নাম কি?",
    options: ["চট্টগ্রাম", "ঢাকা", "সিলেট", "রাজশাহী"],
    correct: 1,
    points: 10,
  },
  {
    id: "q3",
    question: "পানির রাসায়নিক সংকেত কি?",
    options: ["CO2", "H2O", "O2", "NaCl"],
    correct: 1,
    points: 10,
  },
  {
    id: "q4",
    question: "Python কোন ধরনের programming language?",
    options: ["Compiled", "Machine-level", "Interpreted", "Assembly"],
    correct: 2,
    points: 10,
  },
  {
    id: "q5",
    question: "2^10 = ?",
    options: ["512", "1024", "2048", "256"],
    correct: 1,
    points: 10,
  },
];

export default function ExamRoomPage() {
  const params = useParams<{ examId: string }>();
  const [, setLocation] = useLocation();
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const examId = params?.examId || "";

  const [questions, setQuestions] = useState(SAMPLE_QUESTIONS);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [examEnded, setExamEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [examTitle, setExamTitle] = useState("Premium Exam");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const dbRef = ref(db, `premiumExams/${examId}`);
    const unsub = onValue(dbRef, (snap) => {
      const data = snap.val();
      if (data) {
        setExamTitle(data.title);
        setTimeLeft(data.duration * 60);
        if (data.questions) setQuestions(Object.values(data.questions));
      }
    });
    return () => off(dbRef);
  }, [examId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          submitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const newAnswers = { ...answers, [questions[current].id]: idx };
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
    } else {
      submitExam();
    }
  };

  const submitExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalAnswers = answers;
    let total = 0;
    questions.forEach((q) => {
      if (finalAnswers[q.id] === q.correct) total += q.points;
    });
    setScore(total);
    setExamEnded(true);

    if (!currentUser) return;
    try {
      await set(ref(db, `examResults/${examId}/${currentUser.uid}`), {
        uid: currentUser.uid,
        name: userProfile?.name || "Student",
        score: total,
        totalPossible: questions.reduce((s, q) => s + q.points, 0),
        submittedAt: Date.now(),
        answers: finalAnswers,
      });
    } catch {}
  };

  const totalPossible = questions.reduce((s, q) => s + q.points, 0);
  const percentage = Math.round((score / totalPossible) * 100);
  const timerPercent = (timeLeft / 1800) * 100;
  const isUrgent = timeLeft < 120;

  if (examEnded) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center border-4 ${
            percentage >= 60 ? "border-green-500 bg-green-500/20" : "border-red-500/50 bg-red-500/10"
          }`}>
            {percentage >= 60 ? (
              <Trophy className="w-12 h-12 text-yellow-400" />
            ) : (
              <XCircle className="w-12 h-12 text-red-400" />
            )}
          </div>

          <div>
            <h2 className="text-3xl font-extrabold">{score}/{totalPossible}</h2>
            <p className="text-muted-foreground mt-1">
              {percentage >= 80 ? "অসাধারণ! 🎉" : percentage >= 60 ? "ভালো করেছেন!" : "আরও practice করুন"}
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl space-y-3 text-left">
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
            {percentage >= 60 && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mt-2">
                <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-xs text-yellow-300">
                  Leaderboard দেখুন — জিতলে Admin আপনার বিকাশে prize পাঠাবে!
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <GlowButton className="w-full h-12" onClick={() => setLocation("/premium-exams")}>
              Exams-এ ফিরে যান
            </GlowButton>
            <button
              className="text-sm text-muted-foreground hover:text-white transition-colors"
              onClick={() => setLocation("/home")}
            >
              Home-এ যান
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/5 px-5 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground line-clamp-1">{examTitle}</p>
              <p className="text-xs font-medium text-primary">
                {current + 1} / {questions.length} প্রশ্ন
              </p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
              isUrgent ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <Progress
            value={((current + 1) / questions.length) * 100}
            className="h-1.5"
          />
        </div>
      </div>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div className="glass-card p-5 rounded-2xl">
              <div className="flex items-start gap-3">
                <Badge className="bg-primary/20 text-primary border-primary/30 shrink-0 text-xs">
                  Q{current + 1}
                </Badge>
                <h3 className="font-semibold text-base leading-relaxed">{q.question}</h3>
              </div>
              <p className="text-xs text-yellow-500 mt-2 ml-0">+{q.points} points</p>
            </div>

            <div className="space-y-3">
              {q.options.map((option, i) => {
                const isSelected = selected === i;
                const isCorrect = selected !== null && i === q.correct;
                const isWrong = selected !== null && isSelected && i !== q.correct;

                return (
                  <motion.button
                    key={i}
                    whileHover={selected === null ? { scale: 1.01 } : {}}
                    whileTap={selected === null ? { scale: 0.99 } : {}}
                    onClick={() => handleAnswer(i)}
                    disabled={selected !== null}
                    className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${
                      isCorrect
                        ? "bg-green-500/20 border border-green-500/50 text-green-300"
                        : isWrong
                        ? "bg-red-500/20 border border-red-500/50 text-red-300"
                        : isSelected
                        ? "bg-primary/20 border border-primary/50"
                        : "glass-card hover:bg-white/10 border border-transparent"
                    }`}
                    data-testid={`option-${i}`}
                  >
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ${
                      isCorrect ? "border-green-500 bg-green-500/30" :
                      isWrong ? "border-red-500 bg-red-500/30" :
                      isSelected ? "border-primary bg-primary/30" :
                      "border-white/20"
                    }`}>
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
        <GlowButton
          className="w-full h-12"
          onClick={handleNext}
          disabled={selected === null}
          data-testid="btn-next-question"
        >
          {current === questions.length - 1 ? "Submit করুন" : (
            <><ArrowRight className="w-4 h-4 mr-2" />পরের প্রশ্ন</>
          )}
        </GlowButton>
      </div>
    </div>
  );
}
