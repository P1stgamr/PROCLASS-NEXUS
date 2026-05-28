import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Coins, Zap, Flame, Trophy, Star, Award } from "lucide-react";

const BADGES = [
  { id: "first", icon: Star, label: "First Login", color: "text-yellow-400" },
  { id: "streak7", icon: Flame, label: "7-Day Streak", color: "text-orange-400" },
  { id: "top10", icon: Trophy, label: "Top 10", color: "text-purple-400" },
];

export default function ProfilePage() {
  const params = useParams<{ uid: string }>();
  const { currentUser, userProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const targetUid = params?.uid || currentUser?.uid;
  const isOwn = targetUid === currentUser?.uid;

  useEffect(() => {
    if (!targetUid) return;
    if (isOwn && userProfile) {
      setProfile(userProfile);
      setLoading(false);
      return;
    }
    const dbRef = ref(db, `users/${targetUid}`);
    const unsub = onValue(dbRef, (snap) => {
      setProfile(snap.val());
      setLoading(false);
    });
    return () => off(dbRef);
  }, [targetUid, isOwn, userProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 px-5 pt-8 max-w-md mx-auto space-y-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const xpToNext = 1000 - (profile.xp % 1000);
  const xpPercent = Math.min(100, ((profile.xp % 1000) / 10));

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative h-40 bg-gradient-to-br from-primary/30 via-secondary/20 to-background overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        <div className="absolute top-1/4 left-1/3 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
      </div>

      <div className="px-5 max-w-md mx-auto -mt-14 relative z-10 space-y-5">
        <div className="flex items-end gap-4">
          <Avatar className="w-20 h-20 ring-4 ring-background border-2 border-primary/40 shadow-xl">
            <AvatarImage src={profile.photoURL || undefined} />
            <AvatarFallback className="text-2xl font-bold bg-primary/20">
              {profile.name?.charAt(0) || "S"}
            </AvatarFallback>
          </Avatar>
          <div className="pb-2">
            <h1 className="text-xl font-extrabold tracking-tight">{profile.name || "Student"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                Level {profile.level || 1}
              </Badge>
              {profile.role === "admin" && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Admin</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>XP Progress — Level {profile.level || 1}</span>
            <span>{xpPercent.toFixed(0)}%</span>
          </div>
          <Progress value={xpPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">{xpToNext} XP to Level {(profile.level || 1) + 1}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Coins", value: profile.coins || 0, icon: Coins, color: "text-yellow-500" },
            { label: "XP", value: profile.xp || 0, icon: Zap, color: "text-primary" },
            { label: "Streak", value: `${profile.streak || 0}d`, icon: Flame, color: "text-orange-400" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.03 }}
              className="glass-card p-4 rounded-2xl flex flex-col items-center gap-2"
            >
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="font-bold text-lg">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </motion.div>
          ))}
        </div>

        <div>
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> Badges
          </h3>
          <div className="flex gap-3 flex-wrap">
            {BADGES.map((badge) => (
              <div key={badge.id} className="flex flex-col items-center gap-1.5 glass-card p-3 rounded-2xl min-w-[70px]">
                <badge.icon className={`w-7 h-7 ${badge.color}`} />
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-base mb-3">Activity</h3>
          <div className="glass-card p-4 rounded-2xl text-center text-sm text-muted-foreground">
            Activity log coming soon. Keep completing tasks!
          </div>
        </div>
      </div>
    </div>
  );
}
