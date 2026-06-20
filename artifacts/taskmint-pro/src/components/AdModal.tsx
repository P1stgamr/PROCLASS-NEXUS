import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, ExternalLink, Zap } from "lucide-react";
import { GlowButton } from "@/components/GlowButton";

const ADS = [
  {
    brand: "Robi",
    tagline: "Bangladesh-এর সেরা 4G নেটওয়ার্ক",
    color: "from-red-600 to-red-800",
    logo: "R",
    logoColor: "bg-red-500",
    cta: "আরো জানুন",
  },
  {
    brand: "Grameenphone",
    tagline: "শিক্ষার্থীদের জন্য বিশেষ ইন্টারনেট প্যাকেজ",
    color: "from-blue-600 to-blue-800",
    logo: "GP",
    logoColor: "bg-blue-500",
    cta: "অফার দেখুন",
  },
  {
    brand: "bKash",
    tagline: "Send money instantly — bKash করুন",
    color: "from-pink-600 to-pink-800",
    logo: "b",
    logoColor: "bg-pink-500",
    cta: "Download করুন",
  },
];

interface AdModalProps {
  open: boolean;
  onComplete: () => void;
  onClose?: () => void;
  skipAllowed?: boolean;
  title?: string;
}

export function AdModal({ open, onComplete, onClose, skipAllowed = false, title = "Ad দেখুন — তারপর শুরু হবে" }: AdModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(skipAllowed);
  const [adDone, setAdDone] = useState(false);
  const [ad] = useState(() => ADS[Math.floor(Math.random() * ADS.length)]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      setCanSkip(skipAllowed);
      setAdDone(false);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          setCanSkip(true);
          setAdDone(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Header bar */}
            <div className="bg-black/60 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-semibold border border-yellow-500/30">
                  AD
                </span>
                <p className="text-xs text-muted-foreground truncate">{title}</p>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                {!canSkip ? (
                  <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">
                    {countdown}s
                  </span>
                ) : null}
              </div>
            </div>

            {/* Ad content */}
            <div className={`bg-gradient-to-br ${ad.color} p-8 text-center space-y-4`}>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`w-20 h-20 ${ad.logoColor} rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-extrabold shadow-xl`}
              >
                {ad.logo}
              </motion.div>
              <div>
                <h2 className="text-2xl font-extrabold text-white">{ad.brand}</h2>
                <p className="text-white/80 text-sm mt-1">{ad.tagline}</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-white/60 mx-auto hover:text-white transition-colors">
                <ExternalLink className="w-3 h-3" />{ad.cta}
              </button>
            </div>

            {/* Footer */}
            <div className="bg-black/60 px-4 py-4 space-y-3">
              {adDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2"
                >
                  <Zap className="w-4 h-4 text-green-400" />
                  <p className="text-xs text-green-400 font-medium">Ad দেখা শেষ! এগিয়ে যান</p>
                </motion.div>
              )}

              <div className="flex gap-2">
                {canSkip ? (
                  <GlowButton className="flex-1 h-10 text-sm" onClick={onComplete}>
                    {adDone ? "Continue করুন →" : "Skip করুন →"}
                  </GlowButton>
                ) : (
                  <div className="flex-1 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs text-muted-foreground border border-white/10">
                    {countdown}s পরে continue করতে পারবেন
                  </div>
                )}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
