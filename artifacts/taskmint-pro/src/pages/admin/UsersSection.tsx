import { useState } from "react";
import { motion } from "framer-motion";
import { ref, update } from "firebase/database";
import { sendPasswordResetEmail } from "firebase/auth";
import { db, auth } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { logAdminAction } from "@/lib/adminLog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowButton } from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { createUserNo } from "@/lib/userId";
import { normalizeRole, roleLabel } from "@/lib/roles";
import {
  Shield, Ban, CheckCircle2, Edit2, Save, X,
  Search, MailCheck, Lock, ChevronDown, UserCheck
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const FIELD = "h-9 bg-white/5 border-white/10 text-sm";
const CARD = "glass-card p-4 rounded-2xl border border-white/10";

const ROLES = ["student", "moderator", "admin", "super_admin", "owner"] as const;
const roleColors: Record<string, string> = {
  owner: "bg-yellow-500/20 text-yellow-400",
  super_admin: "bg-purple-500/20 text-purple-400",
  admin: "bg-blue-500/20 text-blue-400",
  moderator: "bg-cyan-500/20 text-cyan-400",
  student: "bg-green-500/20 text-green-400",
};

export default function UsersSection({ users }: { users: any[] }) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(25);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ coins: "", xp: "", role: "", name: "" });

  const isSuperAdmin = userProfile?.role === "super_admin" || userProfile?.role === "owner";

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.userNo?.toLowerCase().includes(search.toLowerCase()) ||
      u.uid?.includes(search);
    const matchRole = roleFilter === "all" || normalizeRole(u.role) === roleFilter;
    return matchSearch && matchRole;
  });

  const openEdit = (u: any) => {
    setEditingUser(u);
    setEditForm({ coins: String(u.coins || 0), xp: String(u.xp || 0), role: normalizeRole(u.role), name: u.name || "" });
  };

  const saveEdit = async () => {
    if (!editingUser || !currentUser) return;
    if (normalizeRole(editingUser.role) === "owner" && userProfile?.role !== "owner") {
      toast({ title: "Cannot edit Owner account", variant: "destructive" }); return;
    }
    const coinsText = editForm.coins.trim();
    const xpText = editForm.xp.trim();
    const coins = Number(coinsText);
    const xp = Number(xpText);
    if (!coinsText || !/^\d+$/.test(coinsText) || !Number.isSafeInteger(coins) || coins < 0) {
      toast({ title: "Coins must be a valid non-negative whole number", variant: "destructive" }); return;
    }
    if (!xpText || !/^\d+$/.test(xpText) || !Number.isSafeInteger(xp) || xp < 0) {
      toast({ title: "XP must be a valid non-negative whole number", variant: "destructive" }); return;
    }
    if (!ROLES.includes(editForm.role as typeof ROLES[number])) {
      toast({ title: "Invalid role selected", variant: "destructive" }); return;
    }
    await update(ref(db, `users/${editingUser.uid}`), {
      coins,
      xp,
      role: editForm.role,
      name: editForm.name,
    });
    await logAdminAction(currentUser.uid, userProfile?.name || "Admin", "user.edit", editingUser.uid, { role: editForm.role, coins: editForm.coins });
    toast({ title: "User updated ✅" });
    setEditingUser(null);
  };

  const toggleBan = async (u: any) => {
    if (!currentUser) return;
    if (u.role === "owner" || u.role === "super_admin") {
      toast({ title: "Cannot ban admin accounts", variant: "destructive" }); return;
    }
    await update(ref(db, `users/${u.uid}`), { banned: !u.banned });
    await logAdminAction(currentUser.uid, userProfile?.name || "Admin", u.banned ? "user.unban" : "user.ban", u.uid, { name: u.name });
    toast({ title: u.banned ? "User unbanned." : "User banned." });
  };

  const toggleSuspend = async (u: any) => {
    if (!currentUser) return;
    await update(ref(db, `users/${u.uid}`), { suspended: !u.suspended, suspendedAt: u.suspended ? null : Date.now() });
    await logAdminAction(currentUser.uid, userProfile?.name || "Admin", u.suspended ? "user.unsuspend" : "user.suspend", u.uid);
    toast({ title: u.suspended ? "User unsuspended." : "User suspended for 7 days." });
  };

  const verifyUser = async (u: any) => {
    if (!currentUser) return;
    await update(ref(db, `users/${u.uid}`), { verified: true });
    await logAdminAction(currentUser.uid, userProfile?.name || "Admin", "user.verify", u.uid);
    toast({ title: "User verified ✅" });
  };

  const sendReset = async (u: any) => {
    if (!u.email) { toast({ title: "No email on file", variant: "destructive" }); return; }
    await sendPasswordResetEmail(auth, u.email);
    toast({ title: "Password reset email sent!" });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold mb-1">User Management</h2>
        <p className="text-xs text-muted-foreground">{users.length} total users in Firebase</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID No., name, email…" className="pl-8 h-9 bg-white/5 border-white/10 text-sm" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
          <option value="all" className="bg-gray-900">All Roles</option>
          {ROLES.map(r => <option key={r} value={r} className="bg-gray-900">{r.replace("_"," ")}</option>)}
        </select>
      </div>

      <p className="text-xs text-muted-foreground">Showing {filtered.length} users</p>

      {/* User list */}
      <div className="space-y-2">
        {filtered.slice(0, visibleCount).map(u => (
          <motion.div key={u.uid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
            {editingUser?.uid === u.uid ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-8 h-8"><AvatarImage src={u.photoURL} /><AvatarFallback>{u.name?.[0]}</AvatarFallback></Avatar>
                  <p className="font-semibold text-sm">{u.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                    <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={FIELD} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Role</Label>
                    <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                      className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none"
                      disabled={!isSuperAdmin}>
                      {ROLES.map(r => <option key={r} value={r} className="bg-gray-900">{r.replace("_"," ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Coins</Label>
                    <Input type="number" value={editForm.coins} onChange={e => setEditForm(p => ({ ...p, coins: e.target.value }))} className={FIELD} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">XP</Label>
                    <Input type="number" value={editForm.xp} onChange={e => setEditForm(p => ({ ...p, xp: e.target.value }))} className={FIELD} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <GlowButton size="sm" className="h-8 px-4 text-xs" onClick={saveEdit}><Save className="w-3 h-3 mr-1" />Save</GlowButton>
                  <button onClick={() => setEditingUser(null)} className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs transition-colors"><X className="w-3 h-3" /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={u.photoURL} />
                    <AvatarFallback className="text-sm">{u.name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  {u.lastActive && Date.now() - u.lastActive < 5 * 60 * 1000 && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-sm truncate">{u.name || "Unknown"}</p>
                    {u.verified && <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />}
                      <Badge className={`text-[9px] px-1.5 py-0 ${roleColors[normalizeRole(u.role)] || "bg-gray-500/20 text-gray-400"}`}>
                       {roleLabel(u.role)}
                    </Badge>
                    {u.banned && <Badge className="text-[9px] px-1.5 py-0 bg-red-500/20 text-red-400">Banned</Badge>}
                    {u.suspended && <Badge className="text-[9px] px-1.5 py-0 bg-orange-500/20 text-orange-400">Suspended</Badge>}
                  </div>
                   <p className="text-[10px] text-primary/80 mt-0.5 font-semibold tracking-wide">
                     ID No. {u.userNo || createUserNo(u.uid)}
                   </p>
                   <p className="text-[10px] text-muted-foreground mt-0.5">{u.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-yellow-400">🪙 {u.coins || 0}</span>
                    <span className="text-[10px] text-blue-400">⚡ {u.xp || 0} XP</span>
                    {u.lastActive && <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(u.lastActive, { addSuffix: true })}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!u.verified && (
                    <button onClick={() => verifyUser(u)} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors" title="Verify">
                      <UserCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => toggleSuspend(u)} className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors" title={u.suspended ? "Unsuspend" : "Suspend"}>
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleBan(u)} className={`p-1.5 rounded-lg transition-colors ${u.banned ? "bg-green-500/10 hover:bg-green-500/20 text-green-400" : "bg-red-500/10 hover:bg-red-500/20 text-red-400"}`} title={u.banned ? "Unban" : "Ban"}>
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => sendReset(u)} className="p-1.5 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 transition-colors" title="Reset Password">
                    <MailCheck className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No users match your search.</p>}
        {filtered.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(count => count + 25)}
            className="w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-muted-foreground transition-colors"
          >
            Load more users
          </button>
        )}
      </div>
    </div>
  );
}
