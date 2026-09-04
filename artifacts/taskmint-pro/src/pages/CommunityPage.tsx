import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { get, onValue, off, orderByChild, push, query, equalTo, ref, update } from "firebase/database";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, storage } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { COMMUNITY_COMMISSION_RATE, COMMUNITY_MIN_WITHDRAWAL, Community } from "@/lib/community";
import { ArrowLeft, Building2, CheckCircle2, Clock3, Coins, Search, Upload, Users, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type StudentMatch = {
  uid: string;
  name?: string;
  email?: string;
  username?: string;
  userNo?: string;
  communityId?: string;
  xp?: number;
  coins?: number;
};

const CARD = "glass-card rounded-2xl border border-white/10";

export default function CommunityPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [community, setCommunity] = useState<Community | null>(null);
  const [request, setRequest] = useState<any>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communityStats, setCommunityStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", logo: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<StudentMatch[]>([]);
  const [students, setStudents] = useState<StudentMatch[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [withdraws, setWithdraws] = useState<any[]>([]);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bkashNumber: "" });

  useEffect(() => {
    if (!currentUser) return;
    const communitiesRef = ref(db, "communities");
    const communitiesUnsub = onValue(communitiesRef, (snap) => {
      const all = snap.val()
        ? Object.entries(snap.val()).map(([id, value]: [string, any]) => ({ id, ...value }))
        : [];
      setCommunities(all);
      const owned = all.find((item) => item.ownerUid === currentUser.uid && item.status === "active") || null;
      setCommunity(owned);
      setLoading(false);
    }, () => setLoading(false));

    const requestsRef = query(ref(db, "communityRequests"), orderByChild("uid"), equalTo(currentUser.uid));
    const requestUnsub = onValue(requestsRef, (snap) => {
      const values = snap.val()
        ? Object.entries(snap.val()).map(([id, value]: [string, any]) => ({ id, ...value }))
        : [];
      values.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRequest(values[0] || null);
    });
    const statsRef = ref(db, "communityStats");
    const statsUnsub = onValue(statsRef, (snap) => setCommunityStats(snap.val() || {}));
    return () => {
      off(communitiesRef);
      off(requestsRef);
      communitiesUnsub();
      requestUnsub();
      off(statsRef);
      statsUnsub();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!community) {
      setStudents([]);
      setLogs([]);
      setWithdraws([]);
      setBalance(0);
      return;
    }
    const studentsRef = ref(db, `communityStudents/${community.id}`);
    const logsRef = ref(db, `communityCommissionLogs/${community.id}`);
    const balanceRef = ref(db, `communityBalances/${community.id}/balance`);
    const withdrawRef = ref(db, `communityWithdrawals/${community.id}`);
    const studentsUnsub = onValue(studentsRef, (snap) => {
      const values = snap.val()
        ? Object.entries(snap.val()).map(([uid, value]: [string, any]) => ({ uid, ...value }))
        : [];
      values.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      setStudents(values);
    });
    const logsUnsub = onValue(logsRef, (snap) => {
      const values = snap.val()
        ? Object.entries(snap.val()).map(([id, value]: [string, any]) => ({ id, ...value }))
        : [];
      values.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setLogs(values);
    });
    const balanceUnsub = onValue(balanceRef, (snap) => setBalance(Number(snap.val() || 0)));
    const withdrawUnsub = onValue(withdrawRef, (snap) => {
      const values = snap.val()
        ? Object.entries(snap.val()).map(([id, value]: [string, any]) => ({ id, ...value }))
        : [];
      values.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setWithdraws(values);
    });
    return () => {
      off(studentsRef);
      off(logsRef);
      off(balanceRef);
      off(withdrawRef);
      studentsUnsub();
      logsUnsub();
      balanceUnsub();
      withdrawUnsub();
    };
  }, [community?.id]);

  const searchStudents = async () => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setMatches([]);
      return;
    }
    const found = new Map<string, StudentMatch>();
    for (const field of ["email", "username", "userNo"]) {
      const snapshot = await get(query(ref(db, "users"), orderByChild(field), equalTo(term)));
      if (snapshot.exists()) {
        Object.entries(snapshot.val()).forEach(([uid, value]: [string, any]) => {
          found.set(uid, { uid, ...value });
        });
      }
    }
    setMatches([...found.values()].filter((student) => student.uid !== currentUser?.uid));
  };

  const addStudent = async (student: StudentMatch) => {
    if (!community || !currentUser) return;
    if (student.communityId && student.communityId !== community.id) {
      toast({ title: "Student already belongs to another community", variant: "destructive" });
      return;
    }
    try {
      const updates: Record<string, unknown> = {
        [`communityStudents/${community.id}/${student.uid}`]: {
          uid: student.uid,
          name: student.name || "Student",
          email: student.email || "",
          userNo: student.userNo || "",
          xp: Number(student.xp || 0),
          coins: Number(student.coins || 0),
          addedAt: Date.now(),
        },
        [`communityStats/${community.id}`]: {
          studentCount: students.length + 1,
          totalXp: students.reduce((sum, item) => sum + Number(item.xp || 0), 0) + Number(student.xp || 0),
          totalCoins: students.reduce((sum, item) => sum + Number(item.coins || 0), 0) + Number(student.coins || 0),
          updatedAt: Date.now(),
        },
        [`users/${student.uid}/communityId`]: community.id,
        [`users/${student.uid}/communityName`]: community.name,
        [`users/${student.uid}/communityLogo`]: community.logo || null,
      };
      await update(ref(db), updates);
      toast({ title: "Student added ✅" });
      setMatches((current) => current.filter((item) => item.uid !== student.uid));
      setSearch("");
    } catch (error: any) {
      toast({ title: "Could not add student", description: error.message, variant: "destructive" });
    }
  };

  const applyForCommunity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.name.trim()) return;
    setSaving(true);
    try {
      let logo = form.logo.trim();
      if (logoFile) {
        const uploaded = await uploadBytes(
          storageRef(storage, `community-logos/${currentUser.uid}/${Date.now()}-${logoFile.name}`),
          logoFile,
        );
        logo = await getDownloadURL(uploaded.ref);
      }
      await push(ref(db, "communityRequests"), {
        uid: currentUser.uid,
        userName: userProfile?.name || "User",
        userEmail: userProfile?.email || currentUser.email || "",
        name: form.name.trim(),
        description: form.description.trim(),
        logo: logo || null,
        status: "pending",
        createdAt: Date.now(),
      });
      toast({ title: "Community application submitted ✅" });
      setForm({ name: "", description: "", logo: "" });
      setLogoFile(null);
    } catch (error: any) {
      toast({ title: "Application failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const requestWithdraw = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!community) return;
    const amount = Number(withdrawForm.amount);
    const pending = withdraws
      .filter((item) => item.status === "pending")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    if (!withdrawForm.bkashNumber.trim() || !Number.isInteger(amount) || amount < COMMUNITY_MIN_WITHDRAWAL) {
      toast({ title: `Minimum withdrawal is ${COMMUNITY_MIN_WITHDRAWAL} coins`, variant: "destructive" });
      return;
    }
    if (pending + amount > balance) {
      toast({ title: "Insufficient community balance", variant: "destructive" });
      return;
    }
    try {
      await push(ref(db, `communityWithdrawals/${community.id}`), {
        communityId: community.id,
        ownerUid: currentUser?.uid,
        communityName: community.name,
        amount,
        bkashNumber: withdrawForm.bkashNumber.trim(),
        status: "pending",
        createdAt: Date.now(),
      });
      toast({ title: "Community withdrawal request sent ✅" });
      setWithdrawForm({ amount: "", bkashNumber: "" });
    } catch (error: any) {
      toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" });
    }
  };

  const leaderboard = useMemo(() => communities
    .filter((item) => item.status === "active")
    .map((item) => ({ ...item, ...(communityStats[item.id] || { studentCount: 0, totalXp: 0, totalCoins: 0 }) }))
    .sort((a, b) => b.totalXp - a.totalXp || b.studentCount - a.studentCount)
    .slice(0, 5), [communities, communityStats]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading community…</div>;

  if (!community) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header onBack={() => setLocation("/home")} />
        <main className="max-w-md mx-auto px-5 py-5 space-y-5">
          <div className={`${CARD} p-5`}>
            <Building2 className="w-8 h-8 text-primary mb-3" />
            <h2 className="text-xl font-extrabold">Community / Academy Partner</h2>
            <p className="text-sm text-muted-foreground mt-2">আপনার academy বা coaching center নিয়ে TaskMint Pro-তে partner community তৈরি করুন।</p>
          </div>
          {request ? (
            <div className={`${CARD} p-5`}>
              <div className="flex items-center gap-3">
                {request.status === "approved" ? <CheckCircle2 className="w-6 h-6 text-green-400" /> : <Clock3 className="w-6 h-6 text-yellow-400" />}
                <div>
                  <p className="font-bold">{request.name}</p>
                  <Badge className={request.status === "pending" ? "bg-yellow-500/15 text-yellow-300" : request.status === "approved" ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}>{request.status}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Admin review শেষ হলে এখানে আপনার owner dashboard চালু হবে।</p>
            </div>
          ) : (
            <form onSubmit={applyForCommunity} className={`${CARD} p-5 space-y-4`}>
              <div>
                <Label className="text-xs text-muted-foreground">Community name *</Label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="যেমন: Dhaka Science Academy" className="mt-1 bg-white/5 border-white/10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="আপনার academy সম্পর্কে লিখুন…" className="mt-1 bg-white/5 border-white/10 resize-none" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Logo URL (optional)</Label>
                <Input value={form.logo} onChange={(event) => setForm({ ...form, logo: event.target.value })} placeholder="https://…" className="mt-1 bg-white/5 border-white/10" />
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 p-3 text-xs text-muted-foreground cursor-pointer hover:bg-white/5">
                <Upload className="w-4 h-4" /> অথবা logo upload করুন
                <input type="file" accept="image/*" className="hidden" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
                {logoFile && <span className="text-primary truncate">{logoFile.name}</span>}
              </label>
              <GlowButton type="submit" className="w-full" disabled={saving}>{saving ? "Submitting…" : "Create Community আবেদন করুন"}</GlowButton>
            </form>
          )}
          <div className={`${CARD} p-5`}>
            <p className="text-sm font-bold mb-2">Community Leaderboard</p>
            <div className="space-y-2">
              {leaderboard.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                  <span className="w-6 text-center font-bold text-primary">#{index + 1}</span>
                  {item.logo ? <img src={item.logo} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><Building2 className="w-4 h-4 text-primary" /></div>}
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{item.name}</p><p className="text-[10px] text-muted-foreground">{item.studentCount} students · {item.totalXp.toLocaleString()} XP</p></div>
                </div>
              ))}
              {leaderboard.length === 0 && <p className="text-xs text-muted-foreground">এখনো কোনো active community নেই।</p>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header onBack={() => setLocation("/home")} />
      <main className="max-w-2xl mx-auto px-5 py-5 space-y-5">
        <div className={`${CARD} p-5 flex items-center gap-4`}>
          {community.logo ? <img src={community.logo} alt={community.name} className="w-16 h-16 rounded-2xl object-cover" /> : <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center"><Building2 className="w-8 h-8 text-primary" /></div>}
          <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h2 className="text-xl font-extrabold truncate">{community.name}</h2>{community.specialBenefits?.verified && <Badge className="bg-blue-500/15 text-blue-300">Verified</Badge>}</div><p className="text-xs text-muted-foreground mt-1">{community.description || "Community owner dashboard"}</p><p className="text-[10px] text-primary mt-2">Commission: {community.commissionRate || COMMUNITY_COMMISSION_RATE}%</p></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat icon={Users} label="Students" value={students.length} />
          <Stat icon={Coins} label="Balance" value={balance} />
          <Stat icon={Wallet} label="Credits" value={logs.length} />
        </div>

        <section className={`${CARD} p-5 space-y-3`}>
          <div className="flex items-center justify-between"><div><h3 className="font-bold">Add existing students</h3><p className="text-xs text-muted-foreground">Email, username বা ID No. দিয়ে খুঁজুন</p></div><Search className="w-4 h-4 text-primary" /></div>
          <div className="flex gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchStudents()} placeholder="student@example.com বা TM-…" className="bg-white/5 border-white/10" /><GlowButton type="button" size="sm" onClick={searchStudents}>Search</GlowButton></div>
          {matches.map((student) => <div key={student.uid} className="flex items-center gap-3 bg-white/5 rounded-xl p-3"><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{student.name || "Student"}</p><p className="text-[10px] text-muted-foreground">{student.userNo || student.email || student.username}</p></div><GlowButton type="button" size="sm" className="h-8" onClick={() => addStudent(student)}>Add</GlowButton></div>)}
        </section>

        <section className={`${CARD} p-5 space-y-3`}>
          <h3 className="font-bold">My community students ({students.length})</h3>
          {students.length === 0 ? <p className="text-xs text-muted-foreground">এখনো কোনো student যোগ করা হয়নি।</p> : students.map((student) => <div key={student.uid} className="flex items-center gap-3 bg-white/5 rounded-xl p-3"><div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-bold">{student.name?.[0] || "S"}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{student.name}</p><p className="text-[10px] text-muted-foreground">{student.userNo || student.email}</p></div><span className="text-[10px] text-primary">{Number(student.xp || 0).toLocaleString()} XP</span></div>)}
        </section>

        <section className={`${CARD} p-5 space-y-3`}>
          <div><h3 className="font-bold">Community earnings</h3><p className="text-xs text-muted-foreground">এই অংশ শুধু community owner দেখতে পান</p></div>
          {logs.slice(0, 8).map((log) => <div key={log.id} className="flex items-center justify-between border-b border-white/5 pb-2"><div><p className="text-xs font-semibold">{log.studentName || "Student"} · {log.type}</p><p className="text-[10px] text-muted-foreground">{log.createdAt ? formatDistanceToNow(log.createdAt, { addSuffix: true }) : ""}</p></div><span className="text-xs font-bold text-green-400">+{log.commission}</span></div>)}
          {logs.length === 0 && <p className="text-xs text-muted-foreground">এখনো কোনো commission credit নেই।</p>}
        </section>

        <section className={`${CARD} p-5 space-y-3`}>
          <h3 className="font-bold">Request withdrawal</h3>
          <form onSubmit={requestWithdraw} className="grid sm:grid-cols-2 gap-3">
            <Input value={withdrawForm.amount} onChange={(event) => setWithdrawForm({ ...withdrawForm, amount: event.target.value })} type="number" min={COMMUNITY_MIN_WITHDRAWAL} placeholder={`Amount (min ${COMMUNITY_MIN_WITHDRAWAL})`} className="bg-white/5 border-white/10" />
            <Input value={withdrawForm.bkashNumber} onChange={(event) => setWithdrawForm({ ...withdrawForm, bkashNumber: event.target.value })} placeholder="bKash number" className="bg-white/5 border-white/10" />
            <GlowButton type="submit" className="sm:col-span-2">bKash withdrawal request</GlowButton>
          </form>
          {withdraws.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between text-xs"><span>৳{item.amount} · {item.bkashNumber}</span><Badge className="text-[9px]">{item.status}</Badge></div>)}
        </section>
      </main>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/5 px-5 py-4"><div className="max-w-2xl mx-auto flex items-center gap-3"><button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button><Building2 className="w-5 h-5 text-primary" /><h1 className="text-xl font-extrabold">Community</h1></div></div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className={`${CARD} p-3 text-center`}><Icon className="w-4 h-4 text-primary mx-auto mb-1" /><p className="text-lg font-extrabold">{value.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>;
}