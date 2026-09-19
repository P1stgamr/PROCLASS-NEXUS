import { useEffect, useState } from "react";
import { onValue, off, ref } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { AdModal } from "@/components/AdModal";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Eye, Zap } from "lucide-react";

export function WatchAdTasks() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [target, setTarget] = useState<any | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const taskRef = ref(db, "adTasks");
    const progressRef = ref(db, `adTaskProgress/${currentUser.uid}`);
    const unsubTasks = onValue(taskRef, snap => setTasks(
      Object.entries(snap.val() || {}).map(([id, value]) => ({ id, ...(value as any) })).filter(task => task.active !== false),
    ));
    const unsubProgress = onValue(progressRef, snap => setProgress(snap.val() || {}));
    return () => {
      off(taskRef);
      off(progressRef);
      unsubTasks();
      unsubProgress();
    };
  }, [currentUser]);

  if (!tasks.length) return null;

  return (
    <div className="space-y-3">
      <AdModal
        open={!!target}
        placement="watch_task"
        referenceId={target?.id || ""}
        title="Ad দেখুন — coins earn করুন"
        onComplete={(result) => {
          toast({ title: `+${result.rewardCoins || 0} coins যোগ হয়েছে ✅` });
          setTarget(null);
        }}
        onClose={() => setTarget(null)}
      />
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-cyan-400" />
        <h2 className="font-bold text-sm">Watch & Earn</h2>
        <Badge className="ml-auto text-[10px] bg-cyan-500/15 text-cyan-300 border-cyan-500/20">Verified ads</Badge>
      </div>
      {tasks.map(task => {
        const current = Number(progress[task.id]?.watchCount || 0);
        const max = Number(task.maxWatchesPerUser || 1);
        const complete = current >= max;
        return (
          <div key={task.id} className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
              {complete ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Eye className="w-5 h-5 text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{task.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{task.description || "Watch a rewarded ad to earn coins"}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-muted-foreground">{current}/{max} watched</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400"><Zap className="w-3 h-3" />+{task.rewardCoins}</span>
              </div>
            </div>
            <GlowButton size="sm" className="h-8 px-3 text-xs" disabled={complete} onClick={() => setTarget(task)}>
              {complete ? "Done" : "Watch"}
            </GlowButton>
          </div>
        );
      })}
    </div>
  );
}