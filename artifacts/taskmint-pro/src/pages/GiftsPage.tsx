import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off, update, get, push } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { AdModal } from "@/components/AdModal";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { awardCoinsWithCommunityCommission } from "@/lib/community";
import { Gift, Zap, CheckCircle2, ArrowLeft, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function GiftsPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adTarget, setAdTarget] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const giftsRef = ref(db, `gifts/${currentUser.uid}`);
    const unsub = onValue(giftsRef, (snap) => {
      const data = snap.val();
      setGifts(
        data
          ? Object.entries(data)
              .map(([id, v]: [string, any]) => ({ id, ...v }))
              .sort((a, b) => b.sentAt - a.sentAt)
          : []
      );
      setLoading(false);
    });
    return () => off(giftsRef);
  }, [currentUser]);

  const startClaim = (giftId: string) => {
    setAdTarget(giftId);
  };

  const claimGift = async () => {
    if (!adTarget || !currentUser) return;
    setClaiming(true);
    try {
      const giftRef = ref(db, `gifts/${currentUser.uid}/${adTarget}`);
      const snap = await get(giftRef);
      const gift = snap.val();
      if (!gift || gift.claimed) {
        toast({ title: "Gift ইতিমধ্যে claim করা হয়েছে", variant: "destructive" });
        return;
      }
      await update(giftRef, { claimed: true, claimedAt: Date.now() });
      await awardCoinsWithCommunityCommission(currentUser.uid, Number(gift.coins || 0), "bonus", adTarget);
      await push(ref(db, `earnings/${currentUser.uid}`), {
        type: "bonus",
        amount: Number(gift.coins || 0),
        label: gift.message || "Gift claim",
        timestamp: Date.now(),
      });
      toast({ title: `🎁 ${gift.coins} coins claim করা হয়েছে!` });
    } catch (err: any) {
      toast({ title: "Claim failed", description: err.message, variant: "destructive" });
    } finally {
      setClaiming(false);
      setAdTarget(null);
    }
  };

  const unclaimedCount = gifts.filter((g) => !g.claimed).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <AdModal
        open={!!adTarget}
        title="Ad দেখুন — তারপর gift claim করুন"
        onComplete={claimGift}
        onClose={() => setAdTarget(null)}
      />

      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => setLocation("/home")} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">আমার Gifts</h1>
            <p className="text-xs text-muted-foreground">Admin থেকে পাওয়া উপহার</p>
          </div>
          {unclaimedCount > 0 && (
            <Badge className="ml-auto bg-purple-500/20 text-purple-400 border-purple-500/30">
              {unclaimedCount} নতুন
            </Badge>
          )}
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-4">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="glass-card rounded-2xl h-24 animate-pulse" />
          ))
        ) : gifts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 space-y-4">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/30" />
            <div>
              <p className="font-semibold text-muted-foreground">কোনো gift নেই</p>
              <p className="text-xs text-muted-foreground mt-1">Admin কিছু gift পাঠালে এখানে দেখাবে</p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {gifts.map((gift, i) => (
              <motion.div key={gift.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`glass-card rounded-2xl overflow-hidden ${gift.claimed ? "opacity-60" : ""}`}
              >
                <div className={`h-1 ${gift.claimed ? "bg-white/20" : "bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500"}`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        gift.claimed ? "bg-white/5" : "bg-purple-500/20"
                      }`}>
                        {gift.claimed
                          ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                          : <Gift className="w-5 h-5 text-purple-400" />
                        }
                      </div>
                      <div>
                        <p className="font-bold text-sm">{gift.message || "Admin Gift"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {gift.sentAt ? formatDistanceToNow(gift.sentAt, { addSuffix: true }) : ""}
                        </p>
                      </div>
                    </div>
                    <Badge className={`shrink-0 ${
                      gift.claimed
                        ? "bg-white/10 text-muted-foreground"
                        : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                    }`}>
                      {gift.claimed ? "Claimed" : "নতুন"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-bold text-yellow-400">{gift.coins} Coins</span>
                    </div>
                    {!gift.claimed ? (
                      <GlowButton size="sm" glowColor="purple" className="h-8 px-4 text-xs"
                        onClick={() => startClaim(gift.id)} disabled={claiming}>
                        🎁 Ad দেখে Claim করুন
                      </GlowButton>
                    ) : (
                      <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />Claimed
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
