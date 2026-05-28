import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { SkeletonCard } from "@/components/SkeletonCard";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Earning {
  id: string;
  type: "task" | "contest" | "bonus" | "withdrawal";
  amount: number;
  description: string;
  timestamp: number;
}

const SAMPLE_EARNINGS: Earning[] = [
  { id: "e1", type: "task", amount: 50, description: "Completed: Algebra Fundamentals", timestamp: Date.now() - 3600000 },
  { id: "e2", type: "contest", amount: 200, description: "Won: Speed Coding Challenge (1st place)", timestamp: Date.now() - 86400000 },
  { id: "e3", type: "bonus", amount: 100, description: "Sign-up bonus", timestamp: Date.now() - 172800000 },
  { id: "e4", type: "task", amount: 30, description: "Completed: Vocabulary Test", timestamp: Date.now() - 259200000 },
];

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  task: { icon: ArrowDownLeft, color: "text-green-400", label: "Task Reward" },
  contest: { icon: ArrowDownLeft, color: "text-yellow-400", label: "Contest Win" },
  bonus: { icon: ArrowDownLeft, color: "text-purple-400", label: "Bonus" },
  withdrawal: { icon: ArrowUpRight, color: "text-red-400", label: "Withdrawal" },
};

export default function WalletPage() {
  const { currentUser, userProfile } = useAuth();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const dbRef = ref(db, `earnings/${currentUser.uid}`);
    const unsub = onValue(dbRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr: Earning[] = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        arr.sort((a, b) => b.timestamp - a.timestamp);
        setEarnings(arr);
      } else {
        setEarnings(SAMPLE_EARNINGS);
      }
      setLoading(false);
    });
    return () => off(dbRef);
  }, [currentUser]);

  const totalEarned = earnings.filter((e) => e.type !== "withdrawal").reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Wallet className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Wallet</h1>
            <p className="text-xs text-muted-foreground">Your coins & earnings</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/15 to-secondary/20 border border-primary/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-3">Current Balance</p>
            <div className="flex items-end gap-3 mb-4">
              <Coins className="w-8 h-8 text-yellow-500 mb-1" />
              <h2 className="text-5xl font-extrabold tracking-tighter">{userProfile?.coins ?? 0}</h2>
              <span className="text-muted-foreground mb-2 font-medium">coins</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 font-medium">{totalEarned} earned total</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Earned", value: totalEarned, color: "text-green-400" },
            { label: "This Week", value: 80, color: "text-yellow-400" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 rounded-2xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value} coins</p>
            </div>
          ))}
        </div>

        <GlowButton
          className="w-full h-12"
          onClick={() => setShowWithdraw(true)}
          data-testid="btn-withdraw"
        >
          Request Withdrawal
        </GlowButton>

        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 rounded-2xl border border-primary/20"
          >
            <h3 className="font-bold mb-2">Withdrawal Request</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Withdrawal requests are processed within 3–5 business days. Minimum: 500 coins.
            </p>
            {(userProfile?.coins ?? 0) < 500 ? (
              <p className="text-xs text-red-400">You need at least 500 coins to withdraw.</p>
            ) : (
              <GlowButton size="sm" className="w-full" data-testid="btn-confirm-withdraw">
                Confirm Request
              </GlowButton>
            )}
            <button
              className="text-xs text-muted-foreground mt-3 w-full text-center hover:text-white"
              onClick={() => setShowWithdraw(false)}
              data-testid="btn-cancel-withdraw"
            >
              Cancel
            </button>
          </motion.div>
        )}

        <section>
          <h3 className="font-bold text-base mb-3">Transaction History</h3>
          <div className="space-y-2">
            {loading ? (
              [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            ) : earnings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Coins className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No transactions yet. Start completing tasks!
              </div>
            ) : (
              earnings.map((e, i) => {
                const cfg = typeConfig[e.type] || typeConfig.task;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3 p-4 glass-card rounded-xl"
                    data-testid={`earning-${e.id}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(e.timestamp, { addSuffix: true })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-bold text-sm ${e.type === "withdrawal" ? "text-red-400" : "text-green-400"}`}>
                        {e.type === "withdrawal" ? "-" : "+"}{e.amount}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        <Badge className="text-[9px] py-0">{cfg.label}</Badge>
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
