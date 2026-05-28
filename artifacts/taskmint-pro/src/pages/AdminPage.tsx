import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ref, onValue, off, update, remove } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { SkeletonCard } from "@/components/SkeletonCard";
import { GlowButton } from "@/components/GlowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, BarChart3, Bell, FileCheck, ArrowLeft, Trash2 } from "lucide-react";

export default function AdminPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifMsg, setNotifMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (userProfile?.role !== "admin") { setLocation("/home"); return; }
    const usersRef = ref(db, "users");
    const unsub1 = onValue(usersRef, (snap) => {
      const data = snap.val();
      if (data) setUsers(Object.values(data) as any[]);
      setLoading(false);
    });
    const tasksRef = ref(db, "tasks");
    const unsub2 = onValue(tasksRef, (snap) => {
      const data = snap.val();
      if (data) {
        setTasks(Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v })));
      }
    });
    return () => { off(usersRef); off(tasksRef); };
  }, [userProfile, setLocation]);

  const banUser = async (uid: string) => {
    await update(ref(db, `users/${uid}`), { banned: true });
    toast({ title: "User banned." });
  };

  const approveTask = async (id: string) => {
    await update(ref(db, `tasks/${id}`), { status: "published" });
    toast({ title: "Task approved and published." });
  };

  const deleteTask = async (id: string) => {
    await remove(ref(db, `tasks/${id}`));
    toast({ title: "Task deleted." });
  };

  const sendNotification = async () => {
    if (!notifMsg.trim()) return;
    setSending(true);
    try {
      const updates: Record<string, any> = {};
      users.forEach((u) => {
        const key = Date.now();
        updates[`notifications/${u.uid}/${key}`] = {
          type: "system",
          message: notifMsg,
          timestamp: key,
          read: false,
        };
      });
      await update(ref(db), updates);
      toast({ title: "Notification sent to all users." });
      setNotifMsg("");
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const stats = [
    { label: "Total Users", value: users.length, icon: Users },
    { label: "Tasks", value: tasks.length, icon: FileCheck },
    { label: "Pending", value: tasks.filter((t) => t.status !== "published").length, icon: BarChart3 },
    { label: "Admins", value: users.filter((u) => u.role === "admin").length, icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/home")} className="p-2 rounded-xl hover:bg-white/10 transition-colors" data-testid="btn-admin-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-400" />
              <h1 className="text-xl font-extrabold tracking-tight">Admin Panel</h1>
            </div>
          </div>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Admin</Badge>
        </div>
      </div>

      <div className="px-5 py-5 max-w-2xl mx-auto space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-4 rounded-2xl">
              <s.icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="notify">Notify</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-2">
            {loading ? (
              [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            ) : (
              users.map((u) => (
                <motion.div
                  key={u.uid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 glass-card p-4 rounded-xl"
                  data-testid={`admin-user-${u.uid}`}
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={u.photoURL} />
                    <AvatarFallback>{u.name?.charAt(0) || "S"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={u.role === "admin" ? "bg-red-500/20 text-red-400 border-red-500/30 text-xs" : "bg-white/5 text-muted-foreground text-xs"}>
                      {u.role || "student"}
                    </Badge>
                    {u.uid !== currentUser?.uid && !u.banned && (
                      <button
                        onClick={() => banUser(u.uid)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors text-muted-foreground hover:text-red-400"
                        data-testid={`btn-ban-${u.uid}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {u.banned && <Badge className="bg-red-800/20 text-red-600 text-xs">Banned</Badge>}
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="content" className="mt-4 space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No content to moderate.</div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 glass-card p-4 rounded-xl" data-testid={`admin-task-${task.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.uploaderName} · {task.category}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={task.status === "published" ? "bg-green-500/20 text-green-400 text-xs" : "bg-yellow-500/20 text-yellow-400 text-xs"}>
                      {task.status || "draft"}
                    </Badge>
                    {task.status !== "published" && (
                      <button onClick={() => approveTask(task.id)} className="text-xs text-green-400 hover:text-green-300 transition-colors" data-testid={`btn-approve-${task.id}`}>
                        Approve
                      </button>
                    )}
                    <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors" data-testid={`btn-delete-task-${task.id}`}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="notify" className="mt-4 space-y-4">
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Send Notification to All Users</h3>
              </div>
              <Input
                value={notifMsg}
                onChange={(e) => setNotifMsg(e.target.value)}
                placeholder="Notification message..."
                className="h-12 bg-white/5 border-white/10"
                data-testid="input-notification-message"
              />
              <GlowButton
                className="w-full h-10"
                onClick={sendNotification}
                disabled={!notifMsg.trim() || sending}
                data-testid="btn-send-notification"
              >
                {sending ? "Sending..." : `Send to ${users.length} users`}
              </GlowButton>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
