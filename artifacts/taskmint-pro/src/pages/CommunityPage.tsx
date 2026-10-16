import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, BookOpen, Building2, CheckCircle2, Clock3, Coins, Search, Upload, Users, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getGetCommunityRevenueQueryKey, useCreateCommunityCourse, useGetCommunityRevenue, useRequestCommunityWithdrawal, useUpdateCommunityCourse } from "@workspace/api-client-react";
import type { CommunityCourseInput, CommunityCourseLessonInput, CommunityCourseModuleInput, CommunityWithdrawalInput } from "@workspace/api-client-react";

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
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bkashNumber: "", revenueSource: "commission" as "commission" | "course" });
  const { data: courseRevenue, isLoading: revenueLoading, isError: revenueError } = useGetCommunityRevenue({
    query: { enabled: Boolean(community), queryKey: getGetCommunityRevenueQueryKey() },
  });
  const withdrawalMutation = useRequestCommunityWithdrawal();
  const queryClient = useQueryClient();

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
    }, () => setLoading(false));
    const statsRef = ref(db, "communityStats");
    const statsUnsub = onValue(statsRef, (snap) => setCommunityStats(snap.val() || {}), () => undefined);
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
    if (!withdrawForm.bkashNumber.trim() || !Number.isInteger(amount) || amount < COMMUNITY_MIN_WITHDRAWAL) {
      toast({ title: `Minimum withdrawal is ৳${COMMUNITY_MIN_WITHDRAWAL}`, variant: "destructive" });
      return;
    }
    const available = withdrawForm.revenueSource === "commission" ? balance : Number(courseRevenue?.balance || 0);
    if (amount > available) {
      toast({ title: "Insufficient available balance", description: `Available: ৳${available}`, variant: "destructive" });
      return;
    }
    const input: CommunityWithdrawalInput = {
      revenueSource: withdrawForm.revenueSource,
      amount,
      bkashNumber: withdrawForm.bkashNumber.trim(),
    };
    try {
      await withdrawalMutation.mutateAsync({ data: input });
      queryClient.invalidateQueries({ queryKey: getGetCommunityRevenueQueryKey() });
      toast({ title: "Withdrawal request sent" });
      setWithdrawForm({ amount: "", bkashNumber: "", revenueSource: withdrawForm.revenueSource });
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

        <CommunityCourseManager community={community} />

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
          <div><h3 className="font-bold">Request withdrawal</h3><p className="text-xs text-muted-foreground">Choose which balance to withdraw from.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-3"><p className="text-[10px] text-muted-foreground">Commission balance</p><p className="font-bold">৳{balance.toLocaleString()}</p></div>
            <div className="rounded-xl bg-white/5 p-3"><p className="text-[10px] text-muted-foreground">Course sales · total earned</p><p className="font-bold">{revenueLoading ? "Loading…" : revenueError ? "Unavailable" : `৳${Number(courseRevenue?.totalEarned || 0).toLocaleString()}`}</p><p className="text-[10px] text-muted-foreground mt-1">Available: ৳{Number(courseRevenue?.balance || 0).toLocaleString()}</p></div>
          </div>
          {courseRevenue?.sales?.length ? <div className="space-y-2">
            <p className="text-xs font-semibold">Recent course sales</p>
            {courseRevenue.sales.slice(0, 5).map((sale) => <div key={sale.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-xs">
              <div className="min-w-0"><p className="truncate font-medium">{sale.courseTitle}</p><p className="text-[10px] text-muted-foreground">{sale.createdAt ? formatDistanceToNow(sale.createdAt, { addSuffix: true }) : ""}</p></div>
              <span className="shrink-0 font-bold text-green-400">+৳{Number(sale.amount).toLocaleString()}</span>
            </div>)}
          </div> : null}
          <form onSubmit={requestWithdraw} className="grid sm:grid-cols-2 gap-3">
            <select aria-label="Revenue source" value={withdrawForm.revenueSource} onChange={(event) => setWithdrawForm({ ...withdrawForm, revenueSource: event.target.value as "commission" | "course", amount: "" })} className="rounded-xl bg-background border border-white/10 px-3 text-sm">
              <option value="commission">Commission</option><option value="course">Course sales</option>
            </select>
            <Input value={withdrawForm.amount} onChange={(event) => setWithdrawForm({ ...withdrawForm, amount: event.target.value })} type="number" min={COMMUNITY_MIN_WITHDRAWAL} placeholder={`Amount (min ${COMMUNITY_MIN_WITHDRAWAL})`} className="bg-white/5 border-white/10" />
            <Input value={withdrawForm.bkashNumber} onChange={(event) => setWithdrawForm({ ...withdrawForm, bkashNumber: event.target.value })} placeholder="bKash number" className="bg-white/5 border-white/10" />
            <GlowButton type="submit" className="sm:col-span-2" disabled={withdrawalMutation.isPending}>{withdrawalMutation.isPending ? "Submitting…" : "Request bKash withdrawal"}</GlowButton>
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

type CourseDraft = CommunityCourseInput;

function blankCourse(): CourseDraft {
  return {
    title: "", description: "", instructor: "", type: "free", price: 0, tag: "", grade: "",
    duration: "", thumbnail: null,
    modules: [{ title: "Module 1", lessons: [{ title: "", type: "text", content: "" }] }],
  };
}

function CommunityCourseManager({ community }: { community: Community }) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const createCourse = useCreateCommunityCourse();
  const updateCourse = useUpdateCommunityCourse();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CourseDraft>(blankCourse());
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const saving = createCourse.isPending || updateCourse.isPending;

  useEffect(() => {
    const coursesRef = ref(db, "courses");
    const unsub = onValue(coursesRef, (snap) => {
      const data = snap.val() || {};
      const owned = Object.entries(data)
        .map(([id, value]: [string, any]) => ({ id, ...value }))
        .filter((course) => course.communityId === community.id || course.ownerUid === community.ownerUid || course.communityName === community.name);
      setCourses(owned);
      setLoading(false);
    }, () => setLoading(false));
    return () => { off(coursesRef); unsub(); };
  }, [community.id, community.ownerUid, community.name]);

  const editCourse = (course: any) => {
    setEditingId(course.id);
    setThumbnailFile(null);
    setDraft({
      title: course.title || "", description: course.description || course.desc || "",
      instructor: course.instructor || "", type: course.type === "premium" ? "premium" : "free",
      price: Number(course.price || 0), tag: course.tag || course.category || "",
      grade: course.grade || course.gradeLevel || "", duration: course.duration || "",
      thumbnail: course.thumbnail || null,
      modules: Array.isArray(course.modules) && course.modules.length ? course.modules : blankCourse().modules,
    });
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.modules.length || draft.modules.some((module) => !module.title.trim() || !module.lessons.length || module.lessons.some((lesson) => !lesson.title.trim()))) {
      toast({ title: "Add a title and at least one titled lesson per module", variant: "destructive" });
      return;
    }
    try {
      let thumbnail = draft.thumbnail?.trim() || null;
      if (thumbnailFile) {
        if (!currentUser) throw new Error("Sign in again to upload the thumbnail");
        if (!thumbnailFile.type.startsWith("image/") || thumbnailFile.size >= 5 * 1024 * 1024) {
          throw new Error("Choose an image smaller than 5 MB");
        }
        const safeName = thumbnailFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploaded = await uploadBytes(
          storageRef(storage, `course-thumbnails/${community.id}/${Date.now()}-${safeName}`),
          thumbnailFile,
        );
        thumbnail = await getDownloadURL(uploaded.ref);
      }
      const payload: CommunityCourseInput = {
        ...draft,
        title: draft.title.trim(), description: draft.description.trim(), instructor: draft.instructor.trim(),
        tag: draft.tag.trim(), grade: draft.grade.trim(), duration: draft.duration.trim(),
        price: draft.type === "free" ? 0 : Number(draft.price || 0),
        thumbnail,
        modules: draft.modules.map((module) => ({
          ...module, title: module.title.trim(),
          lessons: module.lessons.map((lesson) => cleanLesson(lesson)),
        })),
      };
      if (editingId) await updateCourse.mutateAsync({ courseId: editingId, data: payload });
      else await createCourse.mutateAsync({ data: payload });
      toast({ title: editingId ? "Course updated" : "Course submitted", description: "Your course is pending review or published based on approval." });
      setOpen(false); setEditingId(null); setDraft(blankCourse()); setThumbnailFile(null);
    } catch (error: any) {
      toast({ title: "Could not save course", description: error?.message || "Try again in a moment.", variant: "destructive" });
    }
  };

  const setModule = (moduleIndex: number, next: CommunityCourseModuleInput) =>
    setDraft((current) => ({ ...current, modules: current.modules.map((module, index) => index === moduleIndex ? next : module) }));
  const addModule = () => setDraft((current) => ({ ...current, modules: [...current.modules, { title: `Module ${current.modules.length + 1}`, lessons: [{ title: "", type: "text", content: "" }] }] }));
  const moveModule = (index: number, delta: number) => setDraft((current) => ({ ...current, modules: moveItem(current.modules, index, delta) }));

  return <section className={`${CARD} p-5 space-y-4`}>
    <div className="flex items-center justify-between gap-3">
      <div><h3 className="font-bold">আপনার courses</h3><p className="text-xs text-muted-foreground">Structured lessons publish করুন, students আপনার academy-র নাম দেখবে।</p></div>
      <GlowButton type="button" size="sm" onClick={() => {
        if (open) {
          setOpen(false);
        } else {
          setEditingId(null);
          setDraft(blankCourse());
          setThumbnailFile(null);
          setOpen(true);
        }
      }}>{open ? "Close" : "Create course"}</GlowButton>
    </div>
    {open && <form onSubmit={save} className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Course title *"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={160} required placeholder="যেমন: HSC Physics — Waves" /></Field>
        <Field label="Instructor"><Input value={draft.instructor} onChange={(e) => setDraft({ ...draft, instructor: e.target.value })} maxLength={160} placeholder="শিক্ষকের নাম" /></Field>
        <Field label="Category"><Input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} maxLength={80} placeholder="Physics, Math…" /></Field>
        <Field label="Class / grade"><Input value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value })} maxLength={40} placeholder="SSC, HSC, Class 9" /></Field>
        <Field label="Duration"><Input value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} placeholder="যেমন: 6 weeks" /></Field>
        <Field label="Thumbnail URL (optional)"><Input value={draft.thumbnail || ""} onChange={(e) => setDraft({ ...draft, thumbnail: e.target.value || null })} placeholder="https://…" /></Field>
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 text-xs text-muted-foreground cursor-pointer hover:bg-white/5">
          <Upload className="w-4 h-4" /> Upload thumbnail
          <input type="file" accept="image/*" className="hidden" onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)} />
          {thumbnailFile && <span className="text-primary truncate">{thumbnailFile.name}</span>}
        </label>
        <Field label="Price"><div className="flex gap-2"><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as "free" | "premium", price: e.target.value === "free" ? 0 : draft.price || 100 })} className="rounded-xl bg-background border border-white/10 px-3 text-sm"><option value="free">Free</option><option value="premium">Paid</option></select>{draft.type === "premium" && <Input type="number" min="1" value={draft.price || ""} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} placeholder="৳ Price" />}</div></Field>
        <Field label="Description"><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={5000} rows={2} placeholder="কোর্সে কী শিখবে?" /></Field>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h4 className="text-sm font-bold">Modules & lessons</h4><button type="button" onClick={addModule} className="text-xs text-primary">+ Add module</button></div>
        {draft.modules.map((module, mi) => <div key={mi} className="rounded-xl border border-white/10 p-3 space-y-3">
          <div className="flex gap-2"><Input aria-label={`Module ${mi + 1} title`} value={module.title} onChange={(e) => setModule(mi, { ...module, title: e.target.value })} placeholder="Module title" /><button type="button" aria-label="Move module up" disabled={mi === 0} onClick={() => moveModule(mi, -1)} className="px-2 text-muted-foreground disabled:opacity-30">↑</button><button type="button" aria-label="Move module down" disabled={mi === draft.modules.length - 1} onClick={() => moveModule(mi, 1)} className="px-2 text-muted-foreground disabled:opacity-30">↓</button><button type="button" aria-label="Remove module" onClick={() => setDraft({ ...draft, modules: draft.modules.filter((_, index) => index !== mi) })} className="px-2 text-muted-foreground">Remove</button></div>
          {module.lessons.map((lesson, li) => <LessonEditor key={li} lesson={lesson} index={li} count={module.lessons.length} onMove={(delta) => setModule(mi, { ...module, lessons: moveItem(module.lessons, li, delta) })} onChange={(next) => setModule(mi, { ...module, lessons: module.lessons.map((item, index) => index === li ? next : item) })} onRemove={() => setModule(mi, { ...module, lessons: module.lessons.filter((_, index) => index !== li) })} />)}
          <button type="button" onClick={() => setModule(mi, { ...module, lessons: [...module.lessons, { title: "", type: "text", content: "" }] })} className="text-xs text-primary">+ Add lesson</button>
        </div>)}
      </div>
      <div className="flex gap-2"><GlowButton type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Submit course"}</GlowButton><button type="button" onClick={() => { setOpen(false); setEditingId(null); setThumbnailFile(null); }} className="px-4 text-sm text-muted-foreground">Cancel</button></div>
    </form>}
    {loading ? <div className="skeleton h-16 rounded-xl" /> : courses.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-muted-foreground">এখনো course নেই। প্রথম course তৈরি করুন।</div> :
      <div className="space-y-2">{courses.map((course) => <div key={course.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3" data-testid={`community-course-${course.id}`}>
        {course.thumbnail ? <img src={course.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>}
        <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{course.title}</p><p className="text-[10px] text-muted-foreground">{course.tag || course.category || "Course"} · {course.type === "premium" ? `৳${course.price}` : "Free"}</p></div>
        <Badge className={course.status === "published" ? "bg-green-500/15 text-green-300" : "bg-amber-500/15 text-amber-300"}>{course.status === "published" ? "Published" : "Pending"}</Badge>
        <button type="button" onClick={() => editCourse(course)} className="text-xs text-primary px-2">Edit</button>
       </div>)}</div>
    }
  </section>;
}

function cleanLesson(lesson: CommunityCourseLessonInput): CommunityCourseLessonInput {
  return {
    ...lesson,
    content: lesson.content || undefined,
    videoUrl: lesson.type === "video" ? lesson.videoUrl || undefined : undefined,
    pdfUrl: lesson.type === "pdf" ? lesson.pdfUrl || undefined : undefined,
    quizQuestions: lesson.type === "quiz" ? lesson.quizQuestions : undefined,
    flashcards: lesson.type === "flashcard" ? lesson.flashcards : undefined,
  };
}

function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const reordered = [...items];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered;
}

