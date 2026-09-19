import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  completeRewardedAdSession,
  createRewardedAdSession,
  type RewardedAdPlacement,
  type RewardedAdResult,
} from "@/lib/rewardedAds";

type GPT = {
  cmd: Array<() => void>;
  defineOutOfPageSlot: (unit: string, format: unknown) => any;
  destroySlots: (slots?: any[]) => void;
  display: (slot: any) => void;
  pubads: () => any;
  enums: { OutOfPageFormat: { REWARDED: unknown } };
};

declare global {
  interface Window {
    googletag?: GPT;
  }
}

interface AdModalProps {
  open: boolean;
  placement: RewardedAdPlacement;
  referenceId: string;
  onComplete: (result: RewardedAdResult) => void;
  onClose?: () => void;
  title?: string;
}

let gptLoader: Promise<GPT> | null = null;

function loadGooglePublisherTag() {
  if (window.googletag) return Promise.resolve(window.googletag);
  if (gptLoader) return gptLoader;
  gptLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-taskmint-gpt]");
    const finish = () => {
      window.googletag = window.googletag || ({ cmd: [] } as unknown as GPT);
      resolve(window.googletag);
    };
    if (existing) {
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () => reject(new Error("Google Publisher Tag could not load")));
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    script.dataset.taskmintGpt = "true";
    script.onload = finish;
    script.onerror = () => reject(new Error("Google Publisher Tag could not load"));
    document.head.appendChild(script);
  });
  return gptLoader;
}

export function AdModal({
  open,
  placement,
  referenceId,
  onComplete,
  onClose,
  title = "Ad দেখুন — তারপর এগিয়ে যান",
}: AdModalProps) {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<"preparing" | "ready" | "showing" | "completing" | "error">("preparing");
  const [error, setError] = useState("");
  const sessionRef = useRef<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!open || !currentUser) return;
    const user = currentUser;
    let disposed = false;
    let slot: any = null;

    async function showRewardedAd() {
      try {
        setStatus("preparing");
        setError("");
        handledRef.current = false;
        const session = await createRewardedAdSession(user, placement, referenceId);
        if (disposed) return;
        sessionRef.current = session.sessionId;
        const googletag = await loadGooglePublisherTag();
        googletag.cmd = googletag.cmd || [];
        googletag.cmd.push(() => {
          slot = googletag.defineOutOfPageSlot(
            session.adUnitId,
            googletag.enums.OutOfPageFormat.REWARDED,
          );
          if (!slot) throw new Error("This ad unit does not support rewarded ads");
          slot.addService(googletag.pubads());
          const pubads = googletag.pubads();
          const ready = (event: any) => {
            if (event.slot !== slot || disposed) return;
            setStatus("ready");
            event.makeRewardedVisible();
            setStatus("showing");
          };
          const granted = async (event: any) => {
            if (event.slot !== slot || handledRef.current || disposed) return;
            handledRef.current = true;
            setStatus("completing");
            try {
              const result = await completeRewardedAdSession(
                user,
                session.sessionId,
                `gpt:${session.sessionId}:${Date.now()}`,
              );
              if (!disposed) onComplete(result);
            } catch (completionError: any) {
              if (!disposed) {
                setStatus("error");
                setError(completionError.message || "Ad completion could not be verified");
              }
            }
          };
          const closed = (event: any) => {
            if (event.slot !== slot || handledRef.current || disposed) return;
            setStatus("error");
            setError("Ad বন্ধ করা হয়েছে। Reward পেতে পুরো Ad দেখতে হবে।");
          };
          pubads.addEventListener("rewardedSlotReady", ready);
          pubads.addEventListener("rewardedSlotGranted", granted);
          pubads.addEventListener("rewardedSlotClosed", closed);
          googletag.display(slot);
        });
      } catch (showError: any) {
        if (!disposed) {
          setStatus("error");
          setError(showError.message || "Rewarded ad চালু করা যায়নি");
        }
      }
    }

    showRewardedAd();
    return () => {
      disposed = true;
      if (slot && window.googletag) window.googletag.destroySlots([slot]);
      sessionRef.current = null;
    };
  }, [open, currentUser, placement, referenceId, onComplete]);

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
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-sm glass-card rounded-3xl p-5 border border-white/10 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-400 font-bold">Rewarded ad</p>
                <h2 className="font-extrabold mt-1">{title}</h2>
              </div>
              {onClose && (
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 px-4 py-6 text-center">
              {status === "error" ? (
                <>
                  <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
                  <p className="text-sm text-red-300 mt-3">{error}</p>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-9 h-9 mx-auto text-green-400" />
                  <p className="text-sm font-semibold mt-3">
                    {status === "preparing" && "Rewarded ad প্রস্তুত হচ্ছে…"}
                    {status === "ready" && "Ad প্রস্তুত"}
                    {status === "showing" && "Ad দেখুন — শেষ হলে reward পাবেন"}
                    {status === "completing" && "Completion যাচাই হচ্ছে…"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reward শুধু Google Publisher Tag completion callback-এর পর দেওয়া হবে।
                  </p>
                  {status !== "showing" && <Loader2 className="w-4 h-4 mx-auto mt-4 animate-spin text-primary" />}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}