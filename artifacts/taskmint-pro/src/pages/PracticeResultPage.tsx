import { useEffect, useMemo, useState } from "react";
import { get, ref } from "firebase/database";
import { useLocation, useParams } from "wouter";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock3, Home, RotateCcw, Target, TrendingDown, Trophy } from "lucide-react";

export default function PracticeResultPage() {
  const { testId = "" } = useParams<{ testId: string }>();
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get(ref(db, `examResults/${testId}`)),
    ]).then(([snapshot]) => {
      const all = snapshot.exists() ? Object.values(snapshot.val()) as any[] : [];
      const current = all.find((item) => item.uid === currentUser?.uid);
      setResult(current || null);
      setResults(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [testId, currentUser?.uid]);

  const ranked = useMemo(() => [...results].sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || Number(a.timeTaken || 0) - Number(b.timeTaken || 0)), [results]);
  const rank = result ? ranked.findIndex((item) => item.uid === result.uid) + 1 : 0;
  const percentile = rank && ranked.length > 1 ? Math.round(((ranked.length - rank) / (ranked.length - 1)) * 100) : rank ? 100 : 0;
  const weakTopics = result?.topicStats ? Object.entries(result.topicStats).filter(([, stat]: any) => stat.correct / Math.max(1, stat.total) < 0.6 && stat.correct + stat.wrong > 0) : [];
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">ফলাফল তৈরি হচ্ছে…</div>;
  if (!result) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">ফলাফল পাওয়া যায়নি।</div>;

  return (
    <div className="min-h-screen bg-background pb-10 px-4">
      <div className="max-w-3xl mx-auto pt-8 space-y-5">
        <div className="text-center">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border-4 ${result.percentage >= 60 ? "border-green-500 bg-green-500/15" : "border-orange-500 bg-orange-500/15"}`}>
            <Trophy className="w-9 h-9 text-yellow-400" />
          </div>
          <p className="text-xs text-muted-foreground mt-4">TEST COMPLETE</p>
          <h1 className="text-2xl font-extrabold mt-1">{result.title}</h1>
          <p className="text-4xl font-extrabold text-primary mt-3">{result.score} <span className="text-base text-muted-foreground">/ {result.totalPossible}</span></p>
          <p className="text-sm text-muted-foreground mt-1">{result.percentage}% accuracy</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "সঠিক", value: result.correctCount, color: "text-green-400" },
            { label: "ভুল", value: result.wrongCount, color: "text-red-400" },
            { label: "উত্তরহীন", value: result.unanswered, color: "text-yellow-400" },
            { label: "সময়", value: formatTime(result.timeTaken || 0), color: "text-blue-400" },
          ].map((item) => <div key={item.label} className="glass-card rounded-2xl p-4 text-center"><p className={`text-xl font-extrabold ${item.color}`}>{item.value}</p><p className="text-[11px] text-muted-foreground mt-1">{item.label}</p></div>)}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" /><h2 className="font-bold">Leaderboard comparison</h2></div><Badge className="bg-primary/15 text-primary border-primary/20">#{rank || "—"}</Badge></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-muted-foreground">Your rank</p><p className="text-2xl font-extrabold mt-1">#{rank || "—"}</p></div>
            <div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-muted-foreground">Percentile</p><p className="text-2xl font-extrabold text-primary mt-1">{percentile}%</p></div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">{ranked.length} জনের মধ্যে আপনার ফলাফল। Score tie হলে কম সময় নেওয়া learner এগিয়ে থাকবে।</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-primary" /><h2 className="font-bold">Subject & topic analysis</h2></div>
          {Object.entries(result.topicStats || {}).map(([topic, stat]: any) => {
            const accuracy = Math.round((stat.correct / Math.max(1, stat.total)) * 100);
            return <div key={topic} className="mb-4 last:mb-0"><div className="flex justify-between text-xs mb-1.5"><span>{topic}</span><span className={accuracy < 60 ? "text-red-300" : "text-green-300"}>{accuracy}% · {stat.correct}/{stat.total}</span></div><Progress value={accuracy} className="h-2" /></div>;
          })}
          {weakTopics.length > 0 ? <div className="mt-4 flex gap-2 items-start rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-200"><TrendingDown className="w-4 h-4 shrink-0 mt-0.5" /><span><strong>Weak topics:</strong> {weakTopics.map(([topic]) => topic).join(", ")} — এগুলো আবার practice করুন।</span></div> : <p className="text-xs text-green-300 mt-4">দারুণ! কোনো weak topic ধরা পড়েনি।</p>}
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <GlowButton className="flex-1 h-12" onClick={() => setLocation("/study")}><RotateCcw className="w-4 h-4 mr-2" />আবার practice করুন</GlowButton>
          <GlowButton glowColor="none" className="flex-1 h-12 bg-white/10 hover:bg-white/15" onClick={() => setLocation("/study")}><Home className="w-4 h-4 mr-2" />Study Hub</GlowButton>
        </div>
      </div>
    </div>
  );
}