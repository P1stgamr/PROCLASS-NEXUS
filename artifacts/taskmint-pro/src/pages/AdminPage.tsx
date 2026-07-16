import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ref, onValue, off, update, remove, push } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { SkeletonCard } from "@/components/SkeletonCard";
import { GlowButton } from "@/components/GlowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, BarChart3, Bell, FileCheck, ArrowLeft, Trash2, CheckCircle2, XCircle, Crown, Smartphone, Plus, Trophy, Send, Gift, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { calcPrizes, getRankPrize } from "@/lib/prizeUtils";

export default function AdminPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [membershipRequests, setMembershipRequests] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<Record<string, any[]>>({});
  const [allExams, setAllExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifMsg, setNotifMsg] = useState("");
  const [sending, setSending] = useState(false);

  const [newExam, setNewExam] = useState({
    title: "", description: "", entryFee: "", prizePool: "",
    duration: "30", totalQuestions: "20", category: "Math", level: "All",
    maxParticipants: "100", startTimeStr: "", endTimeStr: "",
  });

  const [gift, setGift] = useState({ uid: "", coins: "", message: "" });
  const [sendingGift, setSendingGift] = useState(false);

  useEffect(() => {
    const adminRoles = ["admin", "super_admin", "owner"];
    if (userProfile && !adminRoles.includes(userProfile.role)) {
      setLocation("/home");
      return;
    }
    const refs = [
      { path: "users", setter: (d: any) => setUsers(Object.values(d)) },
      { path: "tasks", setter: (d: any) => setTasks(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))) },
      { path: "paymentRequests", setter: (d: any) => setPaymentRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a: any, b: any) => b.createdAt - a.createdAt)) },
      { path: "withdrawRequests", setter: (d: any) => setWithdrawRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a: any, b: any) => b.createdAt - a.createdAt)) },
      { path: "membershipRequests", setter: (d: any) => setMembershipRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a: any, b: any) => b.requestedAt - a.requestedAt)) },
    ];
    const unsubs = refs.map(({ path, setter }) =>
      onValue(ref(db, path), (snap) => {
        if (snap.val()) setter(snap.val());
        setLoading(false);
      })
    );

    // load exams
    const examRef = ref(db, "premiumExams");
    onValue(examRef, (snap) => {
      if (snap.val()) setAllExams(Object.entries(snap.val()).map(([id, v]: [string, any]) => ({ id, ...v })));
    });

    // load exam results grouped by examId
    const resultsRef = ref(db, "examResults");
    onValue(resultsRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const grouped: Record<string, any[]> = {};
      Object.entries(data).forEach(([examId, resultsByUid]: [string, any]) => {
        grouped[examId] = Object.values(resultsByUid).sort((a: any, b: any) => b.score - a.score || a.submittedAt - b.submittedAt);
      });
      setExamResults(grouped);
    });

    return () => {
      refs.forEach((_, i) => off(ref(db, refs[i].path)));
      off(examRef);
      off(resultsRef);
    };
  }, [userProfile, setLocation]);

  const approvePayment = async (req: any) => {
    await update(ref(db, `paymentRequests/${req.id}`), { status: "approved" });
    await update(ref(db, `examEntries/${req.uid}/${req.examId}`), { approved: true, paidAt: Date.now() });
    await push(ref(db, `notifications/${req.uid}`), {
      type: "contest", message: `Payment approved! "${req.examTitle}" exam-এ আপনার access দেওয়া হয়েছে।`,
      timestamp: Date.now(), read: false,
    });
    toast({ title: "Payment approved & access granted!" });
  };

  const rejectPayment = async (req: any) => {
    await update(ref(db, `paymentRequests/${req.id}`), { status: "rejected" });
    await push(ref(db, `notifications/${req.uid}`), {
      type: "system", message: `Payment rejected for "${req.examTitle}". Transaction ID verify করা যায়নি।`,
      timestamp: Date.now(), read: false,
    });
    toast({ title: "Payment rejected." });
  };

  const approveWithdraw = async (req: any) => {
    await update(ref(db, `withdrawRequests/${req.id}`), { status: "approved", processedAt: Date.now() });
    await update(ref(db, `users/${req.uid}`), { coins: Math.max(0, (users.find(u => u.uid === req.uid)?.coins || 0) - req.amount) });
    await push(ref(db, `notifications/${req.uid}`), {
      type: "coin", message: `৳${req.amount} বিকাশে পাঠানো হয়েছে (${req.bkashNumber})।`,
      timestamp: Date.now(), read: false,
    });
    toast({ title: "Withdrawal approved & processed!" });
  };

  const rejectWithdraw = async (req: any) => {
    await update(ref(db, `withdrawRequests/${req.id}`), { status: "rejected" });
    await push(ref(db, `notifications/${req.uid}`), {
      type: "system", message: `Withdrawal request (৳${req.amount}) rejected. Admin-এর সাথে যোগাযোগ করুন।`,
      timestamp: Date.now(), read: false,
    });
    toast({ title: "Withdrawal rejected." });
  };

  const sendNotification = async () => {
    if (!notifMsg.trim()) return;
    setSending(true);
    try {
      const updates: Record<string, any> = {};
      users.forEach((u) => {
        updates[`notifications/${u.uid}/${Date.now()}`] = {
          type: "system", message: notifMsg, timestamp: Date.now(), read: false,
        };
      });
      await update(ref(db), updates);
      toast({ title: "Notification sent!" });
      setNotifMsg("");
    } finally {
      setSending(false);
    }
  };

  const createExam = async () => {
    if (!newExam.title || !newExam.entryFee || !newExam.startTimeStr || !newExam.endTimeStr) {
      toast({ title: "Title, Entry Fee, Start Time ও End Time দিন", variant: "destructive" });
      return;
    }
    const startTs = new Date(newExam.startTimeStr).getTime();
    const endTs = new Date(newExam.endTimeStr).getTime();
    if (endTs <= startTs) {
      toast({ title: "End time, Start time-এর পরে হতে হবে", variant: "destructive" });
      return;
    }
    await push(ref(db, "premiumExams"), {
      title: newExam.title,
      description: newExam.description,
      entryFee: parseInt(newExam.entryFee),
      prizePool: parseInt(newExam.prizePool || "0"),
      duration: parseInt(newExam.duration),
      totalQuestions: parseInt(newExam.totalQuestions),
      maxParticipants: parseInt(newExam.maxParticipants),
      category: newExam.category,
      level: newExam.level,
      participants: 0,
      status: "scheduled",
      startTime: startTs,
      endTime: endTs,
      createdAt: Date.now(),
    });
    toast({ title: "Exam created! ✅" });
    setNewExam({ title: "", description: "", entryFee: "", prizePool: "", duration: "30", totalQuestions: "20", category: "Math", level: "All", maxParticipants: "100", startTimeStr: "", endTimeStr: "" });
  };

  const sendGift = async () => {
    if (!gift.uid || !gift.coins) {
      toast({ title: "User ও coins amount দিন", variant: "destructive" });
      return;
    }
    setSendingGift(true);
    try {
      const giftRef = await push(ref(db, `gifts/${gift.uid}`), {
        coins: parseInt(gift.coins),
        message: gift.message || "Admin থেকে বিশেষ উপহার 🎁",
        sentAt: Date.now(),
        claimed: false,
        senderName: userProfile?.name || "Admin",
      });
      await push(ref(db, `notifications/${gift.uid}`), {
        type: "gift",
        message: `🎁 আপনার জন্য একটি gift এসেছে! Gifts page-এ গিয়ে claim করুন।`,
        timestamp: Date.now(),
        read: false,
      });
      toast({ title: `${gift.coins} coins gift পাঠানো হয়েছে!` });
      setGift({ uid: "", coins: "", message: "" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSendingGift(false);
    }
  };

  const markPrizePaid = async (examId: string, winner: any, rank: number, prize: number) => {
    await update(ref(db, `examResults/${examId}/${winner.uid}`), { prizePaid: true, paidAt: Date.now() });
    await push(ref(db, `notifications/${winner.uid}`), {
      type: "contest",
      message: `🏆 অভিনন্দন! "${winner.name}" আপনি ${rank} স্থান পেয়েছেন। ৳${prize} prize আপনার বিকাশে (${winner.bkashNumber || "—"}) পাঠানো হয়েছে।`,
      timestamp: Date.now(),
      read: false,
    });
    toast({ title: `৳${prize} prize paid to ${winner.name}!` });
  };

  const pendingPayments = paymentRequests.filter(r => r.status === "pending");
  const pendingWithdraws = withdrawRequests.filter(r => r.status === "pending");

  const stats = [
    { label: "Users", value: users.length, icon: Users },
    { label: "Tasks", value: tasks.length, icon: FileCheck },
    { label: "Pending Pay", value: pendingPayments.length, icon: Smartphone, alert: pendingPayments.length > 0 },
    { label: "Withdraw", value: pendingWithdraws.length, icon: BarChart3, alert: pendingWithdraws.length > 0 },
  ];

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/home")} className="p-2 rounded-xl hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Shield className="w-6 h-6 text-red-400" />
            <h1 className="text-xl font-extrabold">Admin Panel</h1>
          </div>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Admin</Badge>
        </div>
      </div>

      <div className="px-5 py-5 max-w-2xl mx-auto space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className={`glass-card p-4 rounded-2xl relative ${s.alert ? "ring-1 ring-red-500/50" : ""}`}>
              <s.icon className={`w-5 h-5 mb-2 ${s.alert ? "text-red-400" : "text-primary"}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              {s.alert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            </div>
          ))}
        </div>

        <Tabs defaultValue="payments">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
            <TabsTrigger value="payments" className="relative">
              Payments
              {pendingPayments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold">
                  {pendingPayments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="relative">
              Withdraw
              {pendingWithdraws.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold">
                  {pendingWithdraws.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="gifts">
              <Gift className="w-3.5 h-3.5 mr-1" />Gifts
            </TabsTrigger>
            <TabsTrigger value="results" className="relative">
              Prizes
              {Object.values(examResults).some(rs => rs.some((r: any) => !r.prizePaid && rs.indexOf(r) < 10 && getRankPrize(rs.indexOf(r)+1, (allExams.find(e=>e.id===Object.keys(examResults)[Object.values(examResults).indexOf(rs)])?.participants||0)*(allExams.find(e=>e.id===Object.keys(examResults)[Object.values(examResults).indexOf(rs)])?.entryFee||0)) > 0)) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="membership" className="relative">
              <Crown className="w-3.5 h-3.5 mr-1" />Plans
              {membershipRequests.filter(r => r.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-[9px] flex items-center justify-center font-bold text-black">
                  {membershipRequests.filter(r => r.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="notify">Notify</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">বিকাশ payment verify করুন → Exam access দিন</p>
            {loading ? [0,1].map(i => <SkeletonCard key={i} />) :
             paymentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">কোনো payment request নেই।</div>
            ) : paymentRequests.map((req) => (
              <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-card p-4 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{req.userName}</p>
                    <p className="text-xs text-muted-foreground">{req.examTitle}</p>
                  </div>
                  <Badge className={`text-xs ${req.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : req.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {req.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-bold text-green-400">৳{req.amount}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-muted-foreground">TxnID</p>
                    <p className="font-bold font-mono text-xs truncate">{req.txnId}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-muted-foreground">বিকাশ নম্বর</p>
                    <p className="font-bold">{req.bkashNumber}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-muted-foreground">সময়</p>
                    <p className="font-medium">{formatDistanceToNow(req.createdAt, { addSuffix: true })}</p>
                  </div>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <GlowButton size="sm" glowColor="blue" className="flex-1 h-9 text-xs" onClick={() => approvePayment(req)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
                    </GlowButton>
                    <button onClick={() => rejectPayment(req)}
                      className="flex-1 h-9 text-xs rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="withdraw" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">বিকাশে টাকা পাঠিয়ে Approve করুন</p>
            {withdrawRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">কোনো withdrawal request নেই।</div>
            ) : withdrawRequests.map((req) => (
              <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-card p-4 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{req.userName}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(req.createdAt, { addSuffix: true })}</p>
                  </div>
                  <Badge className={`text-xs ${req.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : req.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {req.status}
                  </Badge>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="flex-1 bg-white/5 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">বিকাশ নম্বর</p>
                    <p className="font-bold text-green-400 tracking-widest">{req.bkashNumber}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-bold text-red-400">৳{req.amount}</p>
                  </div>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <GlowButton size="sm" glowColor="blue" className="flex-1 h-9 text-xs" onClick={() => approveWithdraw(req)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />পাঠিয়েছি
                    </GlowButton>
                    <button onClick={() => rejectWithdraw(req)}
                      className="flex-1 h-9 text-xs rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </TabsContent>

          {/* ── GIFTS TAB ── */}
          <TabsContent value="gifts" className="mt-4 space-y-4">
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold">User-কে Gift পাঠান</h3>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">User বেছে নিন *</Label>
                <select
                  value={gift.uid}
                  onChange={e => setGift(p => ({ ...p, uid: e.target.value }))}
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                  <option value="" className="bg-gray-900">-- User select করুন --</option>
                  {users.filter(u => u.uid !== currentUser?.uid).map(u => (
                    <option key={u.uid} value={u.uid} className="bg-gray-900">
                      {u.name || "Unknown"} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Coins Amount *</Label>
                <Input type="number" value={gift.coins}
                  onChange={e => setGift(p => ({ ...p, coins: e.target.value }))}
                  placeholder="যেমন: 100" className="h-10 bg-white/5 border-white/10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Message (optional)</Label>
                <Input value={gift.message}
                  onChange={e => setGift(p => ({ ...p, message: e.target.value }))}
                  placeholder="বিশেষ বার্তা..." className="h-10 bg-white/5 border-white/10" />
              </div>
              <GlowButton className="w-full h-10" onClick={sendGift} disabled={sendingGift}>
                <Gift className="w-4 h-4 mr-2" />
                {sendingGift ? "পাঠানো হচ্ছে..." : "Gift পাঠান"}
              </GlowButton>
              <p className="text-[11px] text-muted-foreground text-center">
                User একটি Ad দেখার পর gift claim করতে পারবে
              </p>
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-4 space-y-5">
            <p className="text-xs text-muted-foreground">Exam শেষে prize distribute করুন — বিকাশে পাঠিয়ে "Prize Paid" চাপুন</p>
            {Object.keys(examResults).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                এখনো কোনো exam result নেই।
              </div>
            ) : Object.entries(examResults).map(([examId, results]) => {
              const exam = allExams.find(e => e.id === examId);
              const participants = exam?.participants || results.length;
              const entryFee = exam?.entryFee || 0;
              const totalPool = participants * entryFee;
              const prizes = calcPrizes(totalPool);
              const top10 = results.slice(0, 10);

              return (
                <motion.div key={examId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl overflow-hidden">
                  {/* Exam header */}
                  <div className="p-4 border-b border-white/10 bg-yellow-500/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm">{exam?.title || examId}</h3>
                        <p className="text-xs text-muted-foreground">{results.length} participants</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Pool</p>
                        <p className="font-extrabold text-yellow-400">৳{totalPool.toLocaleString()}</p>
                      </div>
                    </div>
                    {/* Prize summary */}
                    <div className="grid grid-cols-4 gap-1.5 mt-3">
                      {[
                        { l: "🥇 1st", v: prizes.first },
                        { l: "🥈 2nd", v: prizes.second },
                        { l: "🥉 3rd", v: prizes.third },
                        { l: "🏅 4–10 ea.", v: prizes.fourth10Each },
                      ].map(r => (
                        <div key={r.l} className="bg-white/5 rounded-lg p-1.5 text-center">
                          <p className="text-[10px] text-muted-foreground">{r.l}</p>
                          <p className="text-xs font-bold text-green-400">৳{r.v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground bg-white/5 rounded-lg px-3 py-1.5">
                      <span>🏦 Admin cut (২০%)</span>
                      <span className="font-bold text-red-400">৳{prizes.admin.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Leaderboard with prize paid buttons */}
                  <div className="divide-y divide-white/5">
                    {top10.map((r: any, i: number) => {
                      const rank = i + 1;
                      const prize = getRankPrize(rank, totalPool);
                      const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `🏅`;
                      return (
                        <div key={r.uid} className={`flex items-center gap-3 px-4 py-3 ${r.prizePaid ? "opacity-60" : ""}`}>
                          <span className="text-lg w-7">{rankEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {r.score} pts · {r.bkashNumber ? `বিকাশ: ${r.bkashNumber}` : "বিকাশ নম্বর নেই"}
                            </p>
                          </div>
                          {prize > 0 ? (
                            r.prizePaid ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">
                                <CheckCircle2 className="w-3 h-3 mr-1" />Paid ৳{prize}
                              </Badge>
                            ) : (
                              <button
                                onClick={() => markPrizePaid(examId, r, rank, prize)}
                                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-xs font-semibold transition-colors border border-yellow-500/20">
                                <Send className="w-3 h-3" />৳{prize} দিন
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground shrink-0">No prize</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </TabsContent>

          <TabsContent value="membership" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Membership payment verify করুন → Plan activate করুন</p>
            {membershipRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">কোনো membership request নেই।</div>
            ) : membershipRequests.map((req) => {
              const isPending = req.status === "pending";
              return (
                <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`glass-card p-4 rounded-2xl border ${isPending ? "border-yellow-500/20" : req.status === "approved" ? "border-green-500/20" : "border-red-500/20"}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[10px] capitalize ${req.plan === "platinum" ? "bg-violet-500/20 text-violet-400" : req.plan === "gold" ? "badge-coin" : "bg-slate-400/20 text-slate-300"}`}>
                          <Crown className="w-2.5 h-2.5 mr-1" />{req.plan}
                        </Badge>
                        <Badge className={`text-[10px] ${isPending ? "bg-yellow-500/20 text-yellow-400" : req.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm">{req.name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{req.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-400">৳{req.price}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{req.txnId}</p>
                    </div>
                  </div>
                  {isPending && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await update(ref(db, `membershipRequests/${req.id}`), { status: "approved", approvedAt: Date.now() });
                          await update(ref(db, `users/${req.uid}`), { membership: req.plan, membershipExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000 });
                          await push(ref(db, `notifications/${req.uid}`), {
                            type: "coin", message: `🎉 ${req.plan.charAt(0).toUpperCase() + req.plan.slice(1)} membership activate হয়েছে!`,
                            timestamp: Date.now(), read: false,
                          });
                          toast({ title: `${req.plan} membership approved!` });
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/30 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" />Approve
                      </button>
                      <button
                        onClick={async () => {
                          await update(ref(db, `membershipRequests/${req.id}`), { status: "rejected" });
                          await push(ref(db, `notifications/${req.uid}`), {
                            type: "system", message: `Membership request rejected. Transaction ID verify করা যায়নি।`,
                            timestamp: Date.now(), read: false,
                          });
                          toast({ title: "Rejected." });
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors">
                        <XCircle className="w-3.5 h-3.5" />Reject
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </TabsContent>

          <TabsContent value="exams" className="mt-4 space-y-4">
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold">নতুন Premium Exam তৈরি করুন</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">Exam Title *</Label>
                  <Input value={newExam.title} onChange={e => setNewExam(p => ({ ...p, title: e.target.value }))}
                    placeholder="Exam title" className="h-10 bg-white/5 border-white/10" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                  <Textarea value={newExam.description} onChange={e => setNewExam(p => ({ ...p, description: e.target.value }))}
                    placeholder="Exam details..." className="bg-white/5 border-white/10 resize-none h-16 text-sm" />
                </div>
                {[
                  { key: "entryFee", label: "Entry Fee (৳)", placeholder: "20" },
                  { key: "prizePool", label: "Prize Pool (৳)", placeholder: "500" },
                  { key: "duration", label: "Duration (min)", placeholder: "30" },
                  { key: "maxParticipants", label: "Max Participants", placeholder: "100" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                    <Input type="number" value={(newExam as any)[key]}
                      onChange={e => setNewExam(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder} className="h-10 bg-white/5 border-white/10" />
                  </div>
                ))}
                <div className="col-span-2 border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest">Exam Schedule *</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">🟢 Start Time</Label>
                      <Input type="datetime-local" value={newExam.startTimeStr}
                        onChange={e => setNewExam(p => ({ ...p, startTimeStr: e.target.value }))}
                        className="h-10 bg-white/5 border-white/10 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">🔴 End Time</Label>
                      <Input type="datetime-local" value={newExam.endTimeStr}
                        onChange={e => setNewExam(p => ({ ...p, endTimeStr: e.target.value }))}
                        className="h-10 bg-white/5 border-white/10 text-xs" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Start → End সময়ের মধ্যে users join ও exam দিতে পারবে
                  </p>
                </div>
              </div>
              <GlowButton className="w-full h-10" onClick={createExam} data-testid="btn-create-exam">
                <Plus className="w-4 h-4 mr-2" />Exam Create করুন
              </GlowButton>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4 space-y-2">
            {loading ? [0,1,2].map(i => <SkeletonCard key={i} />) : users.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 glass-card p-4 rounded-xl">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={u.photoURL} />
                  <AvatarFallback>{u.name?.charAt(0) || "S"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="text-xs bg-yellow-500/20 text-yellow-400">{u.coins || 0} coins</Badge>
                  {u.uid !== currentUser?.uid && (
                    <button onClick={() => update(ref(db, `users/${u.uid}`), { banned: true })}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="notify" className="mt-4">
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-bold">সবাইকে Notification পাঠান</h3>
              </div>
              <Textarea value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)}
                placeholder="Notification message..." className="bg-white/5 border-white/10 resize-none h-24" />
              <GlowButton className="w-full h-10" onClick={sendNotification}
                disabled={!notifMsg.trim() || sending}>
                {sending ? "Sending..." : `${users.length} জনকে পাঠান`}
              </GlowButton>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
