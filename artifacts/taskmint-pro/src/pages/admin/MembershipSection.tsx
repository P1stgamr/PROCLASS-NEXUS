import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { logAdminAction } from "@/lib/adminLog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GlowButton } from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Save, X, Crown, ToggleLeft, ToggleRight, UserRound, Ban, CalendarPlus } from "lucide-react";

const FIELD = "h-9 bg-white/5 border-white/10 text-sm";
const CARD = "glass-card p-4 rounded-2xl border border-white/10";

const PLAN_TYPES = ["monthly", "yearly", "lifetime", "custom"] as const;
const BADGES = ["🥈 Silver", "🥇 Gold", "💎 Platinum", "🔥 Pro", "⭐ Elite", "🚀 Premium"] as const;

const defaultPlan = {
  name: "", badge: "🥇 Gold", type: "monthly" as string,
  price: "", durationDays: "30", features: "",
  priority: "1", visible: true, active: true,
};

export default function MembershipSection({ users = [] }: { users?: any[] }) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(defaultPlan);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [membershipDays, setMembershipDays] = useState("30");
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "membershipPlans"), snap => {
      const d = snap.val();
      setPlans(d ? Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a, b) => (a.priority || 0) - (b.priority || 0)) : []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  const resetForm = () => { setForm(defaultPlan); setEditingId(null); };

  const savePlan = async () => {
    if (!form.name.trim() || !form.price) {
      toast({ title: "নাম ও মূল্য আবশ্যক", variant: "destructive" }); return;
    }
    const payload = {
      name: form.name.trim(),
      badge: form.badge,
      type: form.type,
      price: parseFloat(form.price) || 0,
      durationDays: parseInt(form.durationDays) || 30,
      features: form.features.split("\n").map(f => f.trim()).filter(Boolean),
      priority: parseInt(form.priority) || 1,
      visible: form.visible,
      active: form.active,
      updatedAt: Date.now(),
    };
    if (editingId) {
      await update(ref(db, `membershipPlans/${editingId}`), payload);
      await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "membership.edit", editingId, { name: form.name });
      toast({ title: "Plan updated ✅" });
    } else {
      await push(ref(db, "membershipPlans"), { ...payload, createdAt: Date.now() });
      await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "membership.create", undefined, { name: form.name });
      toast({ title: "Plan created ✅" });
    }
    resetForm();
  };

  const startEdit = (plan: any) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name, badge: plan.badge || "🥇 Gold", type: plan.type || "monthly",
      price: String(plan.price || ""), durationDays: String(plan.durationDays || 30),
      features: (plan.features || []).join("\n"), priority: String(plan.priority || 1),
      visible: plan.visible !== false, active: plan.active !== false,
    });
  };

  const deletePlan = async (id: string, name: string) => {
    await remove(ref(db, `membershipPlans/${id}`));
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "membership.delete", id, { name });
    toast({ title: "Plan deleted." });
  };

  const toggleActive = async (plan: any) => {
    await update(ref(db, `membershipPlans/${plan.id}`), { active: !plan.active, updatedAt: Date.now() });
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "membership.toggle", plan.id, { active: !plan.active });
    toast({ title: plan.active ? "Plan disabled." : "Plan enabled ✅" });
  };

  const manageUserMembership = async (action: "grant" | "extend" | "revoke") => {
    const user = users.find(u => (u.uid || u.id) === selectedUserId);
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!user) { toast({ title: "Select a user first", variant: "destructive" }); return; }
    if (action !== "revoke" && !plan) { toast({ title: "Select a plan first", variant: "destructive" }); return; }
    const days = Math.max(1, parseInt(membershipDays) || 30);
    const expiry = action === "extend"
      ? Math.max(Date.now(), Number(user.membershipExpiry || 0)) + days * 86400000
      : Date.now() + Number(plan?.durationDays || days) * 86400000;
    const payload = action === "revoke"
      ? { membership: "free", membershipExpiry: null, membershipStatus: "revoked", membershipPlanId: null, membershipUpdatedAt: Date.now() }
      : { membership: plan.name, membershipExpiry: expiry, membershipStatus: "active", membershipPlanId: plan.id, membershipUpdatedAt: Date.now() };
    await update(ref(db, `users/${selectedUserId}`), payload);
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", `membership.${action}`, selectedUserId, { plan: plan?.name, days });
    toast({ title: action === "revoke" ? "Membership revoked" : action === "extend" ? "Membership extended ✅" : "Membership granted ✅" });
  };

  const typeColor: Record<string, string> = {
    monthly: "bg-blue-500/20 text-blue-400",
    yearly: "bg-purple-500/20 text-purple-400",
    lifetime: "bg-yellow-500/20 text-yellow-400",
    custom: "bg-cyan-500/20 text-cyan-400",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold mb-1">Membership Plans</h2>
        <p className="text-xs text-muted-foreground">All plans stored in Firebase — no hardcoded data</p>
      </div>

      <div className={CARD + " space-y-3"}>
        <div className="flex items-center gap-2">
          <UserRound className="w-4 h-4 text-primary" />
          <div><h3 className="font-bold text-sm">Manage user memberships</h3><p className="text-[10px] text-muted-foreground">Grant, extend, downgrade, or revoke access directly.</p></div>
        </div>
        <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search name, email, or user number" className={FIELD} />
        <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
          <option value="" className="bg-gray-900">Select a user</option>
          {users.filter(u => `${u.name || ""} ${u.email || ""} ${u.userNo || ""}`.toLowerCase().includes(userSearch.toLowerCase())).slice(0, 100).map(u => (
            <option key={u.uid || u.id} value={u.uid || u.id} className="bg-gray-900">{u.name || "Unnamed"} · {u.email || u.userNo || u.uid}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} className="h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
            <option value="" className="bg-gray-900">Select plan</option>
            {plans.filter(p => p.active !== false).map(p => <option key={p.id} value={p.id} className="bg-gray-900">{p.name} · {p.durationDays}d</option>)}
          </select>
          <Input type="number" min="1" value={membershipDays} onChange={e => setMembershipDays(e.target.value)} placeholder="Days to extend" className={FIELD} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <GlowButton className="h-9 text-xs" onClick={() => manageUserMembership("grant")}><Crown className="w-3 h-3 mr-1" />Grant</GlowButton>
          <GlowButton className="h-9 text-xs" onClick={() => manageUserMembership("extend")}><CalendarPlus className="w-3 h-3 mr-1" />Extend</GlowButton>
          <button onClick={() => manageUserMembership("revoke")} className="h-9 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold flex items-center justify-center"><Ban className="w-3 h-3 mr-1" />Revoke</button>
        </div>
      </div>

      {/* Create / Edit Form */}
      <div className={CARD + " space-y-4"}>
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-400" />
          <h3 className="font-bold text-sm">{editingId ? "Edit Plan" : "Create New Plan"}</h3>
          {editingId && <button onClick={resetForm} className="ml-auto p-1 rounded-lg hover:bg-white/10"><X className="w-3.5 h-3.5" /></button>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Plan Name *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Gold Monthly" className={FIELD} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Badge</Label>
            <select value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}
              className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
              {BADGES.map(b => <option key={b} value={b} className="bg-gray-900">{b}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Plan Type</Label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
              {PLAN_TYPES.map(t => <option key={t} value={t} className="bg-gray-900 capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Price (৳) *</Label>
            <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="199" className={FIELD} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Duration (days)</Label>
            <Input type="number" value={form.durationDays} onChange={e => setForm(p => ({ ...p, durationDays: e.target.value }))} className={FIELD} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Display Priority</Label>
            <Input type="number" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className={FIELD} />
          </div>
          <div className="flex flex-col gap-2 justify-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.visible} onChange={e => setForm(p => ({ ...p, visible: e.target.checked }))} className="w-3.5 h-3.5 rounded" />
              <span className="text-xs">Visible to users</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="w-3.5 h-3.5 rounded" />
              <span className="text-xs">Active (purchasable)</span>
            </label>
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Features (one per line)</Label>
            <Textarea value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))}
              placeholder={"Unlimited AI access\nPremium exams\nPriority support"}
              className="bg-white/5 border-white/10 resize-none h-24 text-sm" />
          </div>
        </div>

        <GlowButton className="w-full h-9 text-sm" onClick={savePlan}>
          {editingId ? <><Save className="w-3.5 h-3.5 mr-1.5" />Update Plan</> : <><Plus className="w-3.5 h-3.5 mr-1.5" />Create Plan</>}
        </GlowButton>
      </div>

      {/* Plans list */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
          {loading ? "Loading…" : `${plans.length} plan${plans.length !== 1 ? "s" : ""} in Firebase`}
        </p>
        {plans.length === 0 && !loading && (
          <p className="text-center py-8 text-sm text-muted-foreground">No membership plans yet. Create one above.</p>
        )}
        {plans.map(plan => (
          <motion.div key={plan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
            <div className="flex items-start gap-3">
              <div className="text-2xl">{plan.badge?.split(" ")[0] || "👑"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm">{plan.name}</p>
                  <Badge className={`text-[9px] px-1.5 py-0 ${typeColor[plan.type] || "bg-gray-500/20 text-gray-400"}`}>{plan.type}</Badge>
                  {!plan.active && <Badge className="text-[9px] px-1.5 py-0 bg-red-500/20 text-red-400">Inactive</Badge>}
                  {!plan.visible && <Badge className="text-[9px] px-1.5 py-0 bg-gray-500/20 text-gray-400">Hidden</Badge>}
                </div>
                <p className="text-lg font-extrabold text-primary mt-0.5">৳{plan.price}
                  <span className="text-xs text-muted-foreground font-normal ml-1">/ {plan.durationDays}d</span>
                </p>
                {plan.features?.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {plan.features.slice(0, 3).map((f: string, i: number) => (
                      <li key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="text-green-400">✓</span> {f}
                      </li>
                    ))}
                    {plan.features.length > 3 && <li className="text-[10px] text-muted-foreground">+{plan.features.length - 3} more…</li>}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => startEdit(plan)} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleActive(plan)} className={`p-1.5 rounded-lg transition-colors ${plan.active ? "bg-green-500/10 hover:bg-green-500/20 text-green-400" : "bg-gray-500/10 hover:bg-gray-500/20 text-gray-400"}`}>
                  {plan.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => deletePlan(plan.id, plan.name)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
