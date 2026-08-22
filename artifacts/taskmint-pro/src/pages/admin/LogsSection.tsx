import { useState, useEffect } from "react";
import { ref, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { db } from "@/firebase";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ClipboardList } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CARD = "glass-card p-3 rounded-2xl border border-white/10";

const actionColors: Record<string, string> = {
  "user.ban": "bg-red-500/20 text-red-400",
  "user.unban": "bg-green-500/20 text-green-400",
  "user.promote": "bg-purple-500/20 text-purple-400",
  "user.demote": "bg-orange-500/20 text-orange-400",
  "user.verify": "bg-blue-500/20 text-blue-400",
  "user.edit": "bg-gray-500/20 text-gray-400",
  "user.suspend": "bg-orange-500/20 text-orange-400",
  "exam.create": "bg-cyan-500/20 text-cyan-400",
  "exam.edit": "bg-cyan-500/20 text-cyan-400",
  "exam.delete": "bg-red-500/20 text-red-400",
  "exam.publish": "bg-green-500/20 text-green-400",
  "exam.unpublish": "bg-yellow-500/20 text-yellow-400",
  "exam.duplicate": "bg-blue-500/20 text-blue-400",
  "membership.create": "bg-purple-500/20 text-purple-400",
  "membership.edit": "bg-purple-500/20 text-purple-400",
  "membership.delete": "bg-red-500/20 text-red-400",
  "membership.toggle": "bg-yellow-500/20 text-yellow-400",
  "payment.approve": "bg-green-500/20 text-green-400",
  "payment.reject": "bg-red-500/20 text-red-400",
  "withdraw.approve": "bg-green-500/20 text-green-400",
  "withdraw.reject": "bg-red-500/20 text-red-400",
  "notification.send": "bg-blue-500/20 text-blue-400",
  "gift.send": "bg-yellow-500/20 text-yellow-400",
  "settings.update": "bg-gray-500/20 text-gray-300",
};

const actionEmoji: Record<string, string> = {
  "user.ban": "🚫", "user.unban": "✅", "user.promote": "⬆️", "user.demote": "⬇️",
  "user.verify": "✔️", "user.edit": "✏️", "user.suspend": "⏸️",
  "exam.create": "📝", "exam.edit": "✏️", "exam.delete": "🗑️", "exam.publish": "📢",
  "exam.unpublish": "👁️", "exam.duplicate": "📋",
  "membership.create": "👑", "membership.edit": "✏️", "membership.delete": "🗑️", "membership.toggle": "🔄",
  "payment.approve": "✅", "payment.reject": "❌",
  "withdraw.approve": "✅", "withdraw.reject": "❌",
  "notification.send": "🔔", "gift.send": "🎁",
  "settings.update": "⚙️",
};

export default function LogsSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(ref(db, "adminLogs"), orderByChild("timestamp"), limitToLast(200));
    const unsub = onValue(q, snap => {
      const d = snap.val();
      const entries = d ? Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a, b) => b.timestamp - a.timestamp) : [];
      setLogs(entries);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const filtered = search
    ? logs.filter(l =>
        l.action?.includes(search.toLowerCase()) ||
        l.adminName?.toLowerCase().includes(search.toLowerCase()) ||
        l.target?.includes(search) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold mb-1">Activity Logs</h2>
        <p className="text-xs text-muted-foreground">All admin actions logged to Firebase — last 200 entries</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action, admin, or target…" className="pl-8 h-9 bg-white/5 border-white/10 text-sm" />
      </div>

      {loading && <p className="text-center py-8 text-sm text-muted-foreground">Loading logs…</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{search ? "No logs match your search." : "No admin actions logged yet."}</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(log => (
          <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
            <div className="flex items-start gap-2.5">
              <span className="text-lg shrink-0">{actionEmoji[log.action] || "📋"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-[9px] px-1.5 py-0 ${actionColors[log.action] || "bg-gray-500/20 text-gray-400"}`}>{log.action}</Badge>
                  <span className="text-xs font-semibold">{log.adminName || "Admin"}</span>
                  {log.target && <span className="text-[10px] text-muted-foreground font-mono">{log.target.slice(0, 12)}…</span>}
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {log.timestamp ? formatDistanceToNow(log.timestamp, { addSuffix: true }) : ""}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
