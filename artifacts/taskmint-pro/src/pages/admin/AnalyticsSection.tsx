import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Coins, Zap } from "lucide-react";

const CARD = "glass-card p-4 rounded-2xl border border-white/10";
const COLORS = ["#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#3b82f6"];

export default function AnalyticsSection({ users, exams, courses, tasks }: {
  users: any[]; exams: any[]; courses: any[]; tasks: any[];
}) {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const stats = useMemo(() => ({
    online: users.filter(u => u.lastActive && u.lastActive > fiveMinAgo).length,
    today: users.filter(u => u.lastActive && u.lastActive > oneDayAgo).length,
    thisWeek: users.filter(u => u.lastActive && u.lastActive > oneWeekAgo).length,
    newThisWeek: users.filter(u => u.createdAt && u.createdAt > oneWeekAgo).length,
    totalCoins: users.reduce((s, u) => s + (u.coins || 0), 0),
    totalXP: users.reduce((s, u) => s + (u.xp || 0), 0),
    avgCoins: users.length ? Math.round(users.reduce((s, u) => s + (u.coins || 0), 0) / users.length) : 0,
    avgXP: users.length ? Math.round(users.reduce((s, u) => s + (u.xp || 0), 0) / users.length) : 0,
    banned: users.filter(u => u.banned).length,
    verified: users.filter(u => u.verified).length,
    premium: users.filter(u => u.membership && u.membership !== "free").length,
  }), [users]);

  // Role distribution for pie chart
  const roleData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.role || "student"] = (counts[u.role || "student"] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [users]);

  // Activity bar chart — users active per day bucket (last 7 days)
  const activityData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString("en", { weekday: "short" });
      const start = new Date(d).setHours(0, 0, 0, 0);
      const end = start + 24 * 60 * 60 * 1000;
      const active = users.filter(u => u.lastActive && u.lastActive >= start && u.lastActive < end).length;
      return { day: label, active };
    });
    return days;
  }, [users]);

  // Membership breakdown
  const membershipData = useMemo(() => {
    const counts: Record<string, number> = { free: 0, silver: 0, gold: 0, platinum: 0 };
    users.forEach(u => { const m = u.membership || "free"; if (m in counts) counts[m]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold mb-1">Analytics</h2>
        <p className="text-xs text-muted-foreground">Live data from Firebase — {users.length} total users</p>
      </div>

      {/* Activity summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Online Now", value: stats.online, icon: Users, color: "bg-green-500" },
          { label: "Active Today", value: stats.today, icon: TrendingUp, color: "bg-blue-500" },
          { label: "This Week", value: stats.thisWeek, icon: Users, color: "bg-violet-500" },
          { label: "New This Week", value: stats.newThisWeek, icon: Users, color: "bg-cyan-500" },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={CARD}>
            <div className={`w-8 h-8 rounded-xl ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-extrabold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Economy stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Coins", value: stats.totalCoins.toLocaleString(), icon: Coins, color: "bg-yellow-500" },
          { label: "Avg Coins/User", value: stats.avgCoins, icon: Coins, color: "bg-yellow-700" },
          { label: "Total XP", value: stats.totalXP.toLocaleString(), icon: Zap, color: "bg-blue-500" },
          { label: "Premium Members", value: stats.premium, icon: Users, color: "bg-purple-500" },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={CARD}>
            <div className={`w-8 h-8 rounded-xl ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-extrabold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Activity chart */}
      <div className={CARD}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Daily Active Users (last 7 days)</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }} />
            <Bar dataKey="active" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={CARD}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Role Distribution</p>
          <div className="flex items-center gap-4">
            <PieChart width={100} height={100}>
              <Pie data={roleData} cx={50} cy={50} innerRadius={25} outerRadius={48} dataKey="value">
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-1.5">
              {roleData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="capitalize text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={CARD}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Membership Tiers</p>
          <div className="flex items-center gap-4">
            <PieChart width={100} height={100}>
              <Pie data={membershipData} cx={50} cy={50} innerRadius={25} outerRadius={48} dataKey="value">
                {membershipData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-1.5">
              {membershipData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="capitalize text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Platform health */}
      <div className={CARD}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Platform Health</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-extrabold text-green-400">{stats.verified}</p>
            <p className="text-[10px] text-muted-foreground">Verified Users</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-red-400">{stats.banned}</p>
            <p className="text-[10px] text-muted-foreground">Banned Users</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-amber-400">{exams.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Exams</p>
          </div>
        </div>
      </div>
    </div>
  );
}
