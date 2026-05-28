import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off, push } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { SkeletonCard } from "@/components/SkeletonCard";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Coins, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, Smartphone, X, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SAMPLE_EARNINGS = [
  { id: "e1", type: "task", amount: 50, description: "Completed: Algebra Fundamentals", timestamp: Date.now() - 3600000 },
  { id: "e2", type: "contest", amount: 200, description: "Won: Speed Coding Challenge (1st place)", timestamp: Date.now() - 86400000 },
  { id: "e3", type: "bonus", amount: 100, description: "Sign-up bonus", timestamp: Date.now() - 172800000 },
  { id: "e4", type: "exam", amount: 500, description: "Won: SSC Math Championship", timestamp: Date.now() - 259200000 },
];

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  task: { icon: ArrowDownLeft, color: "text-green-400", label: "Task Reward" },
  contest: { icon: ArrowDownLeft, color: "text-yellow-400", label: "Contest Win" },
  exam: { icon: ArrowDownLeft, color: "text-purple-400", label: "Exam Prize" },
  bonus: { icon: ArrowDownLeft, color: "text-blue-400", label: "Bonus" },
  withdrawal: { icon: ArrowUpRight, color: "text-red-400", label: "Withdrawal" },
};

export default function WalletPage() {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [bkashNumber, setBkashNumber] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const dbRef = ref(db, `earnings/${currentUser.uid}`);
    const unsub = onValue(dbRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        arr.sort((a: any, b: any) => b.timestamp - a.timestamp);
        setEarnings(arr);
      } else {
        setEarnings(SAMPLE_EARNINGS);
      }
      setLoading(false);
    });
    const wdRef = ref(db, `withdrawRequests`);
    const unsub2 = onValue(wdRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data)
          .map(([id, v]: [string, any]) => ({ id, ...v }))
          .filter((r: any) => r.uid === currentUser.uid);
        arr.sort((a: any, b: any) => b.createdAt - a.createdAt);
        setWithdrawRequests(arr.slice(0, 3));
      }
    });
    return () => { off(dbRef); off(wdRef); };
  }, [currentUser]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(withdrawAmount);
    if (!bkashNumber.trim() || !amount) return;
    if (amount < 100) {
      toast({ title: "Minimum withdrawal is ৳100", variant: "destructive" });
      return;
    }
    if (amount > (userProfile?.coins || 0)) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await push(ref(db, "withdrawRequests"), {
        uid: currentUser!.uid,
        userName: userProfile?.name || "Unknown",
        bkashNumber: bkashNumber.trim(),
        amount,
        status: "pending",
        createdAt: Date.now(),
      });
      toast({ title: "Withdraw request sent!", description: "Admin will process within 24 hours." });
      setShowWithdraw(false);
      setBkashNumber("");
      setWithdrawAmount("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const totalEarned = earnings.filter((e) => e.type !== "withdrawal").reduce((s, e) => s + e.amount, 0);
  const coins = userProfile?.coins ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Wallet className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Wallet</h1>
            <p className="text-xs text-muted-foreground">Coins ও earnings</p>
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
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-3">
              Total Balance
            </p>
            <div className="flex items-end gap-3 mb-1">
              <Coins className="w-8 h-8 text-yellow-500 mb-1" />
              <h2 className="text-5xl font-extrabold tracking-tighter">{coins}</h2>
              <span className="text-muted-foreground mb-2 font-medium">coins</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-2">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 font-medium">{totalEarned} earned total</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">মোট আয়</p>
            <p className="text-xl font-bold mt-1 text-green-400">{totalEarned} coins</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">এই সপ্তাহ</p>
            <p className="text-xl font-bold mt-1 text-yellow-400">80 coins</p>
          </div>
        </div>

        <GlowButton
          className="w-full h-12 flex items-center gap-2"
          onClick={() => setShowWithdraw(true)}
          data-testid="btn-withdraw"
        >
          <Smartphone className="w-5 h-5" />
          বিকাশে Withdraw করুন
        </GlowButton>

        <AnimatePresence>
          {showWithdraw && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-5 rounded-2xl border border-green-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-black">b</div>
                  <h3 className="font-bold">বিকাশ Withdrawal</h3>
                </div>
                <button onClick={() => setShowWithdraw(false)} data-testid="btn-close-withdraw">
                  <X className="w-5 h-5 text-muted-foreground hover:text-white" />
                </button>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">আপনার বিকাশ নম্বর *</Label>
                  <Input
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="h-12 bg-white/5 border-white/10"
                    data-testid="input-withdraw-bkash"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">
                    পরিমাণ (Coins → BDT) *
                  </Label>
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="100 (minimum)"
                    className="h-12 bg-white/5 border-white/10"
                    data-testid="input-withdraw-amount"
                  />
                  {withdrawAmount && (
                    <p className="text-xs text-primary mt-1">
                      ≈ ৳{parseInt(withdrawAmount) || 0} (1 coin = ৳1)
                    </p>
                  )}
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <p className="text-xs text-yellow-300">
                    ন্যূনতম ১০০ coins · সর্বোচ্চ {coins} coins · Admin ২৪ ঘণ্টার মধ্যে process করবে
                  </p>
                </div>
                <GlowButton
                  type="submit"
                  className="w-full h-11"
                  disabled={submitting || !bkashNumber.trim() || !withdrawAmount}
                  data-testid="btn-submit-withdraw"
                >
                  {submitting ? "Sending..." : "Request পাঠান"}
                </GlowButton>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {withdrawRequests.length > 0 && (
          <section>
            <h3 className="font-bold text-sm mb-2 text-muted-foreground">Pending Withdrawals</h3>
            <div className="space-y-2">
              {withdrawRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 glass-card p-3 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-xs font-bold text-green-500">b</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.bkashNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(r.createdAt, { addSuffix: true })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-red-400">-{r.amount}</p>
                    <Badge className={`text-[10px] ${r.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : r.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {r.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="font-bold text-base mb-3">Transaction History</h3>
          <div className="space-y-2">
            {loading ? (
              [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            ) : earnings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Coins className="w-8 h-8 mx-auto mb-2 opacity-40" />
                এখনো কোনো transaction নেই।
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
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-4 glass-card rounded-xl"
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
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.label}</p>
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
