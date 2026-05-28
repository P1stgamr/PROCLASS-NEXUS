import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { LeaderboardItem } from "@/components/LeaderboardItem";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Crown, Medal } from "lucide-react";

export default function LeaderboardPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dbRef = ref(db, "users");
    const unsub = onValue(dbRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.values(data) as any[];
        setUsers(arr);
      }
      setLoading(false);
    });
    return () => off(dbRef);
  }, []);

  const byCoins = [...users].sort((a, b) => b.coins - a.coins);
  const byXP = [...users].sort((a, b) => b.xp - a.xp);

  const podiumIcons = [Crown, Trophy, Medal];
  const podiumColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];

  const PodiumCard = ({ user, rank }: { user: any; rank: number }) => {
    const Icon = podiumIcons[rank - 1];
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rank * 0.1 }}
        className={`flex flex-col items-center gap-2 ${rank === 1 ? "scale-110" : ""}`}
      >
        <div className={`w-16 h-16 rounded-full border-2 overflow-hidden ${rank === 1 ? "border-yellow-500 glow-purple" : "border-white/20"}`}>
          {user.photoURL ? (
            <img src={user.photoURL} className="w-full h-full object-cover" alt={user.name} />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-xl">
              {user.name?.charAt(0) || "?"}
            </div>
          )}
        </div>
        <Icon className={`w-5 h-5 ${podiumColors[rank - 1]}`} />
        <p className="text-xs font-semibold truncate max-w-[72px] text-center">{user.name || "Student"}</p>
        <p className="text-[10px] text-yellow-500 font-bold">{user.coins} coins</p>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Leaderboard</h1>
            <p className="text-xs text-muted-foreground">Top {users.length} students</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 max-w-md mx-auto space-y-6">
        {!loading && byCoins.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center items-end gap-6 py-4 px-6 glass-card rounded-3xl"
          >
            {byCoins[1] && <PodiumCard user={byCoins[1]} rank={2} />}
            {byCoins[0] && <PodiumCard user={byCoins[0]} rank={1} />}
            {byCoins[2] && <PodiumCard user={byCoins[2]} rank={3} />}
          </motion.div>
        )}

        <Tabs defaultValue="coins">
          <TabsList className="w-full bg-white/5 border border-white/10">
            <TabsTrigger value="coins" className="flex-1">By Coins</TabsTrigger>
            <TabsTrigger value="xp" className="flex-1">By XP</TabsTrigger>
          </TabsList>

          {([
            { key: "coins", data: byCoins },
            { key: "xp", data: byXP },
          ] as const).map(({ key, data }) => (
            <TabsContent key={key} value={key} className="mt-4 space-y-2">
              {loading ? (
                [0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
              ) : data.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-3">
                  <Trophy className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No students yet. Be the first to sign up!</p>
                </div>
              ) : (
                data.map((u, i) => (
                  <LeaderboardItem
                    key={u.uid || i}
                    rank={i + 1}
                    name={u.name}
                    photoURL={u.photoURL}
                    coins={u.coins}
                    xp={u.xp}
                    isCurrentUser={u.uid === currentUser?.uid}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
