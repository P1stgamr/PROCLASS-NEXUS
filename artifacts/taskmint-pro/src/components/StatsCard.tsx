import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatsCard({ title, value, icon, trend, trendUp, className }: StatsCardProps) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={cn("glass-card p-4 rounded-2xl flex flex-col gap-2", className)}
    >
      <div className="flex justify-between items-center text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
        <div className="p-2 rounded-lg bg-white/5 text-primary">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        {trend && (
          <span className={cn("text-xs font-medium mb-1", trendUp ? "text-green-400" : "text-red-400")}>
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}
