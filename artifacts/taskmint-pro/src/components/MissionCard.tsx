import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MissionCardProps {
  title: string;
  reward: number;
  progress: number;
  total: number;
  isCompleted?: boolean;
}

export function MissionCard({ title, reward, progress, total, isCompleted }: MissionCardProps) {
  const percentage = Math.min(100, Math.round((progress / total) * 100));

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className={cn(
        "glass-card p-4 rounded-xl relative overflow-hidden transition-all",
        isCompleted && "ring-1 ring-primary/50 bg-primary/5"
      )}
    >
      <div className="flex gap-3 items-center mb-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isCompleted ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground"
        )}>
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h4 className={cn("font-medium text-sm", isCompleted && "text-primary/90")}>{title}</h4>
          <p className="text-xs text-yellow-500 font-medium mt-0.5">+{reward} Coins</p>
        </div>
        <div className="text-xs font-bold font-mono">
          {progress}/{total}
        </div>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </motion.div>
  );
}
