import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ref, onValue, off, push, set } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, CheckCircle2, Clock, Shield, Smartphone } from "lucide-react";

const BKASH_NUMBER = "01XXXXXXXXX";

const SAMPLE_EXAMS: Record<string, any> = {
  exam1: { title: "SSC Math Championship", entryFee: 20, prizePool: 500 },
  exam2: { title: "HSC Physics Showdown", entryFee: 50, prizePool: 1500 },
  exam3: { title: "Programming Quiz Cup", entryFee: 30, prizePool: 800 },
  exam4: { title: "General Knowledge Grand Prix", entryFee: 10, prizePool: 300 },
};

const STEPS = [
  { num: 1, text: 'বিকাশ app খুলুন → "Send Money" বা "Payment" select করুন' },
  { num: 2, text: `Merchant/Personal নম্বরে পাঠান: ${BKASH_NUMBER}` },
  { num: 3, text: "Amount দিন (নিচে দেখুন) এবং Send করুন" },
  { num: 4, text: "Transaction ID copy করুন (যেমন: 8F3K2X...)" },
  { num: 5, text: "নিচের form-এ Transaction ID paste করুন এবং Submit করুন" },
];

export default function PaymentPage() {
  const params = useParams<{ examId: string }>();
  const [, setLocation] = useLocation();
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [exam, setExam] = useState<any>(null);
  const [txnId, setTxnId] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const examId = params?.examId || "";

  useEffect(() => {
    const dbRef = ref(db, `premiumExams/${examId}`);
    const unsub = onValue(dbRef, (snap) => {
      setExam(snap.val() || SAMPLE_EXAMS[examId] || null);
    });
    return () => off(dbRef);
  }, [examId]);

  const copyNumber = () => {
    navigator.clipboard.writeText(BKASH_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnId.trim() || !bkashNumber.trim()) {
      toast({ title: "সব field পূরণ করুন", variant: "destructive" });
      return;
    }
    if (!currentUser || !exam) return;
    setLoading(true);
    try {
      await push(ref(db, "paymentRequests"), {
        uid: currentUser.uid,
        userName: userProfile?.name || "Unknown",
        examId,
        examTitle: exam.title,
        amount: exam.entryFee,
        txnId: txnId.trim(),
        bkashNumber: bkashNumber.trim(),
        status: "pending",
        createdAt: Date.now(),
      });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Submit failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-5 max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto border border-green-500/30">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">Payment Submitted!</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              আপনার payment request পাঠানো হয়েছে। Admin verify করার পর আপনাকে exam-এ access দেওয়া হবে।
              সাধারণত ১৫–৩০ মিনিটের মধ্যে approve হয়।
            </p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-300">Pending approval — Notifications দেখুন</p>
          </div>
          <GlowButton
            className="w-full h-12"
            onClick={() => setLocation("/premium-exams")}
          >
            Exams-এ ফিরে যান
          </GlowButton>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => setLocation("/premium-exams")}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-400" />
            <h1 className="text-xl font-extrabold tracking-tight">বিকাশ Payment</h1>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-5">
        {exam && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 rounded-2xl border border-yellow-500/20"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Exam</p>
            <h2 className="font-bold text-base">{exam.title}</h2>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <p className="text-xs text-muted-foreground">Entry Fee</p>
                <p className="text-2xl font-extrabold text-green-400">৳{exam.entryFee}</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-xs text-muted-foreground">Prize Pool</p>
                <p className="text-lg font-bold text-yellow-400">৳{exam.prizePool}</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 rounded-2xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-black">b</div>
            <h3 className="font-bold">বিকাশে পাঠানোর নিয়ম</h3>
          </div>

          <div className="space-y-3 mb-4">
            {STEPS.map((step) => (
              <div key={step.num} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.num}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div>
              <p className="text-xs text-muted-foreground">বিকাশ নম্বর</p>
              <p className="font-bold text-green-400 text-lg tracking-widest">{BKASH_NUMBER}</p>
            </div>
            <button
              onClick={copyNumber}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors"
              data-testid="btn-copy-bkash"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="glass-card p-5 rounded-2xl space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Transaction Confirm করুন</h3>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">
              আপনার বিকাশ নম্বর *
            </Label>
            <Input
              value={bkashNumber}
              onChange={(e) => setBkashNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="h-12 bg-white/5 border-white/10"
              data-testid="input-bkash-number"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">
              বিকাশ Transaction ID *
            </Label>
            <Input
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder="যেমন: 8F3K2X9Y..."
              className="h-12 bg-white/5 border-white/10 font-mono tracking-wider"
              data-testid="input-txn-id"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              বিকাশ app-এ payment করার পর SMS-এ Transaction ID পাবেন
            </p>
          </div>

          <GlowButton
            type="submit"
            className="w-full h-12"
            disabled={loading || !txnId.trim() || !bkashNumber.trim()}
            data-testid="btn-submit-payment"
          >
            {loading ? "Submitting..." : "Payment Confirm করুন"}
          </GlowButton>
        </motion.form>
      </div>
    </div>
  );
}
