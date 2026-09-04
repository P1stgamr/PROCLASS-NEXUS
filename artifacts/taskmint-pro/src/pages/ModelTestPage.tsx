import { useEffect, useMemo, useRef, useState } from "react";
import { get, ref, set } from "firebase/database";
import { useLocation, useParams } from "wouter";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Bookmark, CheckCircle2, Clock3, Flag,
  Crown, LayoutGrid, Send, XCircle
} from "lucide-react";

type Question = {
  id: string;
  question: string;
  options: string[];
  correct: number;
  points?: number;
  topic?: string;
  difficulty?: string;
  explanation?: string;
};

type TestConfig = {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  questionCount?: number;
  duration?: number;
  durationMinutes?: number;
  negativeMarking?: boolean;
  negativeMarkValue?: number;
  premium?: boolean;
  mode?: string;
  reward?: number;
};

const SUBJECT_LABELS: Record<string, string> = {
  math: "Mathematics", physics: "Physics", chemistry: "Chemistry",
  biology: "Biology", english: "English", ict: "ICT",
  python: "Python", js: "JavaScript", cpp: "C++", gk: "General Knowledge",
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeQuestion(id: string, raw: any): Question | null {
  const options = Array.isArray(raw?.options)
    ? raw.options.map(String).filter(Boolean)
    : [raw?.optionA, raw?.optionB, raw?.optionC, raw?.optionD].map(String).filter((v) => v && v !== "undefined");
  if (!raw || !raw.question || options.length < 2) return null;
  const correctRaw = raw.correct ?? raw.correctAnswer ?? raw.answer;
  let correct = Number(correctRaw);
  if (!Number.isFinite(correct)) {
    const letter = String(correctRaw || "").trim().toUpperCase();
    correct = "ABCD".indexOf(letter);
    if (correct < 0) correct = options.findIndex((option: string) => option === String(correctRaw));
  }
  if (correct >= 1 && correct <= options.length && String(correctRaw).trim() !== "0") correct -= 1;
  if (correct < 0 || correct >= options.length) return null;
  return {
    id,
    question: String(raw.question),
    options,
    correct,
    points: Number(raw.points) || 1,
    topic: raw.topic || "General",
    difficulty: raw.difficulty || "Medium",
    explanation: raw.explanation || "",
  };
}

export default function ModelTestPage() {
  const params = useParams<{ testId?: string }>();
  const [location, setLocation] = useLocation();
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const isPremium = location.startsWith("/premium-model-test");
  const isDaily = location.startsWith("/daily-quiz");
  const isSubjectPractice = params?.testId === "subject-practice";
  const testId = params?.testId || (isSubjectPractice ? "subject-practice" : "");
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  const markedRef = useRef(marked);
  const questionsRef = useRef(questions);
  const timeLeftRef = useRef(timeLeft);

  const queryParams = new URLSearchParams(window.location.search);
  const querySubject = queryParams.get("subject") || "math";
  const subjectLabel = SUBJECT_LABELS[config?.subject || querySubject] || config?.subject || "Question Bank";

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { markedRef.current = marked; }, [marked]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const path = isPremium ? "premiumExams" : isDaily ? "quizSchedules" : "modelTests";
      let loadedConfig: TestConfig | null = null;
      if (!isSubjectPractice) {
        const snapshot = await get(ref(db, `${path}/${testId}`));
        if (snapshot.exists()) loadedConfig = { id: testId, ...snapshot.val() };
      } else {
        loadedConfig = {
          id: "subject-practice",
          title: `${SUBJECT_LABELS[querySubject] || querySubject} Question Practice`,
          description: "Question bank থেকে নিজের গতিতে practice করুন।",
          subject: querySubject,
          questionCount: Number(queryParams.get("count")) || 25,
          duration: Number(queryParams.get("duration")) || 30,
          topic: queryParams.get("topic") || "",
          difficulty: queryParams.get("difficulty") || "all",
          mode: "practice",
          negativeMarking: false,
        };
      }
      if (!loadedConfig) {
        setLoading(false);
        return;
      }
      if (isPremium && currentUser) {
        const entrySnapshot = await get(ref(db, `examEntries/${currentUser.uid}/${testId}`));
        if (!entrySnapshot.exists() || entrySnapshot.val()?.approved !== true) {
          if (!cancelled) { setConfig(loadedConfig); setLocked(true); setLoading(false); }
          return;
        }
      }
      const subject = loadedConfig.subject || querySubject;
      const bankSnapshot = await get(ref(db, `questionBank/${subject}`));
      const bank = bankSnapshot.exists() ? bankSnapshot.val() : {};
      let available = Object.entries(bank)
        .map(([id, raw]) => normalizeQuestion(id, raw))
        .filter((q): q is Question => Boolean(q));
      if (loadedConfig.topic) available = available.filter((q) => q.topic?.toLowerCase() === String(loadedConfig?.topic).toLowerCase());
      if (loadedConfig.difficulty && loadedConfig.difficulty !== "all") {
        available = available.filter((q) => q.difficulty?.toLowerCase() === String(loadedConfig?.difficulty).toLowerCase());
      }
      const selected = shuffle(available).slice(0, Math.min(Number(loadedConfig.questionCount) || 25, 100));
      if (!cancelled) {
        setConfig(loadedConfig);
        setQuestions(selected);
        setTimeLeft((Number(loadedConfig.durationMinutes || loadedConfig.duration) || 30) * 60);
        setStartedAt(Date.now());
        setLoading(false);
      }
    }
    load().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [testId, isPremium, isDaily, isSubjectPractice, querySubject, currentUser?.uid]);

  useEffect(() => {
    if (!testId || !currentUser || !questions.length) return;
    const saved = localStorage.getItem(`taskmint:attempt:${currentUser.uid}:${testId}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setAnswers(parsed.answers || {});
      setMarked(parsed.marked || {});
      setTimeLeft(parsed.timeLeft || timeLeft);
    } catch { /* ignore malformed local recovery data */ }
  }, [testId, currentUser?.uid, questions.length]);
  useEffect(() => {
    if (testId && currentUser && questions.length && !submittedRef.current) {
      localStorage.setItem(`taskmint:attempt:${currentUser.uid}:${testId}`, JSON.stringify({ answers, marked, timeLeft }));
    }
  }, [answers, marked, timeLeft, testId, currentUser?.uid, questions.length]);

  const submit = async (expired = false) => {
    if (submittedRef.current || submitting || !currentUser || !config || !questions.length) return;
    submittedRef.current = true;
    setSubmitting(true);
    const finalAnswers = answersRef.current;
    const finalMarked = markedRef.current;
    const totalPossible = questions.reduce((sum, q) => sum + (q.points || 1), 0);
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    const subjectStats: Record<string, any> = {};
    const topicStats: Record<string, any> = {};
    questions.forEach((q) => {
      const key = q.topic || subjectLabel;
      const bucket = topicStats[key] || { total: 0, correct: 0, wrong: 0, unanswered: 0 };
      bucket.total += 1;
      const subjectBucket = subjectStats[subjectLabel] || { total: 0, correct: 0, wrong: 0, unanswered: 0 };
      subjectBucket.total += 1;
      const answer = finalAnswers[q.id];
      if (answer === undefined) {
        bucket.unanswered += 1;
        subjectBucket.unanswered += 1;
      } else if (answer === q.correct) {
        score += q.points || 1;
        correctCount += 1;
        bucket.correct += 1;
        subjectBucket.correct += 1;
      } else {
        score -= config.negativeMarking ? (Number(config.negativeMarkValue) || 0.25) : 0;
        wrongCount += 1;
        bucket.wrong += 1;
        subjectBucket.wrong += 1;
      }
      topicStats[key] = bucket;
      subjectStats[subjectLabel] = subjectBucket;
    });
    const unanswered = questions.length - correctCount - wrongCount;
    const timeTaken = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    const result = {
      uid: currentUser.uid,
      name: userProfile?.name || "Student",
      testId,
      title: config.title,
      score: Math.round(score * 100) / 100,
      totalPossible,
      percentage: totalPossible ? Math.round((score / totalPossible) * 1000) / 10 : 0,
      correctCount,
      wrongCount,
      unanswered,
      totalQuestions: questions.length,
      timeTaken,
      expired,
      answers: finalAnswers,
      marked: finalMarked,
      subjectStats,
      topicStats,
      submittedAt: Date.now(),
      reward: Number(config.reward) || 0,
    };
    try {
      await set(ref(db, `examResults/${testId}/${currentUser.uid}`), result);
      localStorage.removeItem(`taskmint:attempt:${currentUser.uid}:${testId}`);
      setLocation(`/practice-result/${testId}`);
    } catch (error: any) {
      submittedRef.current = false;
      toast({ title: "Result save হয়নি", description: error?.message || "আবার চেষ্টা করুন", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };
  const requestSubmit = () => {
    const unanswered = questions.length - Object.keys(answersRef.current).length;
    if (unanswered > 0 && !window.confirm(`${unanswered}টি প্রশ্ন unanswered আছে। তবুও submit করবেন?`)) return;
    void submit();
  };

  useEffect(() => {
    if (loading || !questions.length || submittedRef.current) return;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void submit(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, questions.length, config?.id]);

  const answeredCount = Object.keys(answers).length;
  const question = questions[current];
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;
  const isUrgent = timeLeft <= 120;
  const backPath = isPremium ? "/premium-exams" : "/study";

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">প্রশ্ন প্রস্তুত হচ্ছে…</div>;
  if (locked && config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div className="glass-card rounded-2xl p-7 max-w-sm"><Crown className="w-10 h-10 text-yellow-400 mx-auto mb-3" /><h2 className="text-lg font-bold">Premium access দরকার</h2><p className="text-sm text-muted-foreground mt-2">এই model test শুরু করতে আগে bKash payment submit করুন এবং admin approval নিন।</p><GlowButton className="mt-5 w-full" onClick={() => setLocation(`/payment/${testId}`)}>Payment page-এ যান</GlowButton></div>
      </div>
    );
  }
  if (!config || !questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div className="glass-card rounded-2xl p-7 max-w-sm">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold">এই test-এর জন্য প্রশ্ন পাওয়া যায়নি</h2>
          <p className="text-sm text-muted-foreground mt-2">Admin question bank-এ প্রশ্ন যোগ করলে এটি এখানে দেখা যাবে।</p>
          <GlowButton className="mt-5" onClick={() => setLocation(backPath)}>ফিরে যান</GlowButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation(backPath)} className="p-2 rounded-xl hover:bg-white/10" aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{subjectLabel}</p>
              <h1 className="font-bold truncate">{config.title}</h1>
            </div>
            <div className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono font-bold text-sm ${isUrgent ? "bg-red-500/20 text-red-300" : "bg-primary/15 text-primary"}`} aria-live={isUrgent ? "polite" : "off"}>
              <Clock3 className="w-4 h-4" /> {formatTime(timeLeft)}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>{current + 1} / {questions.length} প্রশ্ন</span>
            <span>{answeredCount} answered · {Object.keys(marked).length} review</span>
          </div>
          <Progress value={progress} className="h-1.5 mt-2" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_280px] gap-5 px-4 py-5">
        <section className="min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <Badge className="bg-primary/15 text-primary border-primary/25">{question.topic || "General"} · {question.difficulty}</Badge>
            <button onClick={() => setMarked((prev) => ({ ...prev, [question.id]: !prev[question.id] }))} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${marked[question.id] ? "bg-yellow-500/20 text-yellow-300" : "bg-white/5 text-muted-foreground"}`} aria-pressed={Boolean(marked[question.id])}>
              <Bookmark className="w-3.5 h-3.5" /> {marked[question.id] ? "Marked" : "Review"}
            </button>
          </div>
          <div className="glass-card rounded-2xl p-5 md:p-7">
            <div className="flex gap-3">
              <span className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">{current + 1}</span>
              <h2 className="text-lg md:text-xl font-bold leading-relaxed">{question.question}</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-4">সঠিক উত্তরে {question.points || 1} point{config.negativeMarking ? ` · ভুল হলে -${config.negativeMarkValue || 0.25}` : ""}</p>
          </div>
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const chosen = answers[question.id] === index;
              return (
                <button key={`${question.id}-${index}`} onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: index }))} className={`w-full min-h-14 p-4 rounded-2xl text-left flex items-center gap-3 border transition-all ${chosen ? "bg-primary/20 border-primary/60" : "glass-card border-transparent hover:border-white/20"}`} aria-pressed={chosen}>
                  <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ${chosen ? "bg-primary text-white border-primary" : "border-white/20 text-muted-foreground"}`}>{String.fromCharCode(65 + index)}</span>
                  <span className="text-sm font-medium">{option}</span>
                  {chosen && <CheckCircle2 className="w-4 h-4 ml-auto text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          {config.mode === "practice" && answers[question.id] !== undefined && question.explanation && (
            <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4 text-sm">
              <p className="font-bold text-blue-300 mb-1">ব্যাখ্যা</p>
              <p className="text-muted-foreground leading-relaxed">{question.explanation}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setAnswers((prev) => { const next = { ...prev }; delete next[question.id]; return next; })} disabled={answers[question.id] === undefined} className="px-4 rounded-xl bg-white/5 text-xs text-muted-foreground disabled:opacity-40">
              উত্তর clear
            </button>
            <div className="flex-1" />
            <GlowButton glowColor="none" className="bg-white/10 hover:bg-white/15" onClick={() => setCurrent((value) => Math.max(0, value - 1))} disabled={current === 0}><ArrowLeft className="w-4 h-4 mr-1" />Back</GlowButton>
            {current === questions.length - 1
              ? <GlowButton onClick={requestSubmit} disabled={submitting}><Send className="w-4 h-4 mr-1" />Submit</GlowButton>
              : <GlowButton onClick={() => setCurrent((value) => Math.min(questions.length - 1, value + 1))}>Next<ArrowRight className="w-4 h-4 ml-1" /></GlowButton>}
          </div>
        </section>

        <aside className={`lg:block ${navigatorOpen ? "block" : "hidden"} lg:sticky lg:top-28 lg:self-start`}>
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div><p className="font-bold text-sm">Question navigator</p><p className="text-[10px] text-muted-foreground">Jump to any question</p></div>
              <LayoutGrid className="w-4 h-4 text-primary" />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((item, index) => (
                <button key={item.id} onClick={() => { setCurrent(index); setNavigatorOpen(false); }} aria-current={current === index ? "step" : undefined} className={`aspect-square rounded-lg text-xs font-bold border ${current === index ? "bg-primary text-white border-primary" : answers[item.id] !== undefined ? "bg-green-500/15 text-green-300 border-green-500/30" : marked[item.id] ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-[10px] text-muted-foreground">
              <p><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500/40 mr-2" />Answered</p>
              <p><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500/40 mr-2" />Marked for review</p>
              <p><span className="inline-block w-2.5 h-2.5 rounded-sm bg-white/10 mr-2" />Unanswered</p>
            </div>
          </div>
        </aside>
      </main>

      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-20 flex gap-2">
        <button onClick={() => setNavigatorOpen((value) => !value)} className="flex-1 h-11 rounded-xl bg-card/95 backdrop-blur-xl border border-white/10 text-xs font-bold shadow-xl"><LayoutGrid className="w-4 h-4 inline mr-2" />Navigator</button>
        <button onClick={() => setMarked((prev) => ({ ...prev, [question.id]: !prev[question.id] }))} className="h-11 px-4 rounded-xl bg-card/95 backdrop-blur-xl border border-white/10 text-xs font-bold shadow-xl"><Flag className="w-4 h-4 inline mr-1" />Review</button>
      </div>
    </div>
  );
}