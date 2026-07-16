import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  Bell, Coins, Zap, Flame, Trophy, Crown, BookOpen,
  MessageSquare, Bot, ChevronRight, Star, Target,
  TrendingUp, Sword, CheckCircle2, Lock, Sparkles, Gift
} from "lucide-react";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = 0; const end = value;
    if (end === 0) return;
    const duration = 800; const step = end / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplayed(Math.floor(start));
      if (start >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{displayed.toLocaleString()}</span>;
}

const QUICK_ACTIONS = [
  { icon: BookOpen, label: "Study", path: "/study", gradient: "from-blue-600/30 to-blue-500/10", border: "border-blue-500/20", iconColor: "text-blue-400" },
  { icon: Crown, label: "Exams", path: "/premium-exams", gradient: "from-yellow-600/30 to-yellow-500/10", border: "border-yellow-500/20", iconColor: "text-yellow-400" },
  { icon: Bot, label: "AI", path: "/ai", gradient: "from-violet-600/30 to-violet-500/10", border: "border-violet-500/20", iconColor: "text-violet-400" },
  { icon: MessageSquare, label: "Chat", path: "/chat", gradient: "from-emerald-600/30 to-emerald-500/10", border: "border-emerald-500/20", iconColor: "text-emerald-400" },
  { icon: Trophy, label: "Contest", path: "/competitions", gradient: "from-orange-600/30 to-orange-500/10", border: "border-orange-500/20", iconColor: "text-orange-400" },
  { icon: TrendingUp, label: "Wallet", path: "/wallet", gradient: "from-pink-600/30 to-pink-500/10", border: "border-pink-500/20", iconColor: "text-pink-400" },
  { icon: Gift, label: "Gifts", path: "/gifts", gradient: "from-green-600/30 to-green-500/10", border: "border-green-500/20", iconColor: "text-green-400" },
  { icon: Sparkles, label: "Courses", path: "/courses", gradient: "from-cyan-600/30 to-cyan-500/10", border: "border-cyan-500/20", iconColor: "text-cyan-400" },
  { icon: Star, label: "Plans", path: "/membership", gradient: "from-amber-600/30 to-amber-500/10", border: "border-amber-500/20", iconColor: "text-amber-400" },
];

const MISSIONS = [
  { id: "m1", title: "৩টি study task শেষ করুন", reward: 50, icon: BookOpen, progress: 1, total: 3 },
  { id: "m2", title: "একটি quiz জিতুন", reward: 100, icon: Sword, progress: 0, total: 1 },
  { id: "m3", title: "AI Assistant ব্যবহার করুন", reward: 30, icon: Bot, progress: 0, total: 1 },
  { id: "m4", title: "৫টি chat message পাঠান", reward: 20, icon: MessageSquare, progress: 2, total: 5 },
];

const ACHIEVEMENTS = [
  { title: "First Login", icon: "🎯", earned: true },
  { title: "Scholar", icon: "📚", earned: true },
  { title: "Quiz Master", icon: "🏆", earned: false },
  { title: "Streak 7", icon: "🔥", earned: false },
  { title: "Top 10", icon: "⭐", earned: false },
  { title: "AI User", icon: "🤖", earned: false },
];

