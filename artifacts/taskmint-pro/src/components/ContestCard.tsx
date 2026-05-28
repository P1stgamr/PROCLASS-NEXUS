import { motion } from "framer-motion";
import { Trophy, Clock, Users } from "lucide-react";
import { GlowButton } from "./GlowButton";
import { cn } from "@/lib/utils";

interface ContestCardProps {
  title: string;
  description: string;
  prize: number;
  participants: number;
  endTime?: number;
  onJoin?: () => void;
  status?: "active" | "upcoming" | "past";
}

export function ContestCard({ title, description, prize, participants, endTime, onJoin, status = "active" }: ContestCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="glass-card p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden"
    >
      {status === "active" && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
      )}
      
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground uppercase font-medium">Prize Pool</span>
          <span className="font-bold text-yellow-500 flex items-center gap-1"><Trophy className="w-4 h-4" /> {prize}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/10">
        <div className="flex gap-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{participants} joined</span>
          </div>
          {status === "active" && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Clock className="w-3 h-3" />
              <span>Ends soon</span>
            </div>
          )}
        </div>
        
        {status === "active" && (
          <GlowButton size="sm" onClick={onJoin} className="h-8 text-xs px-4">
            Join Now
          </GlowButton>
        )}
      </div>
    </motion.div>
  );
}
