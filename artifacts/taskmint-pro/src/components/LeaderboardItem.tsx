import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardItemProps {
  rank: number;
  name: string;
  photoURL?: string;
  coins: number;
  xp: number;
  isCurrentUser?: boolean;
}

export function LeaderboardItem({ rank, name, photoURL, coins, xp, isCurrentUser }: LeaderboardItemProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl glass-card transition-all",
        isCurrentUser && "ring-1 ring-primary bg-primary/10 glow-purple"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
        rank === 1 ? "bg-yellow-500/20 text-yellow-500" : 
        rank === 2 ? "bg-slate-300/20 text-slate-300" :
        rank === 3 ? "bg-amber-600/20 text-amber-600" :
        "bg-white/5 text-muted-foreground"
      )}>
        {rank}
      </div>
      
      <Avatar className="w-10 h-10 border border-white/10">
        <AvatarImage src={photoURL} />
        <AvatarFallback>{name?.charAt(0) || "U"}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm truncate">{name || "Anonymous User"}</h4>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-yellow-500" /> {coins}</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> {xp} XP</span>
        </div>
      </div>
    </motion.div>
  );
}
