import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { NotificationItem } from "@/components/NotificationItem";
import { SkeletonCard } from "@/components/SkeletonCard";
import { GlowButton } from "@/components/GlowButton";
import { Bell, CheckCheck } from "lucide-react";


export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setNotifs([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const dbRef = ref(db, `notifications/${currentUser.uid}`);
    const unsubscribe = onValue(dbRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        arr.sort((a: any, b: any) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
        setNotifs(arr);
      } else {
        setNotifs([]);
      }
      setLoading(false);
    }, (error) => {
      setNotifs([]);
      setLoadError(error.message || "Could not load notifications.");
      setLoading(false);
    });
    return unsubscribe;
  }, [currentUser, reloadKey]);

  const markAsRead = async (id: string) => {
    if (!currentUser) return;
    const previous = notifs;
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    try {
      await update(ref(db, `notifications/${currentUser.uid}/${id}`), { read: true });
    } catch (error: any) {
      setNotifs(previous);
      toast({
        title: "Could not mark notification as read",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const markAllRead = async () => {
    if (!currentUser) return;
    const previous = notifs;
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const updates: Record<string, boolean> = {};
      notifs.forEach((n) => { updates[`notifications/${currentUser.uid}/${n.id}/read`] = true; });
      await update(ref(db), updates);
    } catch (error: any) {
      setNotifs(previous);
      toast({
        title: "Could not mark notifications as read",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
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
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <p className="font-semibold">Notifications could not load</p>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <GlowButton onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </GlowButton>
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
