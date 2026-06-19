import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GlowButton } from "@/components/GlowButton";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  Settings, Coins, Zap, Flame, Crown, Star,
  Trophy, Target, BookOpen, Code2, Calendar,
  ChevronRight, Award, TrendingUp
} from "lucide-react";

const ACHIEVEMENTS_DEF = [
  { id: "first_login", title: "First Login", desc: "Welcome to TaskMint!", icon: "🎯", earned: true },
  { id: "scholar", title: "Scholar", desc: "Complete 10 quizzes", icon: "📚", earned: true },
  { id: "quiz_master", title: "Quiz Master", desc: "Win 5 contests", icon: "🏆", earned: false },
  { id: "streak_7", title: "Week Warrior", desc: "7-day streak", icon: "🔥", earned: false },
  { id: "top10", title: "Top 10", desc: "Reach top 10", icon: "⭐", earned: false },
  { id: "ai_user", title: "AI Expert", desc: "Use AI 50 times", icon: "🤖", earned: false },
  { id: "coder", title: "Coder", desc: "Solve 10 challenges", icon: "💻", earned: false },
  { id: "referrer", title: "Connector", desc: "Refer 3 friends", icon: "🤝", earned: false },
];

const RECENT_ACTIVITY = [
  { type: "quiz", text: "Completed Python Basics quiz", time: "2h ago", xp: 60, icon: BookOpen, color: "text-blue-400" },
  { type: "ai", text: "Used AI Assistant", time: "4h ago", xp: 30, icon: Star, color: "text-violet-400" },
  { type: "code", text: "Solved Two Sum challenge", time: "Yesterday", xp: 50, icon: Code2, color: "text-green-400" },
  { type: "contest", text: "Entered SSC Math Contest", time: "2 days ago", xp: 0, icon: Trophy, color: "text-yellow-400" },
];

export default function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("achievements");

  const targetUid = uid || currentUser?.uid;
  const isOwn = targetUid === currentUser?.uid;

  useEffect(() => {
    if (!targetUid) return;
    if (isOwn && userProfile) {
      setProfile(userProfile);
      setLoading(false);
      return;
    }
    const userRef = ref(db, `users/${targetUid}`);
    const unsub = onValue(userRef, (snap) => {
      setProfile(snap.val());
      setLoading(false);
    });
    return () => off(userRef);
  }, [targetUid, userProfile, isOwn]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28 px-5 pt-20 max-w-md mx-auto space-y-4">
        {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">👤</p>
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  const earnedAchievements = ACHIEVEMENTS_DEF.filter(a => a.earned).length;
  const xpInLevel = (profile.xp || 0) % 1000;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-white/[0.06] px-5 py-3.5 flex items-center justify-between max-w-md mx-auto">
        <h1 className="text-xl font-extrabold">{isOwn ? "My Profile" : "Profile"}</h1>
        {isOwn && (
          <button onClick={() => setLocation("/settings")} className="p-2.5 rounded-xl glass-card hover:bg-white/10 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto">
        {/* Hero */}
        <div className="relative px-5 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/15 to-transparent" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20 ring-3 ring-primary/50 ring-offset-2 ring-offset-background">
                <AvatarImage src={profile.photoURL} />
                <AvatarFallback className="text-2xl font-extrabold bg-primary/20 text-primary">
                  {profile.name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl gradient-primary border-2 border-background flex items-center justify-center">
                <span className="text-[10px] font-extrabold text-white">{profile.level || 1}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold truncate">{profile.name || "Student"}</h2>
              <p className="text-sm text-muted-foreground">{profile.email || ""}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="badge-level text-[10px]">Level {profile.level || 1}</Badge>
                {(profile.streak || 0) > 0 && (
                  <Badge className="badge-streak text-[10px]">
                    <Flame className="w-2.5 h-2.5 mr-1" />{profile.streak}d streak
                  </Badge>
                )}
                {profile.role === "admin" && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Admin</Badge>
                )}
              </div>
            </div>
          </motion.div>

          {/* XP Bar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 mt-5">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{xpInLevel} / 1000 XP</span>
              <span>{1000 - xpInLevel} to Level {(profile.level || 1) + 1}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full gradient-primary"
                initial={{ width: 0 }} animate={{ width: `${(xpInLevel / 1000) * 100}%` }}
                transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1], delay: 0.3 }} />
            </div>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="px-5 mb-5">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Coins", value: profile.coins || 0, icon: Coins, color: "text-yellow-400" },
              { label: "XP", value: profile.xp || 0, icon: Zap, color: "text-primary" },
              { label: "Streak", value: profile.streak || 0, icon: Flame, color: "text-orange-400", suffix: "d" },
              { label: "Awards", value: earnedAchievements, icon: Award, color: "text-emerald-400" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.07 }}
                className="glass-card rounded-2xl p-3 text-center">
                <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                <p className={`text-sm font-extrabold ${s.color}`}>{s.value.toLocaleString()}{s.suffix}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 mb-4">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {["achievements", "activity"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === tab ? "gradient-primary text-white" : "text-muted-foreground hover:text-white"}`}>
                {tab === "achievements" ? "Achievements" : "Activity"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-5">
          {activeTab === "achievements" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="grid grid-cols-2 gap-3">
                {ACHIEVEMENTS_DEF.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    className={`glass-card rounded-2xl p-4 ${a.earned ? "border border-yellow-500/20" : "opacity-50"}`}>
                    <div className="text-3xl mb-2">{a.icon}</div>
                    <p className="font-bold text-sm">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</p>
                    {a.earned && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[10px] text-green-400">Earned</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
              {RECENT_ACTIVITY.map((act, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="glass-card rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0`}>
                    <act.icon className={`w-5 h-5 ${act.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{act.text}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{act.time}</span>
                      {act.xp > 0 && (
                        <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />+{act.xp} XP
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
