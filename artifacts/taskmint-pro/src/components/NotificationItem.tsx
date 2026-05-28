import { motion } from "framer-motion";
import { Bell, Coins, Trophy, Zap, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  type: "coin" | "xp" | "system" | "contest" | "message";
  message: string;
  timestamp: number;
  read: boolean;
  onClick?: () => void;
}

export function NotificationItem({ type, message, timestamp, read, onClick }: NotificationItemProps) {
  const getIcon = () => {
    switch (type) {
      case "coin": return <Coins className="w-4 h-4 text-yellow-500" />;
      case "xp": return <Zap className="w-4 h-4 text-primary" />;
      case "contest": return <Trophy className="w-4 h-4 text-amber-500" />;
      case "message": return <MessageSquare className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        "flex gap-4 p-4 rounded-xl cursor-pointer transition-colors",
        read ? "bg-transparent hover:bg-white/5" : "glass-card bg-primary/5"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
        "bg-white/5 border border-white/10"
      )}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className={cn("text-sm", !read && "font-medium text-white")}>
          {message}
        </p>
        <span className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
      </div>
      {!read && (
        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 glow-purple" />
      )}
    </motion.div>
  );
}