export default function HomePage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const lbRef = ref(db, "users");
    const unsubLb = onValue(lbRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.values(data) as any[];
        arr.sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0));
        setLeaderboard(arr.slice(0, 5));
      }
      setLbLoading(false);
    });
    const notifRef = ref(db, `notifications/${currentUser.uid}`);
    const unsubNotif = onValue(notifRef, (snap) => {
      const data = snap.val();
      if (data) setNotifCount(Object.values(data).filter((n: any) => !n.read).length);
    });
    return () => { off(lbRef); off(notifRef); };
  }, [currentUser]);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingEmoji = hour < 5 ? "🌙" : hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";
  const xp = userProfile?.xp || 0;
  const level = userProfile?.level || 1;
  const xpInLevel = xp % 1000;
  const xpPercent = (xpInLevel / 1000) * 100;

  return (
    <div className="min-h-screen bg-background pb-28 hero-gradient">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/75 backdrop-blur-2xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${currentUser?.uid}`}>
              <div className="relative cursor-pointer">
                <Avatar className="w-10 h-10 ring-2 ring-primary/50 ring-offset-1 ring-offset-background">
                  <AvatarImage src={userProfile?.photoURL || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {userProfile?.name?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
                {(userProfile?.streak || 0) > 0 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 border-2 border-background flex items-center justify-center">
                    <span className="text-[8px] font-bold">{userProfile?.streak}</span>
                  </div>
                )}
              </div>
            </Link>
            <div>
              <p className="text-[11px] text-muted-foreground leading-none mb-1">{greetingEmoji} {greeting}</p>
              <h2 className="font-bold text-sm leading-none">{userProfile?.name?.split(" ")[0] || "Student"}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400">
                <AnimatedNumber value={userProfile?.coins || 0} />
              </span>
            </div>
            <Link href="/notifications">
              <button className="relative p-2.5 rounded-xl glass-card hover:bg-white/10 transition-colors">
                <Bell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full gradient-primary text-[9px] font-bold flex items-center justify-center glow-purple px-1">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-6">
        {/* Hero Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="relative p-5 rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(59,130,246,0.15) 50%, rgba(124,58,237,0.1) 100%)", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl translate-y-10 -translate-x-10" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="badge-level text-[10px] px-2 py-0.5">Level {level}</Badge>
                  <Badge className="badge-streak text-[10px] px-2 py-0.5">
                    <Flame className="w-2.5 h-2.5 mr-1" />{userProfile?.streak || 0} day streak
                  </Badge>
                </div>
                <h3 className="font-extrabold text-2xl tracking-tight">
                  <AnimatedNumber value={xp} /> <span className="text-base font-normal text-muted-foreground">XP</span>
                </h3>
              </div>
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center glow-purple animate-float">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{xpInLevel} / 1000 XP</span>
                <span>{1000 - xpInLevel} to Level {level + 1}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(262,83%,58%), hsl(217,91%,60%))" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1], delay: 0.3 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-3 gap-3">
          {[
            { label: "Coins", value: userProfile?.coins || 0, icon: Coins, color: "text-yellow-400", bg: "bg-yellow-500/10" },
            { label: "Streak", value: userProfile?.streak || 0, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10", suffix: "d" },
            { label: "Level", value: userProfile?.level || 1, icon: Star, color: "text-primary", bg: "bg-primary/10" },
          ].map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="glass-card rounded-2xl p-3.5 text-center">
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-xl font-extrabold ${s.color}`}>
                <AnimatedNumber value={s.value} />{s.suffix}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {QUICK_ACTIONS.map((a, i) => (
              <motion.button
                key={a.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLocation(a.path)}
                className={`glass-card-hover rounded-2xl p-4 flex flex-col items-center gap-2.5 bg-gradient-to-br ${a.gradient} border ${a.border}`}
              >
                <a.icon className={`w-6 h-6 ${a.iconColor}`} />
                <span className="text-[11px] font-semibold">{a.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Daily Missions */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-base">Daily Missions</h3>
            </div>
            <Badge className="badge-coin text-[10px]">
              <Gift className="w-2.5 h-2.5 mr-1" />
              {MISSIONS.filter(m => m.progress >= m.total).length}/{MISSIONS.length} done
            </Badge>
          </div>
          <div className="space-y-2.5">
            {MISSIONS.map((m, i) => {
              const done = m.progress >= m.total;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${done ? "bg-green-500/10 border border-green-500/20" : "glass-card"}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-green-500/20" : "bg-white/5"}`}>
                    {done ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <m.icon className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>{m.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(m.progress / m.total) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{m.progress}/{m.total}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400">+{m.reward}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Achievements Preview */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <h3 className="font-bold text-base">Achievements</h3>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {ACHIEVEMENTS.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 + i * 0.04 }}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 ${a.earned ? "glass-card border border-yellow-500/30" : "glass-card opacity-40"}`}
              >
                <span className={`text-xl ${!a.earned ? "grayscale" : ""}`}>{a.icon}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Leaderboard Preview */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <h3 className="font-bold text-base">Top Students</h3>
            </div>
            <button onClick={() => setLocation("/leaderboard")} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
              See all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
            {lbLoading ? [0,1,2].map(i => <SkeletonCard key={i} />) :
            leaderboard.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No rankings yet. Be the first!</p>
            ) : leaderboard.map((u, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const isMe = u.uid === currentUser?.uid;
              return (
                <div key={u.uid} className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-primary/10" : "hover:bg-white/5"} transition-colors`}>
                  <span className="text-lg w-6 text-center">{medals[i] || `${i+1}`}</span>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={u.photoURL} />
                    <AvatarFallback className="text-xs">{u.name?.charAt(0) || "S"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : ""}`}>{u.name || "Student"} {isMe && "(You)"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />{(u.xp || 0).toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400">{(u.coins || 0).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
