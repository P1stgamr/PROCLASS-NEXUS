import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Trophy, Coins, Zap, Flame, Crown, Medal } from "lucide-react";

type FilterType = "xp" | "coins" | "streak";

export default function LeaderboardPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("xp");

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.values(data) as any[];
        setUsers(arr);
      }
      setLoading(false);
    });
    return () => off(usersRef);
  }, []);

  const sorted = [...users].sort((a: any, b: any) => (b[filter] || 0) - (a[filter] || 0));
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const myRank = sorted.findIndex(u => u.uid === currentUser?.uid) + 1;

  const filterConfig = [
    { id: "xp" as const, label: "XP", icon: Zap, color: "text-primary" },
    { id: "coins" as const, label: "Coins", icon: Coins, color: "text-yellow-400" },
    { id: "streak" as const, label: "Streak", icon: Flame, color: "text-orange-400" },
  ];

  const podiumOrder = [1, 0, 2] as const;
  const podiumConfig = [
    { height: "h-24", size: "w-16 h-16", border: "ring-2 ring-silver", bg: "gradient-silver", label: "2nd", medal: "🥈" },
    { height: "h-32", size: "w-20 h-20", border: "ring-2 ring-yellow-400", bg: "gradient-gold", label: "1st", medal: "🥇" },
    { height: "h-20", size: "w-14 h-14", border: "ring-2 ring-amber-700", bg: "gradient-bronze", label: "3rd", medal: "🥉" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Leaderboard</h1>
              <p className="text-[11px] text-muted-foreground">
                {myRank > 0 ? `আপনি #${myRank} তে আছেন` : "সেরা students দের ranking"}
              </p>
            </div>
          </div>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {filterConfig.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${filter === f.id ? "gradient-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}>
                <f.icon className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 max-w-md mx-auto">
        {loading ? (
          <div className="py-5 space-y-3">{[0,1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Podium */}
              {top3.length >= 3 && (
                <div className="flex items-end justify-center gap-3 pt-8 pb-6">
                  {podiumOrder.map((dataIdx, displayIdx) => {
                    const user = top3[dataIdx];
                    const cfg = podiumConfig[displayIdx];
                    if (!user) return null;
                    const isMe = user.uid === currentUser?.uid;
                    return (
                      <motion.div key={user.uid} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: displayIdx * 0.1 }} className="flex flex-col items-center gap-2 flex-1">
                        <span className="text-2xl">{cfg.medal}</span>
                        <div className="relative">
                          <Avatar className={`${cfg.size} ${cfg.border} ${isMe ? "ring-primary" : ""}`}>
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback className="text-base font-bold">{user.name?.charAt(0) || "S"}</AvatarFallback>
                          </Avatar>
                          {isMe && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold truncate max-w-[80px]">{isMe ? "You" : user.name?.split(" ")[0] || "S"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {filter === "xp" ? `${(user.xp || 0).toLocaleString()} XP`
                              : filter === "coins" ? `${(user.coins || 0).toLocaleString()} 🪙`
                              : `${user.streak || 0}d 🔥`}
                          </p>
                        </div>
                        <div className={`${cfg.height} w-full rounded-t-2xl ${cfg.bg} flex items-start justify-center pt-2`}>
                          <span className="text-white font-extrabold text-lg">{dataIdx + 1}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* My Rank Banner */}
              {myRank > 3 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 p-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center font-extrabold text-white">
                    #{myRank}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-primary">আপনার rank</p>
                    <p className="text-xs text-muted-foreground">শীর্ষে উঠতে আরও practice করুন!</p>
                  </div>
                </motion.div>
              )}

              {/* Full List */}
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5 mb-4">
                {(top3.length >= 3 ? rest : sorted).map((user: any, i) => {
                  const rank = (top3.length >= 3 ? i + 4 : i + 1);
                  const isMe = user.uid === currentUser?.uid;
                  const val = filter === "xp" ? `${(user.xp || 0).toLocaleString()} XP`
                    : filter === "coins" ? `${(user.coins || 0).toLocaleString()}`
                    : `${user.streak || 0}d`;

                  return (
                    <motion.div key={user.uid} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-3 px-4 py-3.5 ${isMe ? "bg-primary/10" : "hover:bg-white/5"} transition-colors`}>
                      <div className="w-8 text-center">
                        <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
                      </div>
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={user.photoURL} />
                        <AvatarFallback className="text-xs">{user.name?.charAt(0) || "S"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : ""}`}>
                          {user.name || "Student"}{isMe ? " (You)" : ""}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className="badge-level text-[9px] px-1.5 py-0">Lv.{user.level || 1}</Badge>
                          {(user.streak || 0) > 3 && (
                            <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" />{user.streak}d
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {filter === "xp" && <Zap className="w-3.5 h-3.5 text-primary" />}
                        {filter === "coins" && <Coins className="w-3.5 h-3.5 text-yellow-400" />}
                        {filter === "streak" && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                        <span className={`text-sm font-bold ${filter === "xp" ? "text-primary" : filter === "coins" ? "text-yellow-400" : "text-orange-400"}`}>
                          {val}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
                {sorted.length === 0 && (
                  <div className="py-12 text-center">
                    <Crown className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">কোনো rankings নেই। প্রথম হোন!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
