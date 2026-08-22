import { useState } from "react";
import { motion } from "framer-motion";
import { ref, push, update, runTransaction } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { logAdminAction } from "@/lib/adminLog";
import { Badge } from "@/components/ui/badge";
import { GlowButton } from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, CreditCard, Wallet, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CARD = "glass-card p-4 rounded-2xl border border-white/10";
const badgeColor: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface Props {
  paymentRequests: any[];
  withdrawRequests: any[];
  membershipRequests: any[];
  users: any[];
}

export default function PaymentsSection({ paymentRequests, withdrawRequests, membershipRequests, users }: Props) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [visibleCount, setVisibleCount] = useState(25);

  const getUserName = (uid: string) => users.find(u => u.uid === uid)?.name || uid.slice(0, 8);

  // ── Exam Payment handlers ──
  const approvePayment = async (req: any) => {
    await update(ref(db, `paymentRequests/${req.id}`), { status: "approved", processedAt: Date.now() });
    await update(ref(db, `examEntries/${req.uid}/${req.examId}`), { approved: true, paidAt: Date.now() });
    await push(ref(db, `notifications/${req.uid}`), { type: "contest", message: `Payment approved! "${req.examTitle}" exam access granted.`, timestamp: Date.now(), read: false });
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "payment.approve", req.id, { uid: req.uid, exam: req.examTitle });
    toast({ title: "Payment approved ✅" });
  };

  const rejectPayment = async (req: any) => {
    await update(ref(db, `paymentRequests/${req.id}`), { status: "rejected", processedAt: Date.now() });
    await push(ref(db, `notifications/${req.uid}`), { type: "system", message: `Payment rejected for "${req.examTitle}".`, timestamp: Date.now(), read: false });
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "payment.reject", req.id, { uid: req.uid });
    toast({ title: "Payment rejected." });
  };

  // ── Withdraw handlers ──
  const approveWithdraw = async (req: any) => {
    const requestRef = ref(db, `withdrawRequests/${req.id}`);
    // Claim the request atomically so two admins cannot approve it twice.
    const claim = await runTransaction(requestRef, (current: any) => {
      if (!current || current.status !== "pending") return;
      return { ...current, status: "approved", processedAt: Date.now() };
    });
    if (!claim.committed) {
      toast({ title: "Request already processed", variant: "destructive" });
      return;
    }

    // Re-read and debit the live balance atomically; never trust the list snapshot.
    const debit = await runTransaction(ref(db, `users/${req.uid}/coins`), (current: any) => {
      const coins = Number(current);
      const amount = Number(req.amount);
      if (!Number.isFinite(coins) || !Number.isFinite(amount) || coins < amount) return;
      return coins - amount;
    });
    if (!debit.committed) {
      await update(requestRef, { status: "rejected", processedAt: Date.now(), rejectionReason: "Insufficient balance" });
      await push(ref(db, `notifications/${req.uid}`), { type: "system", message: "Withdrawal rejected because your available balance was insufficient.", timestamp: Date.now(), read: false });
      toast({ title: "Rejected: insufficient live balance", variant: "destructive" });
      return;
    }

    await push(ref(db, `notifications/${req.uid}`), { type: "coin", message: `৳${req.amount} bKash-এ পাঠানো হয়েছে ✅`, timestamp: Date.now(), read: false });
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "withdraw.approve", req.id, { uid: req.uid, amount: req.amount });
    toast({ title: `৳${req.amount} withdrawal approved ✅` });
  };

  const rejectWithdraw = async (req: any) => {
    await update(ref(db, `withdrawRequests/${req.id}`), { status: "rejected", processedAt: Date.now() });
    await push(ref(db, `notifications/${req.uid}`), { type: "system", message: `Withdrawal request (৳${req.amount}) rejected.`, timestamp: Date.now(), read: false });
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "withdraw.reject", req.id, { uid: req.uid, amount: req.amount });
    toast({ title: "Withdrawal rejected." });
  };

  // ── Membership requests ──
  const approveMembership = async (req: any) => {
    const expiry = Date.now() + (req.durationDays || 30) * 24 * 60 * 60 * 1000;
    await update(ref(db, `membershipRequests/${req.id}`), { status: "approved", processedAt: Date.now() });
    await update(ref(db, `users/${req.uid}`), { membership: req.planId || "silver", membershipExpiry: expiry });
    await push(ref(db, `notifications/${req.uid}`), { type: "system", message: `🎉 Membership activated! Enjoy your ${req.planName || "premium"} plan.`, timestamp: Date.now(), read: false });
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "payment.approve", req.id, { uid: req.uid, plan: req.planName });
    toast({ title: "Membership approved ✅" });
  };

  const rejectMembership = async (req: any) => {
    await update(ref(db, `membershipRequests/${req.id}`), { status: "rejected", processedAt: Date.now() });
    await push(ref(db, `notifications/${req.uid}`), { type: "system", message: `Membership request rejected.`, timestamp: Date.now(), read: false });
    toast({ title: "Membership rejected." });
  };

  const pending = {
    payments: paymentRequests.filter(r => r.status === "pending"),
    withdraws: withdrawRequests.filter(r => r.status === "pending"),
    memberships: membershipRequests.filter(r => r.status === "pending"),
  };

  const RequestCard = ({ req, onApprove, onReject, label, amountLabel }: any) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{getUserName(req.uid)}</p>
            <Badge className={`text-[9px] px-1.5 py-0 ${badgeColor[req.status]}`}>{req.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          <p className="text-sm font-bold text-primary mt-1">{amountLabel}</p>
          {req.bkashNumber && <p className="text-[10px] text-muted-foreground mt-0.5">bKash: {req.bkashNumber}</p>}
          {req.transactionId && <p className="text-[10px] text-muted-foreground">TxID: {req.transactionId}</p>}
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {req.createdAt || req.requestedAt ? formatDistanceToNow(req.createdAt || req.requestedAt, { addSuffix: true }) : ""}
          </p>
        </div>
        {req.status === "pending" && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onApprove(req)} className="p-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button onClick={() => onReject(req)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold mb-1">Payments & Withdrawals</h2>
        <p className="text-xs text-muted-foreground">
          {pending.payments.length + pending.withdraws.length + pending.memberships.length} pending approvals
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Exam Payments", count: pending.payments.length, icon: CreditCard, color: "bg-yellow-500" },
          { label: "Withdrawals", count: pending.withdraws.length, icon: Wallet, color: "bg-red-500" },
          { label: "Memberships", count: pending.memberships.length, icon: TrendingUp, color: "bg-purple-500" },
        ].map(s => (
          <div key={s.label} className={`${CARD} text-center`}>
            <div className={`w-8 h-8 rounded-xl ${s.color} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-extrabold">{s.count}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Exam Payments */}
      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
          <CreditCard className="w-3 h-3" /> Exam Payments ({paymentRequests.length})
        </p>
        {paymentRequests.length === 0
          ? <p className="text-center py-4 text-sm text-muted-foreground">No payment requests.</p>
          : paymentRequests.slice(0, visibleCount).map(req => (
              <RequestCard key={req.id} req={req}
                onApprove={approvePayment} onReject={rejectPayment}
                label={req.examTitle || "Exam payment"}
                amountLabel={`৳${req.amount || req.entryFee || 0}`}
              />
            ))}
      </div>

      {/* Withdrawals */}
      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
          <Wallet className="w-3 h-3" /> Withdrawal Requests ({withdrawRequests.length})
        </p>
        {withdrawRequests.length === 0
          ? <p className="text-center py-4 text-sm text-muted-foreground">No withdrawal requests.</p>
          : withdrawRequests.slice(0, visibleCount).map(req => (
              <RequestCard key={req.id} req={req}
                onApprove={approveWithdraw} onReject={rejectWithdraw}
                label="Coin withdrawal"
                amountLabel={`৳${req.amount}`}
              />
            ))}
      </div>

      {/* Membership Requests */}
      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
          <Clock className="w-3 h-3" /> Membership Requests ({membershipRequests.length})
        </p>
        {membershipRequests.length === 0
          ? <p className="text-center py-4 text-sm text-muted-foreground">No membership requests.</p>
          : membershipRequests.slice(0, visibleCount).map(req => (
              <RequestCard key={req.id} req={req}
                onApprove={approveMembership} onReject={rejectMembership}
                label={req.planName || "Membership plan"}
                amountLabel={`৳${req.amount || 0}`}
              />
            ))}
      </div>

      {(paymentRequests.length > visibleCount || withdrawRequests.length > visibleCount || membershipRequests.length > visibleCount) && (
        <button
          onClick={() => setVisibleCount(count => count + 25)}
          className="w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-muted-foreground transition-colors"
        >
          Load more requests
        </button>
      )}
    </div>
  );
}
