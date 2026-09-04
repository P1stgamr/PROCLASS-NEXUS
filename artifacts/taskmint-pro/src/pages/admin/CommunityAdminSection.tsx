import { useState } from "react";
import { motion } from "framer-motion";
import { push, ref, runTransaction, update } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/adminLog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GlowButton } from "@/components/GlowButton";
import { Building2, CheckCircle2, Coins, ShieldCheck, XCircle } from "lucide-react";

const CARD = "glass-card rounded-2xl border border-white/10 p-4";

export default function CommunityAdminSection({
  requests,
  communities,
  withdrawals,
}: {
  requests: any[];
  communities: any[];
  withdrawals: any[];
}) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});

  const approveRequest = async (request: any) => {
    if (!currentUser) return;
    try {
      const communityRef = ref(db, "communities");
      const created = push(communityRef, {
        ownerUid: request.uid,
        name: request.name,
        description: request.description || "",
        logo: request.logo || null,
        status: "active",
        commissionRate: 5,
        specialBenefits: { featured: false, verified: false, priority: false },
        createdAt: Date.now(),
      });
      await update(ref(db), {
        [`communityRequests/${request.id}/status`]: "approved",
        [`communityRequests/${request.id}/processedAt`]: Date.now(),
        [`communityRequests/${request.id}/communityId`]: created.key,
      });
      await logAdminAction(currentUser.uid, userProfile?.name || "Admin", "community.approve", request.id, { communityId: created.key });
      toast({ title: "Community approved ✅" });
    } catch (error: any) {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    }
  };

  const rejectRequest = async (request: any) => {
    if (!currentUser) return;
    await update(ref(db, `communityRequests/${request.id}`), { status: "rejected", processedAt: Date.now() });
    await logAdminAction(currentUser.uid, userProfile?.name || "Admin", "community.reject", request.id);
    toast({ title: "Community request rejected" });
  };

  const saveCommunitySettings = async (community: any) => {
    const rate = Number(rateDrafts[community.id] ?? community.commissionRate ?? 5);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast({ title: "Commission rate must be between 0 and 100", variant: "destructive" });
      return;
    }
    await update(ref(db, `communities/${community.id}`), { commissionRate: rate, updatedAt: Date.now() });
    toast({ title: "Community settings updated ✅" });
  };

  const toggleBenefit = async (community: any, benefit: "featured" | "verified" | "priority") => {
    await update(ref(db, `communities/${community.id}/specialBenefits`), {
      [benefit]: !community.specialBenefits?.[benefit],
    });
  };

  const processWithdrawal = async (request: any, status: "approved" | "rejected") => {
    if (!currentUser) return;
    const requestRef = ref(db, `communityWithdrawals/${request.communityId}/${request.id}`);
    const claim = await runTransaction(requestRef, (current: any) => {
      if (!current || current.status !== "pending") return;
      return { ...current, status, processedAt: Date.now(), processedBy: currentUser.uid };
    });
    if (!claim.committed) {
      toast({ title: "Request already processed", variant: "destructive" });
      return;
    }
    if (status === "approved") {
      const balance = await runTransaction(ref(db, `communityBalances/${request.communityId}/balance`), (current: any) => {
        const amount = Number(request.amount);
        const available = Number(current || 0);
        if (!Number.isFinite(amount) || available < amount) return;
        return available - amount;
      });
      if (!balance.committed) {
        await update(requestRef, { status: "rejected", rejectionReason: "Insufficient balance", processedAt: Date.now() });
        toast({ title: "Rejected: insufficient community balance", variant: "destructive" });
        return;
      }
    }
    await logAdminAction(currentUser.uid, userProfile?.name || "Admin", `community.withdraw.${status}`, request.id, { communityId: request.communityId, amount: request.amount });
    toast({ title: `Community withdrawal ${status} ✅` });
  };

  const pendingRequests = requests.filter((item) => item.status === "pending");
  const pendingWithdrawals = withdrawals.filter((item) => item.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold">Communities</h2>
        <p className="text-xs text-muted-foreground">{communities.length} active/registered communities · {pendingRequests.length} pending applications</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Applications</h3>
        {requests.length === 0 ? <p className="text-sm text-muted-foreground">No community applications yet.</p> : requests.map((request) => (
          <motion.div key={request.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
            <div className="flex items-start gap-3">
              {request.logo ? <img src={request.logo} alt="" className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>}
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-bold text-sm truncate">{request.name}</p><Badge className="text-[9px]">{request.status}</Badge></div><p className="text-xs text-muted-foreground">{request.userName} · {request.userEmail}</p><p className="text-xs text-muted-foreground mt-1">{request.description}</p></div>
              {request.status === "pending" && <div className="flex gap-1"><button onClick={() => approveRequest(request)} className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20"><CheckCircle2 className="w-4 h-4" /></button><button onClick={() => rejectRequest(request)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20"><XCircle className="w-4 h-4" /></button></div>}
            </div>
          </motion.div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Community controls</h3>
        {communities.length === 0 ? <p className="text-sm text-muted-foreground">No approved communities yet.</p> : communities.map((community) => (
          <div key={community.id} className={CARD}>
            <div className="flex items-center gap-3">
              {community.logo ? <img src={community.logo} alt="" className="w-11 h-11 rounded-xl object-cover" /> : <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>}
              <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{community.name}</p><p className="text-[10px] text-muted-foreground">Owner UID: {community.ownerUid}</p></div>
              <Badge className="bg-green-500/15 text-green-300">{community.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Input type="number" min="0" max="100" value={rateDrafts[community.id] ?? community.commissionRate ?? 5} onChange={(event) => setRateDrafts({ ...rateDrafts, [community.id]: event.target.value })} className="h-9 bg-white/5 border-white/10 text-sm" />
              <GlowButton size="sm" className="h-9" onClick={() => saveCommunitySettings(community)}>Save rate %</GlowButton>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {(["verified", "featured", "priority"] as const).map((benefit) => <button key={benefit} onClick={() => toggleBenefit(community, benefit)} className={`px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 ${community.specialBenefits?.[benefit] ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}><ShieldCheck className="w-3 h-3" />{benefit}</button>)}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Community withdrawals ({pendingWithdrawals.length} pending)</h3>
        {withdrawals.length === 0 ? <p className="text-sm text-muted-foreground">No community withdrawal requests.</p> : withdrawals.map((request) => (
          <div key={`${request.communityId}-${request.id}`} className={CARD}>
            <div className="flex items-start gap-3"><Coins className="w-5 h-5 text-yellow-400 mt-1" /><div className="flex-1"><p className="font-bold text-sm">{request.communityName}</p><p className="text-xs text-muted-foreground">৳{request.amount} · bKash {request.bkashNumber}</p><Badge className="mt-2 text-[9px]">{request.status}</Badge></div>{request.status === "pending" && <div className="flex gap-1"><button onClick={() => processWithdrawal(request, "approved")} className="p-2 rounded-xl bg-green-500/10 text-green-400"><CheckCircle2 className="w-4 h-4" /></button><button onClick={() => processWithdrawal(request, "rejected")} className="p-2 rounded-xl bg-red-500/10 text-red-400"><XCircle className="w-4 h-4" /></button></div>}</div>
          </div>
        ))}
      </section>
    </div>
  );
}