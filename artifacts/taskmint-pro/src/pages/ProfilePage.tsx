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
import { createUserNo } from "@/lib/userId";

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
              {profile.username && (
                <p className="text-xs text-primary/80">@{profile.username}</p>
              )}
              <p className="text-xs text-muted-foreground">{profile.email || ""}</p>
               <p className="text-[10px] text-primary/80 font-semibold tracking-wide mt-0.5">
                 ID No. {profile.userNo || createUserNo(profile.uid || targetUid || "")}
               </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Badge className="badge-level text-[10px]">Level {profile.level || 1}</Badge>
                {(profile.streak || 0) > 0 && (
                  <Badge className="badge-streak text-[10px]">
                    <Flame className="w-2.5 h-2.5 mr-1" />{profile.streak}d streak
                  </Badge>
                )}
                {profile.role === "admin" && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Admin</Badge>
                )}
                {profile.role === "super_admin" && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">Super Admin</Badge>
                )}
                {profile.role === "owner" && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Owner</Badge>
                )}
                {profile.membership && profile.membership !== "free" && (
                  <Badge className={`text-[10px] ${
                    profile.membership === "platinum" ? "bg-violet-500/20 text-violet-400 border-violet-500/30" :
                    profile.membership === "gold" ? "badge-coin" :
                    "bg-slate-400/20 text-slate-300 border-slate-400/30"
                  }`}>
                    <Crown className="w-2.5 h-2.5 mr-1" />{profile.membership}
                  </Badge>
                )}
              </div>
              {profile.bio && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{profile.bio}</p>
              )}
              {(profile.github || profile.linkedin) && (
                <div className="flex items-center gap-2 mt-1.5">
                  {profile.github && (
                    <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-0.5">
                      <Code2 className="w-3 h-3" />github/{profile.github}
                    </a>
                  )}
                </div>
              )}
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
            {["achievements", "activity", "about"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === tab ? "gradient-primary text-white" : "text-muted-foreground hover:text-white"}`}>
                {tab === "achievements" ? "Badges" : tab === "activity" ? "Activity" : "About"}
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
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <span className="text-4xl">📭</span>
                <p className="text-sm font-semibold text-muted-foreground">কোনো activity নেই</p>
                <p className="text-xs text-muted-foreground/60">Quiz দিন, task করুন — activity এখানে দেখাবে</p>
              </div>
            </motion.div>
          )}

          {activeTab === "about" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="glass-card rounded-2xl p-4 space-y-3">
                {[
                  { label: "Full Name", value: profile.name, icon: "👤" },
                  { label: "ID No.", value: profile.userNo || createUserNo(profile.uid || targetUid || ""), icon: "🪪" },
                  { label: "Email", value: profile.email, icon: "📧" },
                  { label: "Username", value: profile.username ? `@${profile.username}` : null, icon: "🏷️" },
                  { label: "Bio", value: profile.bio, icon: "📝" },
                  { label: "GitHub", value: profile.github, icon: "💻" },
                  { label: "LinkedIn", value: profile.linkedin, icon: "🔗" },
                  { label: "Membership", value: profile.membership || "free", icon: "👑" },
                  { label: "Member Since", value: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long" }) : null, icon: "📅" },
                ].filter(f => f.value).map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg w-7">{f.icon}</span>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium capitalize">{f.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {isOwn && (
                <button onClick={() => setLocation("/settings")}
                  className="w-full py-3 rounded-2xl glass-card text-sm font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
                  <Settings className="w-4 h-4" />Edit Profile
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
