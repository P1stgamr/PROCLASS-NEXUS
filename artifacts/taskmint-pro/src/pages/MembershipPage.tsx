import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ref, update } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Crown, Check, X, Zap, Bot, BookOpen, Trophy,
  Shield, Star, Sparkles, ChevronLeft, Copy
} from "lucide-react";

const BKASH_NUMBER = "01757098701";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "",
    color: "from-slate-500 to-slate-600",
    border: "border-slate-500/30",
    badge: null,
    icon: "🎓",
    features: [
      { text: "Basic AI (10 chats/day)", ok: true },
      { text: "Free Courses", ok: true },
      { text: "Study Resources", ok: true },
      { text: "Leaderboard", ok: true },
      { text: "Premium Courses", ok: false },
      { text: "Unlimited AI", ok: false },
      { text: "Premium Exams", ok: false },
      { text: "Premium Badge", ok: false },
    ],
  },
  {
    id: "silver",
    name: "Silver",
    price: 99,
    period: "/মাস",
    color: "from-slate-300 to-slate-400",
    border: "border-slate-400/40",
    badge: "Popular",
    icon: "🥈",
    features: [
      { text: "Basic AI (50 chats/day)", ok: true },
      { text: "Free Courses", ok: true },
      { text: "Study Resources", ok: true },
      { text: "Leaderboard", ok: true },
      { text: "Premium Courses (5)", ok: true },
      { text: "Unlimited AI", ok: false },
      { text: "Premium Exams", ok: false },
      { text: "Silver Badge", ok: true },
    ],
  },
  {
    id: "gold",
    name: "Gold",
    price: 199,
    period: "/মাস",
    color: "from-yellow-400 to-amber-500",
    border: "border-yellow-500/40",
    badge: "Best Value",
    icon: "🥇",
    features: [
      { text: "Unlimited AI", ok: true },
      { text: "All Courses (Free+Premium)", ok: true },
      { text: "Study Resources", ok: true },
      { text: "Leaderboard", ok: true },
      { text: "All Premium Courses", ok: true },
      { text: "Premium Exams", ok: true },
      { text: "Gold Badge", ok: true },
      { text: "Priority Support", ok: false },
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    price: 499,
    period: "/মাস",
    color: "from-violet-400 to-purple-600",
    border: "border-violet-500/40",
    badge: "Ultimate",
    icon: "💎",
    features: [
      { text: "Unlimited AI (GPT-4 level)", ok: true },
      { text: "All Courses + Early Access", ok: true },
      { text: "Study Resources", ok: true },
      { text: "Exclusive Leaderboard", ok: true },
      { text: "All Premium Courses", ok: true },
      { text: "Premium Exams + Extra Prizes", ok: true },
      { text: "Platinum Badge + Crown", ok: true },
      { text: "1-on-1 Mentor Support", ok: true },
    ],
  },
];

