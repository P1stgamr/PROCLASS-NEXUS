import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ref, onValue, off, push, set } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { ContestCard } from "@/components/ContestCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Zap } from "lucide-react";
import { isTeacherRole } from "@/lib/roles";

const SAMPLE_CONTESTS = {
  active: [
    { id: "c1", title: "Weekend Math Olympiad", description: "Top 3 scorers split the prize pool. Prove your algebra skills.", prize: 500, participants: 42, status: "active" as const, endTime: Date.now() + 3600000 },
    { id: "c2", title: "Speed Coding Challenge", description: "Write the most efficient solution in 30 minutes. Python preferred.", prize: 300, participants: 27, status: "active" as const, endTime: Date.now() + 7200000 },
  ],
  upcoming: [
    { id: "c3", title: "Science Bowl 2026", description: "Inter-school science competition. All subjects covered.", prize: 1000, participants: 0, status: "upcoming" as const },
    { id: "c4", title: "English Debate Contest", description: "Structured debate on current topics. Open to all levels.", prize: 400, participants: 12, status: "upcoming" as const },
  ],
  past: [
    { id: "c5", title: "April Programming Cup", description: "Monthly programming competition — April edition.", prize: 600, participants: 89, status: "past" as const },
  ],
};

export default function CompetitionsPage() {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [contests, setContests] = useState(SAMPLE_CONTESTS);
  const [loading, setLoading] = useState(true);

  const isTeacher = isTeacherRole(userProfile?.role);

  useEffect(() => {
    if (isTeacher) { setLoading(false); return; }
    const dbRef = ref(db, "contests");
    const unsub = onValue(dbRef, (snap) => {
      const data = snap.val();
      if (data) {
        const all = Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })) as any[];
        const now = Date.now();
        setContests({
          active: all.filter((c: any) => c.status === "active" || (c.startTime <= now && c.endTime >= now)),
          upcoming: all.filter((c: any) => c.status === "upcoming" || c.startTime > now),
          past: all.filter((c: any) => c.status === "past" || c.endTime < now),
        });
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => off(dbRef);
  }, [isTeacher]);

  if (isTeacher) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="glass-card rounded-3xl p-6 max-w-sm text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-yellow-400" />
          <h1 className="text-xl font-extrabold">Students only</h1>
          <p className="text-sm text-muted-foreground mt-2">Competitions are for student accounts.</p>
        </div>
      </div>
    );
  }

  const handleJoin = async (contestId: string) => {
    if (!currentUser) return;
    try {
      await set(ref(db, `contests/${contestId}/participants/${currentUser.uid}`), true);
      toast({ title: "Joined contest!", description: "Good luck! May the best student win." });
    } catch {
      toast({ title: "Failed to join", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Competitions</h1>
            <p className="text-xs text-muted-foreground">Compete and win real coins</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border border-yellow-500/20"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="font-bold text-sm">Active Competitions: {contests.active.length}</p>
              <p className="text-xs text-muted-foreground">Join now to win coins and climb the ranks</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="active">
          <TabsList className="w-full bg-white/5 border border-white/10">
            <TabsTrigger value="active" className="flex-1">
              Active ({contests.active.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
          </TabsList>

          {(["active", "upcoming", "past"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
              {loading ? (
                [0, 1].map((i) => <SkeletonCard key={i} />)
              ) : contests[tab].length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-3">
                  <Trophy className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No {tab} competitions right now.</p>
                  <p className="text-xs text-muted-foreground">Check back soon — new contests drop weekly!</p>
                </div>
              ) : (
                contests[tab].map((contest, i) => (
                  <motion.div
                    key={contest.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <ContestCard
                      {...contest}
                      onJoin={() => handleJoin(contest.id)}
                    />
                  </motion.div>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
