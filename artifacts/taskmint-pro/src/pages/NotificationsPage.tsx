import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ref, onValue, off, update } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { NotificationItem } from "@/components/NotificationItem";
import { SkeletonCard } from "@/components/SkeletonCard";
import { GlowButton } from "@/components/GlowButton";
import { Bell, CheckCheck } from "lucide-react";


export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const dbRef = ref(db, `notifications/${currentUser.uid}`);
    const unsub = onValue(dbRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        arr.sort((a: any, b: any) => b.timestamp - a.timestamp);
        setNotifs(arr);
      } else {
        setNotifs([]);
      }
      setLoading(false);
    });
    return () => off(dbRef);
  }, [currentUser]);

  const markAsRead = async (id: string) => {
    if (!currentUser) return;
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    try {
      await update(ref(db, `notifications/${currentUser.uid}/${id}`), { read: true });
    } catch {}
  };

  const markAllRead = async () => {
    if (!currentUser) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const updates: Record<string, boolean> = {};
      notifs.forEach((n) => { updates[`notifications/${currentUser.uid}/${n.id}/read`] = true; });
      await update(ref(db), updates);
    } catch {}
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-primary font-medium">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
              data-testid="btn-mark-all-read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-4 max-w-md mx-auto">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-8 h-8 text-primary/50" />
            </div>
            <div>
              <p className="font-semibold">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">No new notifications right now.</p>
            </div>
          </div>
        ) : (
          <motion.div
            className="space-y-1"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {notifs.map((n) => (
              <NotificationItem
                key={n.id}
                type={n.type}
                message={n.message}
                timestamp={n.timestamp}
                read={n.read}
                onClick={() => markAsRead(n.id)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