function LessonEditor({ lesson, index, count, onChange, onRemove, onMove }: { lesson: CommunityCourseLessonInput; index: number; count: number; onChange: (lesson: CommunityCourseLessonInput) => void; onRemove: () => void; onMove: (delta: number) => void }) {
  const [quizJson, setQuizJson] = useState(JSON.stringify(lesson.quizQuestions || [], null, 2));
  const [flashcardsJson, setFlashcardsJson] = useState(JSON.stringify(lesson.flashcards || [], null, 2));
  const setJson = (text: string, kind: "quiz" | "flashcard") => {
    kind === "quiz" ? setQuizJson(text) : setFlashcardsJson(text);
    try {
      const parsed = JSON.parse(text);
      onChange({ ...lesson, ...(kind === "quiz" ? { quizQuestions: parsed } : { flashcards: parsed }) });
    } catch { /* keep the draft text editable until valid JSON is entered */ }
  };
  return <div className="rounded-lg bg-white/[0.035] p-3 space-y-2">
    <div className="flex gap-2">
      <Input value={lesson.title} onChange={(e) => onChange({ ...lesson, title: e.target.value })} placeholder={`Lesson ${index + 1} title`} />
      <select value={lesson.type} onChange={(e) => onChange({ ...lesson, type: e.target.value as CommunityCourseLessonInput["type"] })} className="rounded-xl bg-background border border-white/10 px-2 text-xs">
        {["video", "pdf", "quiz", "flashcard", "text"].map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
      <button type="button" aria-label="Move lesson up" disabled={index === 0} onClick={() => onMove(-1)} className="text-xs text-muted-foreground disabled:opacity-30">↑</button>
      <button type="button" aria-label="Move lesson down" disabled={index === count - 1} onClick={() => onMove(1)} className="text-xs text-muted-foreground disabled:opacity-30">↓</button>
      <button type="button" onClick={onRemove} className="text-xs text-muted-foreground px-1">×</button>
    </div>
    {(lesson.type === "video" || lesson.type === "pdf") && <Input value={lesson.type === "video" ? lesson.videoUrl || "" : lesson.pdfUrl || ""} onChange={(e) => onChange({ ...lesson, ...(lesson.type === "video" ? { videoUrl: e.target.value } : { pdfUrl: e.target.value }) })} placeholder={lesson.type === "video" ? "Video URL" : "PDF URL"} />}
    <Textarea value={lesson.content || ""} onChange={(e) => onChange({ ...lesson, content: e.target.value })} rows={2} placeholder="Lesson content or notes (optional)" />
    {lesson.type === "quiz" && <Textarea value={quizJson} onChange={(e) => setJson(e.target.value, "quiz")} rows={4} className="font-mono text-[10px]" placeholder='[{"question":"...","options":["A","B"],"correctAnswer":0}]' aria-label="Quiz questions JSON" />}
    {lesson.type === "flashcard" && <Textarea value={flashcardsJson} onChange={(e) => setJson(e.target.value, "flashcard")} rows={4} className="font-mono text-[10px]" placeholder='[{"front":"Term","back":"Meaning"}]' aria-label="Flashcards JSON" />}
    <Input type="number" min="0" max="10000" value={lesson.duration ?? ""} onChange={(e) => onChange({ ...lesson, duration: e.target.value ? Number(e.target.value) : undefined })} placeholder="Duration in minutes (optional)" />
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-[10px] text-muted-foreground">{label}</span>{children}</label>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className={`${CARD} p-3 text-center`}><Icon className="w-4 h-4 text-primary mx-auto mb-1" /><p className="text-lg font-extrabold">{value.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>;
}