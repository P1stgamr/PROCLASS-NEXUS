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
import { Shield, Users, BarChart3, Bell, FileCheck, ArrowLeft, Trash2, CheckCircle2, XCircle, Crown, Smartphone, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifMsg, setNotifMsg] = useState("");
  const [sending, setSending] = useState(false);

  const [newExam, setNewExam] = useState({
    title: "", description: "", entryFee: "", prizePool: "",
    duration: "30", totalQuestions: "20", category: "Math", level: "All",
    maxParticipants: "100",
  });

  useEffect(() => {
    if (userProfile && userProfile.role !== "admin") {
      setLocation("/home");
      return;
    }
    const refs = [
      { path: "users", setter: (d: any) => setUsers(Object.values(d)) },
      { path: "tasks", setter: (d: any) => setTasks(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))) },
      { path: "paymentRequests", setter: (d: any) => setPaymentRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a: any, b: any) => b.createdAt - a.createdAt)) },
      { path: "withdrawRequests", setter: (d: any) => setWithdrawRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a: any, b: any) => b.createdAt - a.createdAt)) },
    ];
    const unsubs = refs.map(({ path, setter }) =>
      onValue(ref(db, path), (snap) => {
        if (snap.val()) setter(snap.val());
        setLoading(false);
      })
    );
    return () => refs.forEach((_, i) => off(ref(db, refs[i].path)));
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
    if (!newExam.title || !newExam.entryFee || !newExam.prizePool) {
      toast({ title: "সব field পূরণ করুন", variant: "destructive" });
      return;
    }
    await push(ref(db, "premiumExams"), {
      ...newExam,
      entryFee: parseInt(newExam.entryFee),
      prizePool: parseInt(newExam.prizePool),
      duration: parseInt(newExam.duration),
      totalQuestions: parseInt(newExam.totalQuestions),
      maxParticipants: parseInt(newExam.maxParticipants),
      participants: 0,
      status: "open",
      startTime: Date.now() + 3600000,
      createdAt: Date.now(),
    });
    toast({ title: "Exam created!" });
    setNewExam({ title: "", description: "", entryFee: "", prizePool: "", duration: "30", totalQuestions: "20", category: "Math", level: "All", maxParticipants: "100" });
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
