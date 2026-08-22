import { motion } from "framer-motion";
import {
  Users, Activity, CreditCard, Wallet, BookOpen,
  Trophy, Target, Crown, Coins, Zap, TrendingUp
} from "lucide-react";

interface Props {
  users: any[];
  tasks: any[];
  missions: any[];
  courses: any[];
  exams: any[];
  pendingPayments: number;
  pendingWithdraws: number;
  pendingMemberships: number;
}

function Stat({ label, value, icon: Icon, color, alert }: {
  label: string; value: number | string; icon: any; color: string; alert?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-4 rounded-2xl border border-white/10 relative"
    >
      {alert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </motion.div>
  );
}

export default function DashboardSection({ users, tasks, missions, courses, exams, pendingPayments, pendingWithdraws, pendingMemberships }: Props) {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const onlineUsers = users.filter(u => u.lastActive && u.lastActive > fiveMinAgo).length;
  const totalCoins = users.reduce((s, u) => s + (u.coins || 0), 0);
  const totalXP = users.reduce((s, u) => s + (u.xp || 0), 0);
  const bannedUsers = users.filter(u => u.banned).length;
  const premiumUsers = users.filter(u => u.membership && u.membership !== "free").length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold mb-1">Overview</h2>
        <p className="text-xs text-muted-foreground">Real-time stats from Firebase Realtime Database</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total Users" value={users.length} icon={Users} color="bg-blue-500" />
        <Stat label="Online Now" value={onlineUsers} icon={Activity} color="bg-green-500" />
        <Stat label="Pending Payments" value={pendingPayments} icon={CreditCard} color="bg-yellow-500" alert={pendingPayments > 0} />
        <Stat label="Pending Withdrawals" value={pendingWithdraws} icon={Wallet} color="bg-red-500" alert={pendingWithdraws > 0} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Active Tasks" value={tasks.length} icon={Target} color="bg-violet-500" />
        <Stat label="Daily Missions" value={missions.length} icon={TrendingUp} color="bg-cyan-500" />
        <Stat label="Courses" value={courses.length} icon={BookOpen} color="bg-emerald-500" />
        <Stat label="Live Exams" value={exams.length} icon={Trophy} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Premium Members" value={premiumUsers} icon={Crown} color="bg-purple-500" />
        <Stat label="Pending Plans" value={pendingMemberships} icon={Crown} color="bg-indigo-500" alert={pendingMemberships > 0} />
        <Stat label="Total Coins" value={totalCoins.toLocaleString()} icon={Coins} color="bg-yellow-600" />
        <Stat label="Total XP" value={totalXP.toLocaleString()} icon={Zap} color="bg-blue-600" />
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass-card p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">User Roles Breakdown</p>
          <div className="space-y-2">
            {(["owner","super_admin","admin","moderator","student"] as const).map(role => {
              const count = users.filter(u => u.role === role).length;
              if (count === 0) return null;
              const pct = users.length ? Math.round((count / users.length) * 100) : 0;
              const colors: Record<string, string> = {
                owner: "bg-yellow-500", super_admin: "bg-purple-500",
                admin: "bg-blue-500", moderator: "bg-cyan-500", student: "bg-green-500"
              };
              return (
                <div key={role}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize">{role.replace("_", " ")}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[role]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">Membership Breakdown</p>
          <div className="space-y-2">
            {(["free","silver","gold","platinum"] as const).map(tier => {
              const count = users.filter(u => (u.membership || "free") === tier).length;
              const pct = users.length ? Math.round((count / users.length) * 100) : 0;
              const colors: Record<string, string> = { free: "bg-gray-500", silver: "bg-slate-400", gold: "bg-yellow-500", platinum: "bg-purple-500" };
              return (
                <div key={tier}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize">{tier}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[tier]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {bannedUsers > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-red-500/20 bg-red-500/5">
          <p className="text-sm font-semibold text-red-400">⚠️ {bannedUsers} banned user{bannedUsers > 1 ? "s" : ""} on platform</p>
          <p className="text-xs text-muted-foreground mt-0.5">Go to Users section to review them.</p>
        </div>
      )}
    </div>
  );
}
