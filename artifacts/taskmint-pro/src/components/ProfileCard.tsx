import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Coins, Zap, Flame } from "lucide-react";

interface ProfileCardProps {
  name: string;
  photoURL?: string | null;
  level: number;
  coins: number;
  xp: number;
  streak: number;
  role?: string;
}

export function ProfileCard({ name, photoURL, level, coins, xp, streak, role }: ProfileCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass-card p-5 rounded-2xl flex items-center gap-4"
    >
      <Avatar className="w-14 h-14 ring-2 ring-primary/30 border border-primary/20">
        <AvatarImage src={photoURL || undefined} />
        <AvatarFallback className="text-xl font-bold bg-primary/20">{name?.charAt(0) || "S"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-sm truncate">{name || "Student"}</h3>
          {role === "admin" && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] py-0">Admin</Badge>
          )}
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] mb-2">
          Level {level}
        </Badge>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-yellow-500" /> {coins}</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> {xp} XP</span>
          <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {streak}d</span>
        </div>
      </div>
    </motion.div>
  );
}
