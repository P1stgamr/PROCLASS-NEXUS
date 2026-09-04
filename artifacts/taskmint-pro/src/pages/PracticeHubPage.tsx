import { useEffect, useState } from "react";
import { onValue, off, ref } from "firebase/database";
import { useLocation } from "wouter";
import { db } from "@/firebase";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock3, Crown, Filter, Play, Sparkles, Target } from "lucide-react";
import { MCQ_SUBJECTS } from "@/lib/mcqSubjects";

const FIELD = "bg-white/5 border-white/10";

export default function PracticeHubPage() {
  const [, setLocation] = useLocation();
  const [tests, setTests] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [premiumTests, setPremiumTests] = useState<any[]>([]);
  const params = new URLSearchParams(window.location.search);
  const [filters, setFilters] = useState({ subject: params.get("subject") || "math", topic: "", difficulty: "all", count: "25", duration: "30" });

  useEffect(() => {
    const subscriptions = [
      ["modelTests", setTests],
      ["quizSchedules", setSchedules],
      ["premiumExams", setPremiumTests],
    ].map(([path, setter]: any) => {
      const databaseRef = ref(db, path);
      onValue(databaseRef, (snapshot) => setter(Object.entries(snapshot.val() || {}).map(([id, raw]: [string, any]) => ({ id, ...raw }))));
      return databaseRef;
    });
    return () => subscriptions.forEach((databaseRef) => off(databaseRef));
  }, []);

  const launchPractice = () => {
    const query = new URLSearchParams({ ...filters, start: "1" }).toString();
    setLocation(`/practice/subject-practice?${query}`);
  };
  const availablePremium = premiumTests.filter((item) => item.modelTest);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><Target className="w-5 h-5 text-white" /></div>
          <div><p className="text-xs text-primary uppercase tracking-widest">Practice arena</p><h1 className="text-xl font-extrabold">Model Test & MCQ Practice</h1></div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-5 py-5 space-y-5">
        <section className="grid lg:grid-cols-[1.1fr_.9fr] gap-5">
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /><h2 className="font-bold">নিজের test তৈরি করুন</h2></div>
            <p className="text-sm text-muted-foreground">Question bank থেকে random প্রশ্ন বাছাই হবে। Topic ও difficulty দিয়ে focused practice করুন।</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} className={`h-10 rounded-xl px-3 text-sm ${FIELD}`}>{MCQ_SUBJECTS.map((subject) => <option key={subject.id} value={subject.id}>{subject.label}</option>)}</select>
              <Input value={filters.topic} onChange={(e) => setFilters({ ...filters, topic: e.target.value })} placeholder="Topic / chapter (optional)" className={FIELD} />
              <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })} className={`h-10 rounded-xl px-3 text-sm ${FIELD}`}><option value="all">All difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
              <Input type="number" min="25" max="100" value={filters.count} onChange={(e) => setFilters({ ...filters, count: e.target.value })} placeholder="Questions (25–100)" className={FIELD} />
              <Input type="number" min="30" max="180" value={filters.duration} onChange={(e) => setFilters({ ...filters, duration: e.target.value })} placeholder="Minutes (30–180)" className={FIELD} />
            </div>
            <GlowButton onClick={launchPractice} className="w-full h-11"><Play className="w-4 h-4 mr-2" />Practice শুরু করুন</GlowButton>
          </div>
          <div className="rounded-2xl p-5 bg-gradient-to-br from-primary/20 via-blue-500/10 to-transparent border border-primary/20">
            <Sparkles className="w-7 h-7 text-yellow-300 mb-4" />
            <h2 className="text-xl font-extrabold">Practice smart, not just hard</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">প্রতিটি attempt-এর পরে score, time, subject accuracy এবং weak topic দেখুন। ভুলের explanation থাকলে answer করার পরেই শিখে নিন।</p>
            <div className="flex flex-wrap gap-2 mt-4"><Badge className="bg-white/10">25–100 Questions</Badge><Badge className="bg-white/10">30–180 Minutes</Badge><Badge className="bg-white/10">Negative marking</Badge></div>
          </div>
        </section>

        {[
          { title: "Daily & weekly short quizzes", items: schedules, icon: Clock3, empty: "আজকের short quiz এখনো publish হয়নি।" },
          { title: "Published model tests", items: tests, icon: Target, empty: "Admin এখনো model test publish করেননি।" },
          { title: "Premium model tests", items: availablePremium, icon: Crown, empty: "Premium model test শীঘ্রই আসছে।" },
        ].map(({ title, items, icon: Icon, empty }) => (
          <section key={title}>
            <div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-primary" /><h2 className="font-bold">{title}</h2></div>
            {items.length === 0 ? <div className="glass-card rounded-2xl p-5 text-sm text-muted-foreground">{empty}</div> : <div className="grid md:grid-cols-2 gap-3">{items.map((item) => <div key={item.id} className="glass-card-hover rounded-2xl p-4 flex items-center gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-bold text-sm truncate">{item.title}</p>{item.premium && <Badge className="bg-yellow-500/15 text-yellow-300 text-[10px]">Premium</Badge>}</div><p className="text-xs text-muted-foreground mt-1">{item.subject} · {item.questionCount || 25} Q · {item.duration || 30} min</p>{item.negativeMarking && <p className="text-[10px] text-yellow-300 mt-1">Negative marking -{item.negativeMarkValue || .25}</p>}</div><GlowButton size="sm" className="h-9 px-3" onClick={() => setLocation(item.premium ? `/payment/${item.id}` : item.scheduleType ? `/daily-quiz/${item.id}` : `/model-test/${item.id}`)}>{item.premium ? <><Crown className="w-3 h-3 mr-1" />Unlock</> : <><Play className="w-3 h-3 mr-1" />Start</>}</GlowButton></div>)}</div>}
          </section>
        ))}
      </main>
    </div>
  );
}