export default function MembershipPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string>("gold");
  const [step, setStep] = useState<"plans" | "payment" | "verify">("plans");
  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentPlan = userProfile?.membership || "free";
  const selectedPlan = PLANS.find(p => p.id === selected)!;

  const handleUpgrade = () => {
    if (selected === "free") return;
    setStep("payment");
  };

  const handleSubmitPayment = async () => {
    if (!txnId.trim() || txnId.length < 6) {
      toast({ title: "Transaction ID দিন", description: "Valid bKash transaction ID দিন", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (!currentUser) throw new Error("Not logged in");
      await update(ref(db, `membershipRequests/${currentUser.uid}`), {
        uid: currentUser.uid,
        plan: selected,
        price: selectedPlan.price,
        txnId: txnId.trim(),
        status: "pending",
        requestedAt: Date.now(),
        name: userProfile?.name,
        email: userProfile?.email,
      });
      setStep("verify");
    } catch {
      toast({ title: "Error", description: "আবার চেষ্টা করুন", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyBkash = () => {
    navigator.clipboard.writeText(BKASH_NUMBER);
    toast({ title: "Copied!", description: `bKash: ${BKASH_NUMBER}` });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => step !== "plans" ? setStep("plans") : setLocation("/home")}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Membership</h1>
            <p className="text-[11px] text-muted-foreground">
              Current: <span className="text-primary capitalize">{currentPlan}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto">
        <AnimatePresence mode="wait">

          {/* Step 1: Plans */}
          {step === "plans" && (
            <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Hero */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-extrabold">ProClass Premium</h2>
                <p className="text-sm text-muted-foreground mt-1">আনলক করুন সব premium features</p>
              </motion.div>

              {/* Plans Grid */}
              <div className="space-y-3 mb-5">
                {PLANS.map((plan, i) => {
                  const isActive = currentPlan === plan.id;
                  const isSelected = selected === plan.id;

                  return (
                    <motion.div key={plan.id}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => setSelected(plan.id)}
                      className={`relative p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                        isSelected
                          ? `border-primary bg-primary/10`
                          : `${plan.border} glass-card hover:bg-white/[0.08]`
                      }`}>
                      {plan.badge && (
                        <div className="absolute -top-2.5 right-4">
                          <Badge className={`text-[9px] px-2 py-0.5 ${
                            plan.id === "gold" ? "badge-coin" :
                            plan.id === "platinum" ? "badge-level" : "bg-slate-500/40 text-slate-300"
                          }`}>
                            {plan.badge}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-xl shrink-0`}>
                          {plan.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold">{plan.name}</h3>
                            {isActive && <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/20">Current</Badge>}
                          </div>
                          <p className={`text-lg font-extrabold ${plan.price === 0 ? "text-muted-foreground" : "text-white"}`}>
                            {plan.price === 0 ? "বিনামূল্যে" : `৳${plan.price}`}
                            <span className="text-xs font-normal text-muted-foreground">{plan.period}</span>
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-primary bg-primary" : "border-white/30"}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      {/* Features */}
                      <div className="grid grid-cols-2 gap-1.5 mt-3">
                        {plan.features.slice(0, 4).map((f, fi) => (
                          <div key={fi} className={`flex items-center gap-1.5 text-[10px] ${f.ok ? "text-foreground" : "text-muted-foreground/50"}`}>
                            {f.ok
                              ? <Check className="w-3 h-3 text-green-400 shrink-0" />
                              : <X className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                            <span className="line-clamp-1">{f.text}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <GlowButton className="w-full h-13 text-base"
                disabled={selected === "free" || selected === currentPlan}
                onClick={handleUpgrade}>
                {selected === currentPlan ? "Current Plan" :
                  selected === "free" ? "Free Plan" :
                  `${selectedPlan.name} — ৳${selectedPlan.price}/মাসে Upgrade`}
              </GlowButton>
            </motion.div>
          )}

          {/* Step 2: Payment */}
          {step === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">💳</div>
                <h2 className="text-xl font-extrabold">{selectedPlan.name} Plan Payment</h2>
                <p className="text-muted-foreground text-sm mt-1">bKash-এ পেমেন্ট করুন</p>
              </div>

              {/* bKash Instructions */}
              <div className="glass-card rounded-2xl p-5 mb-5 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                  <div>
                    <p className="text-[10px] text-muted-foreground">bKash Number (Personal)</p>
                    <p className="font-extrabold text-lg text-pink-400">{BKASH_NUMBER}</p>
                  </div>
                  <button onClick={copyBkash}
                    className="p-2.5 rounded-xl bg-pink-500/20 border border-pink-500/30 hover:bg-pink-500/30 transition-colors">
                    <Copy className="w-4 h-4 text-pink-400" />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Plan</span><span className="text-white font-semibold">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Amount</span><span className="text-yellow-400 font-bold">৳{selectedPlan.price}</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 space-y-1.5 text-xs text-muted-foreground">
                  <p>① bKash অ্যাপ খুলুন → Send Money</p>
                  <p>② Number: <strong className="text-white">{BKASH_NUMBER}</strong></p>
                  <p>③ Amount: <strong className="text-yellow-400">৳{selectedPlan.price}</strong></p>
                  <p>④ Reference-এ আপনার email দিন</p>
                  <p>⑤ Transaction ID নিচে দিন</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Transaction ID *</label>
                  <input
                    value={txnId}
                    onChange={e => setTxnId(e.target.value)}
                    placeholder="e.g. 8N7A2QR5K1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              <GlowButton className="w-full h-13 text-base" onClick={handleSubmitPayment} disabled={submitting}>
                {submitting ? "Submitting..." : "Payment Confirm করুন"}
              </GlowButton>
            </motion.div>
          )}

          {/* Step 3: Verification */}
          {step === "verify" && (
            <motion.div key="verify" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
                className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-5">
                <Check className="w-10 h-10 text-green-400" />
              </motion.div>
              <h2 className="text-2xl font-extrabold mb-2">Request Submitted!</h2>
              <p className="text-muted-foreground text-sm mb-6">
                আপনার payment verify করা হচ্ছে।<br />
                সাধারণত ১-২৪ ঘণ্টার মধ্যে activate হয়।
              </p>
              <div className="glass-card rounded-2xl p-4 mb-6 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-semibold">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-primary">{txnId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/20">Pending</Badge>
                </div>
              </div>
              <GlowButton className="w-full" onClick={() => setLocation("/home")}>
                Home-এ যান
              </GlowButton>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
