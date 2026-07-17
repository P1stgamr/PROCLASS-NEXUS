import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off, update, remove, push, set } from "firebase/database";
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
import {
  Shield, Users, BarChart3, Bell, FileCheck, ArrowLeft, Trash2,
  CheckCircle2, XCircle, Crown, Smartphone, Plus, Trophy, Send,
  Gift, Calendar, Edit2, BookOpen, Target, X, Coins, Zap,
  TrendingUp, Activity, Eye, Lock, Unlock, Save, Code2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { calcPrizes, getRankPrize } from "@/lib/prizeUtils";

const FIELD = "h-10 bg-white/5 border-white/10 text-sm";
const CARD = "glass-card p-4 rounded-2xl border border-white/10";

function StatCard({ label, value, icon: Icon, color, alert }: any) {
  return (
    <div className={`${CARD} relative`}>
      {alert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Data
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [membershipRequests, setMembershipRequests] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<Record<string, any[]>>({});
  const [allExams, setAllExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [notifMsg, setNotifMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [gift, setGift] = useState({ uid: "", coins: "", message: "" });
  const [sendingGift, setSendingGift] = useState(false);

  const [newTask, setNewTask] = useState({ title: "", description: "", reward: "50", deadline: "" });
  const [editingTask, setEditingTask] = useState<any>(null);

  const [newMission, setNewMission] = useState({ title: "", reward: "50", total: "1", icon: "📚" });
  const [editingMission, setEditingMission] = useState<any>(null);

  const [newCourse, setNewCourse] = useState({ title: "", desc: "", instructor: "", type: "free", price: "0", tag: "programming", duration: "", lessons: "10", emoji: "📚" });
  const [editingCourse, setEditingCourse] = useState<any>(null);

  const [newExam, setNewExam] = useState({
    title: "", description: "", entryFee: "", prizePool: "",
    duration: "30", totalQuestions: "20", category: "Math", level: "All",
    maxParticipants: "100", startTimeStr: "", endTimeStr: "",
  });

  const [editingUser, setEditingUser] = useState<any>(null);
  const [userEdit, setUserEdit] = useState({ coins: "", role: "" });

  useEffect(() => {
    const adminRoles = ["admin", "super_admin", "owner"];
    if (userProfile && !adminRoles.includes(userProfile.role)) {
      setLocation("/home");
      return;
    }
    const paths: { path: string; setter: (d: any) => void }[] = [
      { path: "users", setter: (d) => setUsers(Object.values(d)) },
      { path: "tasks", setter: (d) => setTasks(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))) },
      { path: "dailyMissions", setter: (d) => setMissions(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))) },
      { path: "courses", setter: (d) => setCourses(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))) },
      { path: "paymentRequests", setter: (d) => setPaymentRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a: any, b: any) => b.createdAt - a.createdAt)) },
      { path: "withdrawRequests", setter: (d) => setWithdrawRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a: any, b: any) => b.createdAt - a.createdAt)) },
      { path: "membershipRequests", setter: (d) => setMembershipRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a: any, b: any) => b.requestedAt - a.requestedAt)) },
    ];
    const unsubs = paths.map(({ path, setter }) =>
      onValue(ref(db, path), (snap) => {
        if (snap.val()) setter(snap.val());
        setLoading(false);
      }, () => setLoading(false))
    );
    const examRef = ref(db, "premiumExams");
    onValue(examRef, (snap) => {
      if (snap.val()) setAllExams(Object.entries(snap.val()).map(([id, v]: [string, any]) => ({ id, ...v })));
    });
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
    return () => { unsubs.forEach(u => u()); off(examRef); off(resultsRef); };
  }, [userProfile, setLocation]);

  // ── Real stats ──
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const onlineUsers = users.filter(u => u.lastActive && u.lastActive > fiveMinAgo).length;
  const pendingPayments = paymentRequests.filter(r => r.status === "pending");
  const pendingWithdraws = withdrawRequests.filter(r => r.status === "pending");
  const pendingMemberships = membershipRequests.filter(r => r.status === "pending");
  const totalCoins = users.reduce((s, u) => s + (u.coins || 0), 0);

  // ── Task CRUD ──
  const createTask = async () => {
    if (!newTask.title.trim()) { toast({ title: "Title দিন", variant: "destructive" }); return; }
    await push(ref(db, "tasks"), { ...newTask, reward: parseInt(newTask.reward), status: "active", createdAt: Date.now() });
    toast({ title: "Task created! ✅" });
    setNewTask({ title: "", description: "", reward: "50", deadline: "" });
  };
  const saveTask = async () => {
    if (!editingTask) return;
    await update(ref(db, `tasks/${editingTask.id}`), { title: editingTask.title, description: editingTask.description, reward: parseInt(editingTask.reward), deadline: editingTask.deadline });
    setEditingTask(null);
    toast({ title: "Task updated!" });
  };
  const deleteTask = async (id: string) => {
    await remove(ref(db, `tasks/${id}`));
    toast({ title: "Task deleted." });
  };

  // ── Mission CRUD ──
  const createMission = async () => {
    if (!newMission.title.trim()) { toast({ title: "Title দিন", variant: "destructive" }); return; }
    await push(ref(db, "dailyMissions"), { ...newMission, reward: parseInt(newMission.reward), total: parseInt(newMission.total), createdAt: Date.now() });
    toast({ title: "Mission created! ✅" });
    setNewMission({ title: "", reward: "50", total: "1", icon: "📚" });
  };
  const saveMission = async () => {
    if (!editingMission) return;
    await update(ref(db, `dailyMissions/${editingMission.id}`), { title: editingMission.title, reward: parseInt(editingMission.reward), total: parseInt(editingMission.total), icon: editingMission.icon });
    setEditingMission(null);
    toast({ title: "Mission updated!" });
  };
  const deleteMission = async (id: string) => {
    await remove(ref(db, `dailyMissions/${id}`));
    toast({ title: "Mission deleted." });
  };

  // ── Course CRUD ──
  const createCourse = async () => {
    if (!newCourse.title.trim()) { toast({ title: "Title দিন", variant: "destructive" }); return; }
    await push(ref(db, "courses"), { ...newCourse, price: parseInt(newCourse.price), lessons: parseInt(newCourse.lessons), students: 0, rating: 5.0, createdAt: Date.now() });
    toast({ title: "Course created! ✅" });
    setNewCourse({ title: "", desc: "", instructor: "", type: "free", price: "0", tag: "programming", duration: "", lessons: "10", emoji: "📚" });
  };
  const saveCourse = async () => {
    if (!editingCourse) return;
    await update(ref(db, `courses/${editingCourse.id}`), { title: editingCourse.title, desc: editingCourse.desc, instructor: editingCourse.instructor, type: editingCourse.type, price: parseInt(editingCourse.price || "0") });
    setEditingCourse(null);
    toast({ title: "Course updated!" });
  };
  const deleteCourse = async (id: string) => {
    await remove(ref(db, `courses/${id}`));
    toast({ title: "Course deleted." });
  };

  // ── Exam CRUD ──
  const createExam = async () => {
    if (!newExam.title || !newExam.entryFee || !newExam.startTimeStr || !newExam.endTimeStr) {
      toast({ title: "সব required field পূরণ করুন", variant: "destructive" }); return;
    }
    const startTs = new Date(newExam.startTimeStr).getTime();
    const endTs = new Date(newExam.endTimeStr).getTime();
    if (endTs <= startTs) { toast({ title: "End time, Start time-এর পরে হতে হবে", variant: "destructive" }); return; }
    await push(ref(db, "premiumExams"), {
      title: newExam.title, description: newExam.description,
      entryFee: parseInt(newExam.entryFee), prizePool: parseInt(newExam.prizePool || "0"),
      duration: parseInt(newExam.duration), totalQuestions: parseInt(newExam.totalQuestions),
      maxParticipants: parseInt(newExam.maxParticipants), category: newExam.category,
      level: newExam.level, participants: 0, status: "scheduled", startTime: startTs, endTime: endTs, createdAt: Date.now(),
    });
    toast({ title: "Exam created! ✅" });
    setNewExam({ title: "", description: "", entryFee: "", prizePool: "", duration: "30", totalQuestions: "20", category: "Math", level: "All", maxParticipants: "100", startTimeStr: "", endTimeStr: "" });
  };
  const deleteExam = async (id: string) => {
    await remove(ref(db, `premiumExams/${id}`));
    toast({ title: "Exam deleted." });
  };

  // ── User management ──
  const openUserEdit = (u: any) => {
    setEditingUser(u);
    setUserEdit({ coins: String(u.coins || 0), role: u.role || "student" });
  };
  const saveUserEdit = async () => {
    if (!editingUser) return;
    await update(ref(db, `users/${editingUser.uid}`), { coins: parseInt(userEdit.coins), role: userEdit.role });
    setEditingUser(null);
    toast({ title: "User updated!" });
  };
  const toggleBan = async (u: any) => {
    await update(ref(db, `users/${u.uid}`), { banned: !u.banned });
    toast({ title: u.banned ? "User unbanned." : "User banned." });
  };

  // ── Payment / Withdraw / Prize / Notify ──
  const approvePayment = async (req: any) => {
    await update(ref(db, `paymentRequests/${req.id}`), { status: "approved" });
    await update(ref(db, `examEntries/${req.uid}/${req.examId}`), { approved: true, paidAt: Date.now() });
    await push(ref(db, `notifications/${req.uid}`), { type: "contest", message: `Payment approved! "${req.examTitle}" exam access দেওয়া হয়েছে।`, timestamp: Date.now(), read: false });
    toast({ title: "Payment approved!" });
  };
  const rejectPayment = async (req: any) => {
    await update(ref(db, `paymentRequests/${req.id}`), { status: "rejected" });
    await push(ref(db, `notifications/${req.uid}`), { type: "system", message: `Payment rejected for "${req.examTitle}".`, timestamp: Date.now(), read: false });
    toast({ title: "Payment rejected." });
  };
  const approveWithdraw = async (req: any) => {
    await update(ref(db, `withdrawRequests/${req.id}`), { status: "approved", processedAt: Date.now() });
    await update(ref(db, `users/${req.uid}`), { coins: Math.max(0, (users.find(u => u.uid === req.uid)?.coins || 0) - req.amount) });
    await push(ref(db, `notifications/${req.uid}`), { type: "coin", message: `৳${req.amount} বিকাশে পাঠানো হয়েছে।`, timestamp: Date.now(), read: false });
    toast({ title: "Withdrawal approved!" });
  };
  const rejectWithdraw = async (req: any) => {
    await update(ref(db, `withdrawRequests/${req.id}`), { status: "rejected" });
    await push(ref(db, `notifications/${req.uid}`), { type: "system", message: `Withdrawal request (৳${req.amount}) rejected.`, timestamp: Date.now(), read: false });
    toast({ title: "Withdrawal rejected." });
  };
  const markPrizePaid = async (examId: string, winner: any, rank: number, prize: number) => {
    await update(ref(db, `examResults/${examId}/${winner.uid}`), { prizePaid: true, paidAt: Date.now() });
    await push(ref(db, `notifications/${winner.uid}`), { type: "contest", message: `🏆 ${rank} স্থান! ৳${prize} prize পাঠানো হয়েছে।`, timestamp: Date.now(), read: false });
    toast({ title: `৳${prize} prize paid!` });
  };
  const sendGift = async () => {
    if (!gift.uid || !gift.coins) { toast({ title: "User ও coins দিন", variant: "destructive" }); return; }
    setSendingGift(true);
    try {
      await push(ref(db, `gifts/${gift.uid}`), { coins: parseInt(gift.coins), message: gift.message || "Admin থেকে বিশেষ উপহার 🎁", sentAt: Date.now(), claimed: false, senderName: userProfile?.name || "Admin" });
      await push(ref(db, `notifications/${gift.uid}`), { type: "gift", message: `🎁 আপনার জন্য gift এসেছে! Gifts page-এ claim করুন।`, timestamp: Date.now(), read: false });
      toast({ title: `${gift.coins} coins gift পাঠানো হয়েছে!` });
      setGift({ uid: "", coins: "", message: "" });
    } finally { setSendingGift(false); }
  };
  const sendNotification = async () => {
    if (!notifMsg.trim()) return;
    setSending(true);
    try {
      const updates: Record<string, any> = {};
      users.forEach(u => { updates[`notifications/${u.uid}/${Date.now()}_${u.uid}`] = { type: "system", message: notifMsg, timestamp: Date.now(), read: false }; });
      await update(ref(db), updates);
      toast({ title: "Notification sent to all!" });
      setNotifMsg("");
    } finally { setSending(false); }
  };

  const badgeColor: Record<string, string> = { pending: "bg-yellow-500/20 text-yellow-400", approved: "bg-green-500/20 text-green-400", rejected: "bg-red-500/20 text-red-400" };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/home")} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-none">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground">PROCLASS NEXUS Control Center</p>
            </div>
          </div>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 capitalize">{userProfile?.role || "admin"}</Badge>
        </div>
      </div>

      <div className="px-5 py-5 max-w-2xl mx-auto space-y-5">
        {/* Live Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={users.length} icon={Users} color="bg-blue-500" />
          <StatCard label="Online Now" value={onlineUsers} icon={Activity} color="bg-green-500" />
          <StatCard label="Pending Pay" value={pendingPayments.length} icon={Smartphone} color="bg-yellow-500" alert={pendingPayments.length > 0} />
          <StatCard label="Withdrawals" value={pendingWithdraws.length} icon={TrendingUp} color="bg-red-500" alert={pendingWithdraws.length > 0} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Tasks" value={tasks.length} icon={FileCheck} color="bg-violet-500" />
          <StatCard label="Missions" value={missions.length} icon={Target} color="bg-cyan-500" />
          <StatCard label="Courses" value={courses.length} icon={BookOpen} color="bg-emerald-500" />
          <StatCard label="Memberships" value={pendingMemberships.length} icon={Crown} color="bg-amber-500" alert={pendingMemberships.length > 0} />
        </div>

        <Tabs defaultValue="tasks">
          <TabsList className="bg-white/5 border border-white/10 h-auto flex-wrap gap-0.5 p-1">
            {[
              { v: "tasks", label: "Tasks", icon: FileCheck },
              { v: "missions", label: "Missions", icon: Target },
              { v: "courses", label: "Courses", icon: BookOpen },
              { v: "payments", label: "Payments", badge: pendingPayments.length },
              { v: "withdraw", label: "Withdraw", badge: pendingWithdraws.length },
              { v: "membership", label: "Plans", badge: pendingMemberships.length },
              { v: "prizes", label: "Prizes" },
              { v: "exams", label: "Exams" },
              { v: "users", label: "Users" },
              { v: "gifts", label: "Gifts" },
              { v: "notify", label: "Notify" },
            ].map(t => (
              <TabsTrigger key={t.v} value={t.v} className="relative text-xs px-3 py-1.5">
                {t.label}
                {(t.badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold text-white">{t.badge}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ─── TASKS TAB ─── */}
          <TabsContent value="tasks" className="mt-4 space-y-4">
            {/* Create Task */}
            <div className={CARD + " space-y-3"}>
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">নতুন Task তৈরি করুন</h3>
              </div>
              <Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                placeholder="Task title *" className={FIELD} />
              <Textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                placeholder="Description..." className="bg-white/5 border-white/10 resize-none h-16 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Coins Reward</Label>
                  <Input type="number" value={newTask.reward} onChange={e => setNewTask(p => ({ ...p, reward: e.target.value }))} className={FIELD} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Deadline (optional)</Label>
                  <Input type="date" value={newTask.deadline} onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))} className={FIELD} />
                </div>
              </div>
              <GlowButton className="w-full h-9 text-sm" onClick={createTask}>
                <Plus className="w-3.5 h-3.5 mr-1" />Task Create করুন
              </GlowButton>
            </div>
            {/* Task List */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Existing Tasks ({tasks.length})</p>
              {loading ? [0,1,2].map(i => <SkeletonCard key={i} />) :
               tasks.length === 0 ? <p className="text-center py-6 text-sm text-muted-foreground">কোনো task নেই। উপরে তৈরি করুন।</p> :
               tasks.map(task => (
                <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
                  {editingTask?.id === task.id ? (
                    <div className="space-y-2">
                      <Input value={editingTask.title} onChange={e => setEditingTask((p: any) => ({ ...p, title: e.target.value }))} className={FIELD} />
                      <Textarea value={editingTask.description} onChange={e => setEditingTask((p: any) => ({ ...p, description: e.target.value }))}
                        className="bg-white/5 border-white/10 resize-none h-12 text-sm" />
                      <div className="flex gap-2">
                        <Input type="number" value={editingTask.reward} onChange={e => setEditingTask((p: any) => ({ ...p, reward: e.target.value }))} className={FIELD + " w-32"} placeholder="Reward" />
                        <GlowButton size="sm" className="h-9 px-4 text-xs" onClick={saveTask}><Save className="w-3 h-3 mr-1" />Save</GlowButton>
                        <button onClick={() => setEditingTask(null)} className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs transition-colors"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/15 text-yellow-400">+{task.reward} coins</Badge>
                          {task.deadline && <span className="text-[10px] text-muted-foreground">Due: {task.deadline}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditingTask({ ...task })} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ─── MISSIONS TAB ─── */}
          <TabsContent value="missions" className="mt-4 space-y-4">
            <div className={CARD + " space-y-3"}>
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm">নতুন Daily Mission তৈরি করুন</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input value={newMission.title} onChange={e => setNewMission(p => ({ ...p, title: e.target.value }))}
                    placeholder="Mission title *" className={FIELD} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Icon (emoji)</Label>
                  <Input value={newMission.icon} onChange={e => setNewMission(p => ({ ...p, icon: e.target.value }))} className={FIELD} placeholder="📚" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Coins Reward</Label>
                  <Input type="number" value={newMission.reward} onChange={e => setNewMission(p => ({ ...p, reward: e.target.value }))} className={FIELD} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">Target Count (কতবার করতে হবে)</Label>
                  <Input type="number" value={newMission.total} onChange={e => setNewMission(p => ({ ...p, total: e.target.value }))} className={FIELD} placeholder="3" />
                </div>
              </div>
              <GlowButton className="w-full h-9 text-sm" onClick={createMission}>
                <Plus className="w-3.5 h-3.5 mr-1" />Mission Create করুন
              </GlowButton>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Daily Missions ({missions.length})</p>
              {missions.length === 0 ? <p className="text-center py-6 text-sm text-muted-foreground">কোনো mission নেই।</p> :
               missions.map(m => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
                  {editingMission?.id === m.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input value={editingMission.icon} onChange={e => setEditingMission((p: any) => ({ ...p, icon: e.target.value }))} className={FIELD + " w-16"} />
                        <Input value={editingMission.title} onChange={e => setEditingMission((p: any) => ({ ...p, title: e.target.value }))} className={FIELD} />
                      </div>
                      <div className="flex gap-2">
                        <Input type="number" value={editingMission.reward} onChange={e => setEditingMission((p: any) => ({ ...p, reward: e.target.value }))} className={FIELD} placeholder="Reward" />
                        <Input type="number" value={editingMission.total} onChange={e => setEditingMission((p: any) => ({ ...p, total: e.target.value }))} className={FIELD} placeholder="Target" />
                        <GlowButton size="sm" className="h-10 px-4 text-xs shrink-0" onClick={saveMission}><Save className="w-3 h-3 mr-1" />Save</GlowButton>
                        <button onClick={() => setEditingMission(null)} className="h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs transition-colors shrink-0"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{m.icon || "📚"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{m.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/15 text-yellow-400">+{m.reward} coins</Badge>
                          <span className="text-[10px] text-muted-foreground">Target: {m.total}x</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditingMission({ ...m })} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteMission(m.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ─── COURSES TAB ─── */}
          <TabsContent value="courses" className="mt-4 space-y-4">
            <div className={CARD + " space-y-3"}>
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">নতুন Course তৈরি করুন</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input value={newCourse.title} onChange={e => setNewCourse(p => ({ ...p, title: e.target.value }))} placeholder="Course title *" className={FIELD} />
                </div>
                <div className="col-span-2">
                  <Textarea value={newCourse.desc} onChange={e => setNewCourse(p => ({ ...p, desc: e.target.value }))} placeholder="Description..." className="bg-white/5 border-white/10 resize-none h-14 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Instructor</Label>
                  <Input value={newCourse.instructor} onChange={e => setNewCourse(p => ({ ...p, instructor: e.target.value }))} className={FIELD} placeholder="Teacher name" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Emoji Icon</Label>
                  <Input value={newCourse.emoji} onChange={e => setNewCourse(p => ({ ...p, emoji: e.target.value }))} className={FIELD} placeholder="📚" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                  <select value={newCourse.type} onChange={e => setNewCourse(p => ({ ...p, type: e.target.value }))}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                    <option value="free" className="bg-gray-900">Free</option>
                    <option value="premium" className="bg-gray-900">Premium</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Price (৳)</Label>
                  <Input type="number" value={newCourse.price} onChange={e => setNewCourse(p => ({ ...p, price: e.target.value }))} className={FIELD} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                  <select value={newCourse.tag} onChange={e => setNewCourse(p => ({ ...p, tag: e.target.value }))}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                    {["ssc","hsc","programming","olympiad","general"].map(t => <option key={t} value={t} className="bg-gray-900">{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Lessons</Label>
                  <Input type="number" value={newCourse.lessons} onChange={e => setNewCourse(p => ({ ...p, lessons: e.target.value }))} className={FIELD} />
                </div>
              </div>
              <GlowButton className="w-full h-9 text-sm" onClick={createCourse}><Plus className="w-3.5 h-3.5 mr-1" />Course Create করুন</GlowButton>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Courses ({courses.length})</p>
              {courses.length === 0 ? <p className="text-center py-6 text-sm text-muted-foreground">কোনো course নেই Firebase-এ। উপরে তৈরি করুন।</p> :
               courses.map(c => (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
                  {editingCourse?.id === c.id ? (
                    <div className="space-y-2">
                      <Input value={editingCourse.title} onChange={e => setEditingCourse((p: any) => ({ ...p, title: e.target.value }))} className={FIELD} />
                      <Input value={editingCourse.desc} onChange={e => setEditingCourse((p: any) => ({ ...p, desc: e.target.value }))} className={FIELD} />
                      <Input value={editingCourse.instructor} onChange={e => setEditingCourse((p: any) => ({ ...p, instructor: e.target.value }))} className={FIELD} placeholder="Instructor" />
                      <div className="flex gap-2">
                        <Input type="number" value={editingCourse.price} onChange={e => setEditingCourse((p: any) => ({ ...p, price: e.target.value }))} className={FIELD} placeholder="Price" />
                        <select value={editingCourse.type} onChange={e => setEditingCourse((p: any) => ({ ...p, type: e.target.value }))}
                          className="flex-1 h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                          <option value="free" className="bg-gray-900">Free</option>
                          <option value="premium" className="bg-gray-900">Premium</option>
                        </select>
                        <GlowButton size="sm" className="h-10 px-4 text-xs shrink-0" onClick={saveCourse}><Save className="w-3 h-3 mr-1" />Save</GlowButton>
                        <button onClick={() => setEditingCourse(null)} className="h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs shrink-0"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.emoji || "📚"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{c.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={`text-[9px] px-1.5 py-0 ${c.type === "premium" ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"}`}>{c.type}</Badge>
                          {c.type === "premium" && <span className="text-[10px] text-muted-foreground">৳{c.price}</span>}
                          <span className="text-[10px] text-muted-foreground">{c.instructor}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditingCourse({ ...c })} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteCourse(c.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ─── PAYMENTS TAB ─── */}
          <TabsContent value="payments" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">বিকাশ payment verify করুন → Exam access দিন</p>
            {loading ? [0,1].map(i => <SkeletonCard key={i} />) :
             paymentRequests.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">কোনো payment request নেই।</div> :
             paymentRequests.map(req => (
              <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD + " space-y-3"}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{req.userName}</p>
                    <p className="text-xs text-muted-foreground">{req.examTitle}</p>
                  </div>
                  <Badge className={`text-xs ${badgeColor[req.status] || ""}`}>{req.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[["Amount", `৳${req.amount}`, "text-green-400"], ["TxnID", req.txnId, "text-white font-mono"], ["বিকাশ", req.bkashNumber, "text-white"], ["সময়", req.createdAt ? formatDistanceToNow(req.createdAt, { addSuffix: true }) : "—", "text-white"]].map(([l, v, c]) => (
                    <div key={l} className="bg-white/5 rounded-lg p-2">
                      <p className="text-muted-foreground">{l}</p>
                      <p className={`font-bold text-xs truncate ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => approvePayment(req)} className="flex-1 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-green-500/30 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" />Approve
                    </button>
                    <button onClick={() => rejectPayment(req)} className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-red-500/30 transition-colors">
                      <XCircle className="w-3.5 h-3.5" />Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </TabsContent>

          {/* ─── WITHDRAW TAB ─── */}
          <TabsContent value="withdraw" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">বিকাশে টাকা পাঠিয়ে Approve করুন</p>
            {withdrawRequests.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">কোনো withdrawal request নেই।</div> :
             withdrawRequests.map(req => (
              <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD + " space-y-3"}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{req.userName}</p>
                    <p className="text-xs text-muted-foreground">{req.createdAt ? formatDistanceToNow(req.createdAt, { addSuffix: true }) : "—"}</p>
                  </div>
                  <Badge className={`text-xs ${badgeColor[req.status] || ""}`}>{req.status}</Badge>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/5 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">বিকাশ নম্বর</p>
                    <p className="font-bold text-green-400 tracking-widest text-sm">{req.bkashNumber}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-bold text-red-400 text-sm">৳{req.amount}</p>
                  </div>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => approveWithdraw(req)} className="flex-1 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-green-500/30 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" />পাঠিয়েছি
                    </button>
                    <button onClick={() => rejectWithdraw(req)} className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-red-500/30 transition-colors">
                      <XCircle className="w-3.5 h-3.5" />Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </TabsContent>

          {/* ─── MEMBERSHIP TAB ─── */}
          <TabsContent value="membership" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Membership payment verify করুন → Plan activate করুন</p>
            {membershipRequests.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">কোনো membership request নেই।</div> :
             membershipRequests.map(req => {
              const isPending = req.status === "pending";
              return (
                <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`${CARD} ${isPending ? "border-yellow-500/20" : req.status === "approved" ? "border-green-500/20" : "border-red-500/20"}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[10px] capitalize ${req.plan === "platinum" ? "bg-violet-500/20 text-violet-400" : req.plan === "gold" ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-400/20 text-slate-300"}`}>
                          <Crown className="w-2.5 h-2.5 mr-1" />{req.plan}
                        </Badge>
                        <Badge className={`text-[10px] ${badgeColor[req.status] || ""}`}>{req.status}</Badge>
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
                      <button onClick={async () => {
                          await update(ref(db, `membershipRequests/${req.id}`), { status: "approved", approvedAt: Date.now() });
                          await update(ref(db, `users/${req.uid}`), { membership: req.plan, membershipExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000 });
                          await push(ref(db, `notifications/${req.uid}`), { type: "coin", message: `🎉 ${req.plan} membership activate হয়েছে!`, timestamp: Date.now(), read: false });
                          toast({ title: `${req.plan} membership approved!` });
                        }} className="flex-1 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-green-500/30 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" />Approve
                      </button>
                      <button onClick={async () => {
                          await update(ref(db, `membershipRequests/${req.id}`), { status: "rejected" });
                          await push(ref(db, `notifications/${req.uid}`), { type: "system", message: `Membership request rejected.`, timestamp: Date.now(), read: false });
                          toast({ title: "Rejected." });
                        }} className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-red-500/30 transition-colors">
                        <XCircle className="w-3.5 h-3.5" />Reject
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </TabsContent>

          {/* ─── PRIZES TAB ─── */}
          <TabsContent value="prizes" className="mt-4 space-y-5">
            <p className="text-xs text-muted-foreground">Exam শেষে prize distribute করুন</p>
            {Object.keys(examResults).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm"><Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />এখনো কোনো exam result নেই।</div>
            ) : Object.entries(examResults).map(([examId, results]) => {
              const exam = allExams.find(e => e.id === examId);
              const totalPool = (exam?.participants || results.length) * (exam?.entryFee || 0);
              const prizes = calcPrizes(totalPool);
              return (
                <div key={examId} className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/10 bg-yellow-500/5">
                    <div className="flex justify-between">
                      <div><h3 className="font-bold text-sm">{exam?.title || examId}</h3><p className="text-xs text-muted-foreground">{results.length} participants</p></div>
                      <div className="text-right"><p className="text-xs text-muted-foreground">Total Pool</p><p className="font-extrabold text-yellow-400">৳{totalPool.toLocaleString()}</p></div>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {results.slice(0, 10).map((r: any, i: number) => {
                      const prize = getRankPrize(i + 1, totalPool);
                      return (
                        <div key={r.uid} className={`flex items-center gap-3 px-4 py-3 ${r.prizePaid ? "opacity-50" : ""}`}>
                          <span className="text-lg w-7">{["🥇","🥈","🥉"][i] || "🏅"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.name}</p>
                            <p className="text-[11px] text-muted-foreground">{r.score} pts · {r.bkashNumber || "no bKash"}</p>
                          </div>
                          {prize > 0 && (r.prizePaid ? (
                            <Badge className="bg-green-500/20 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Paid ৳{prize}</Badge>
                          ) : (
                            <button onClick={() => markPrizePaid(examId, r, i + 1, prize)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-xs font-semibold border border-yellow-500/20 transition-colors">
                              <Send className="w-3 h-3" />৳{prize}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* ─── EXAMS TAB ─── */}
          <TabsContent value="exams" className="mt-4 space-y-4">
            <div className={CARD + " space-y-4"}>
              <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-400" /><h3 className="font-bold text-sm">নতুন Premium Exam</h3></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Input value={newExam.title} onChange={e => setNewExam(p => ({ ...p, title: e.target.value }))} placeholder="Exam title *" className={FIELD} /></div>
                <div className="col-span-2"><Textarea value={newExam.description} onChange={e => setNewExam(p => ({ ...p, description: e.target.value }))} placeholder="Description..." className="bg-white/5 border-white/10 resize-none h-14 text-sm" /></div>
                {[["entryFee","Entry Fee (৳)","20"],["prizePool","Prize Pool (৳)","500"],["duration","Duration (min)","30"],["maxParticipants","Max Participants","100"]].map(([k,l,ph]) => (
                  <div key={k}><Label className="text-xs text-muted-foreground mb-1 block">{l}</Label><Input type="number" value={(newExam as any)[k]} onChange={e => setNewExam(p => ({ ...p, [k]: e.target.value }))} placeholder={ph} className={FIELD} /></div>
                ))}
                <div><Label className="text-xs text-muted-foreground mb-1 block">🟢 Start Time</Label><Input type="datetime-local" value={newExam.startTimeStr} onChange={e => setNewExam(p => ({ ...p, startTimeStr: e.target.value }))} className={FIELD + " text-xs"} /></div>
                <div><Label className="text-xs text-muted-foreground mb-1 block">🔴 End Time</Label><Input type="datetime-local" value={newExam.endTimeStr} onChange={e => setNewExam(p => ({ ...p, endTimeStr: e.target.value }))} className={FIELD + " text-xs"} /></div>
              </div>
              <GlowButton className="w-full h-9 text-sm" onClick={createExam}><Plus className="w-3.5 h-3.5 mr-1" />Exam Create করুন</GlowButton>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Existing Exams ({allExams.length})</p>
              {allExams.map(e => (
                <div key={e.id} className={CARD + " flex items-center gap-3"}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{e.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      <Badge className={`text-[9px] px-1.5 py-0 ${e.status === "active" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{e.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">৳{e.entryFee} entry · {e.participants || 0} joined</span>
                    </div>
                  </div>
                  <button onClick={() => deleteExam(e.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ─── USERS TAB ─── */}
          <TabsContent value="users" className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Users: {users.length} total · {onlineUsers} online now</p>
            {loading ? [0,1,2].map(i => <SkeletonCard key={i} />) :
             users.map(u => (
              <div key={u.uid} className={CARD}>
                {editingUser?.uid === u.uid ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-8 h-8"><AvatarImage src={u.photoURL} /><AvatarFallback>{u.name?.charAt(0) || "S"}</AvatarFallback></Avatar>
                      <p className="font-medium text-sm">{u.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Coins</Label>
                        <Input type="number" value={userEdit.coins} onChange={e => setUserEdit(p => ({ ...p, coins: e.target.value }))} className={FIELD} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Role</Label>
                        <select value={userEdit.role} onChange={e => setUserEdit(p => ({ ...p, role: e.target.value }))}
                          className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                          {["student","moderator","admin","super_admin","owner"].map(r => <option key={r} value={r} className="bg-gray-900">{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GlowButton size="sm" className="flex-1 h-9 text-xs" onClick={saveUserEdit}><Save className="w-3 h-3 mr-1" />Save</GlowButton>
                      <button onClick={() => setEditingUser(null)} className="h-9 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-9 h-9"><AvatarImage src={u.photoURL} /><AvatarFallback>{u.name?.charAt(0) || "S"}</AvatarFallback></Avatar>
                      {u.lastActive && u.lastActive > fiveMinAgo && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.name || "Unknown"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground truncate">{u.email}</span>
                        <Badge className={`text-[9px] px-1.5 py-0 capitalize ${u.role === "admin" || u.role === "super_admin" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>{u.role || "student"}</Badge>
                        {u.banned && <Badge className="text-[9px] px-1.5 py-0 bg-red-500/30 text-red-300">Banned</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right mr-1">
                        <p className="text-xs font-bold text-yellow-400">{(u.coins || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">coins</p>
                      </div>
                      {u.uid !== currentUser?.uid && (
                        <>
                          <button onClick={() => openUserEdit(u)} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => toggleBan(u)} className={`p-1.5 rounded-lg transition-colors ${u.banned ? "bg-green-500/10 hover:bg-green-500/20 text-green-400" : "bg-red-500/10 hover:bg-red-500/20 text-red-400"}`}>
                            {u.banned ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* ─── GIFTS TAB ─── */}
          <TabsContent value="gifts" className="mt-4">
            <div className={CARD + " space-y-4"}>
              <div className="flex items-center gap-2"><Gift className="w-5 h-5 text-purple-400" /><h3 className="font-bold">User-কে Gift পাঠান</h3></div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">User বেছে নিন *</Label>
                <select value={gift.uid} onChange={e => setGift(p => ({ ...p, uid: e.target.value }))}
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                  <option value="" className="bg-gray-900">-- User select করুন --</option>
                  {users.filter(u => u.uid !== currentUser?.uid).map(u => (
                    <option key={u.uid} value={u.uid} className="bg-gray-900">{u.name || "Unknown"} ({u.email})</option>
                  ))}
                </select>
              </div>
              <Input type="number" value={gift.coins} onChange={e => setGift(p => ({ ...p, coins: e.target.value }))} placeholder="Coins amount *" className={FIELD} />
              <Input value={gift.message} onChange={e => setGift(p => ({ ...p, message: e.target.value }))} placeholder="Message (optional)" className={FIELD} />
              <GlowButton className="w-full h-10" onClick={sendGift} disabled={sendingGift}>
                <Gift className="w-4 h-4 mr-2" />{sendingGift ? "পাঠানো হচ্ছে..." : "Gift পাঠান"}
              </GlowButton>
            </div>
          </TabsContent>

          {/* ─── NOTIFY TAB ─── */}
          <TabsContent value="notify" className="mt-4">
            <div className={CARD + " space-y-4"}>
              <div className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /><h3 className="font-bold">সবাইকে Notification পাঠান</h3></div>
              <Textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Notification message..." className="bg-white/5 border-white/10 resize-none h-24" />
              <GlowButton className="w-full h-10" onClick={sendNotification} disabled={!notifMsg.trim() || sending}>
                <Send className="w-4 h-4 mr-2" />{sending ? "Sending..." : `${users.length} জনকে পাঠান`}
              </GlowButton>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
