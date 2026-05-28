import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { StatsCard } from "@/components/StatsCard";
import { MissionCard } from "@/components/MissionCard";
import { LeaderboardItem } from "@/components/LeaderboardItem";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Coins, Zap, Flame, CheckSquare, Trophy } from "lucide-react";
import { Link } from "wouter";

const MISSIONS = [
  { title: "Complete 3 study tasks", reward: 50, total: 3 },
  { title: "Win a quiz contest", reward: 100, total: 1 },
  { title: "Send 5 chat messages", reward: 20, total: 5 },
  { title: "Upload study material", reward: 75, total: 1 },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const lbRef = ref(db, "users");
    const unsubLb = onValue(lbRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.values(data) as any[];
        arr.sort((a: any, b: any) => b.coins - a.coins);
        setLeaderboard(arr.slice(0, 3));
      }
      setLbLoading(false);
    });
    const notifRef = ref(db, `notifications/${currentUser.uid}`);
    const unsubNotif = onValue(notifRef, (snap) => {
      const data = snap.val();
      if (data) {
        const unread = Object.values(data).filter((n: any) => !n.read).length;
        setNotifCount(unread);
      }
    });
    return () => { off(lbRef); off(notifRef); };
  }, [currentUser]);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-primary/40">
              <AvatarImage src={userProfile?.photoURL || undefined} />
              <AvatarFallback>{userProfile?.name?.charAt(0) || "S"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">{greeting},</p>
              <h2 className="font-bold text-sm leading-tight">{userProfile?.name || "Student"}</h2>
            </div>
          </div>
          <Link href="/notifications">
            <button className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" data-testid="btn-notifications">
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center glow-purple">
                  {notifCount}
                </span>
              )}
            </button>
          </Link>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-6">
        <motion.div
          className="p-5 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/20 border border-primary/20 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-primary uppercase tracking-widest">Level {userProfile?.level || 1}</span>
            <span className="text-xs text-muted-foreground">{userProfile?.xp || 0} / {((userProfile?.level || 1) * 1000)} XP</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((userProfile?.xp || 0) % 1000) / 10)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {1000 - ((userProfile?.xp || 0) % 1000)} XP to next level
          </p>
        </motion.div>

        <motion.div className="grid grid-cols-2 gap-3" variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <StatsCard title="Coins" value={userProfile?.coins || 0} icon={<Coins className="w-4 h-4" />} trend="+50 today" trendUp />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard title="XP Points" value={userProfile?.xp || 0} icon={<Zap className="w-4 h-4" />} />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard title="Streak" value={`${userProfile?.streak || 0} days`} icon={<Flame className="w-4 h-4" />} trend="Keep it up!" trendUp />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard title="Tasks Done" value={0} icon={<CheckSquare className="w-4 h-4" />} />
          </motion.div>
        </motion.div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base">Daily Missions</h3>
            <span className="text-xs text-muted-foreground">0/4 done</span>
          </div>
          <div className="flex flex-col gap-2">
            {MISSIONS.map((m, i) => (
              <MissionCard key={i} title={m.title} reward={m.reward} progress={0} total={m.total} />
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Top Earners
            </h3>
            <button className="text-xs text-primary hover:text-primary/80 transition-colors" onClick={() => setLocation("/leaderboard")} data-testid="link-leaderboard">
              See all
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {lbLoading ? (
              [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No rankings yet. Be the first!</div>
            ) : (
              leaderboard.map((u, i) => (
                <LeaderboardItem
                  key={u.uid}
                  rank={i + 1}
                  name={u.name}
                  photoURL={u.photoURL}
                  coins={u.coins}
                  xp={u.xp}
                  isCurrentUser={u.uid === currentUser?.uid}
                />
              ))
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
