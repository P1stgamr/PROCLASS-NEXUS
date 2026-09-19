import { useEffect, useMemo, useState } from "react";
import { onValue, off, push, ref, remove, update } from "firebase/database";
import { db } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GlowButton } from "@/components/GlowButton";
import { useAuth } from "@/context/AuthContext";
import { logAdminAction } from "@/lib/adminLog";
import { Eye, Pause, Play, Plus, Save, Trash2 } from "lucide-react";

const FIELD = "h-9 bg-white/5 border-white/10 text-sm";
const CARD = "glass-card rounded-2xl border border-white/10 p-4";
const placements = [
  ["gift_claim", "Gift claims"],
  ["quiz_unlock", "Free quizzes"],
  ["exam_unlock", "Free exams"],
  ["watch_task", "Watch-ad tasks"],
] as const;

export default function AdsSection() {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>({
    enabled: false,
    dailyCap: 5,
    adUnitIds: {},
    placements: Object.fromEntries(placements.map(([id]) => [id, true])),
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [newTask, setNewTask] = useState({ title: "", description: "", rewardCoins: "10", maxWatchesPerUser: "1" });

  useEffect(() => {
    const settingsRef = ref(db, "settings/ads");
    const tasksRef = ref(db, "adTasks");
    const statsRef = ref(db, "adStats");
    const unsubSettings = onValue(settingsRef, snap => setSettings((prev: any) => ({
      ...prev,
      ...(snap.val() || {}),
      adUnitIds: snap.val()?.adUnitIds || {},
      placements: { ...prev.placements, ...(snap.val()?.placements || {}) },
    })));
    const unsubTasks = onValue(tasksRef, snap => setTasks(Object.entries(snap.val() || {}).map(([id, value]) => ({ id, ...(value as any) }))));
    const unsubStats = onValue(statsRef, snap => setStats(snap.val() || {}));
    return () => {
      off(settingsRef);
      off(tasksRef);
      off(statsRef);
      unsubSettings();
      unsubTasks();
      unsubStats();
    };
  }, []);

  const aggregate = useMemo(() => {
    let watches = 0;
    let coins = 0;
    Object.values(stats).forEach((byDate: any) => Object.values(byDate || {}).forEach((day: any) => {
      watches += Number(day?.count || 0);
      Object.values(day?.events || {}).forEach((event: any) => { coins += Number(event?.rewardCoins || 0); });
    }));
    return { watches, coins };
  }, [stats]);

  const saveSettings = async () => {
    await update(ref(db, "settings/ads"), {
      enabled: settings.enabled === true,
      dailyCap: Math.max(1, Math.min(100, Number(settings.dailyCap) || 1)),
      adUnitIds: settings.adUnitIds || {},
      placements: settings.placements || {},
      updatedAt: Date.now(),
      updatedBy: currentUser?.uid || null,
    });
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "ads.settings.update");
    toast({ title: "Ad settings saved ✅" });
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    await push(ref(db, "adTasks"), {
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      rewardCoins: Math.max(1, Number(newTask.rewardCoins) || 1),
      maxWatchesPerUser: Math.max(1, Number(newTask.maxWatchesPerUser) || 1),
      active: true,
      createdAt: Date.now(),
      createdBy: currentUser?.uid || null,
    });
    setNewTask({ title: "", description: "", rewardCoins: "10", maxWatchesPerUser: "1" });
    toast({ title: "Watch-ad task created ✅" });
  };

  const editTask = async (task: any) => {
    await update(ref(db, `adTasks/${task.id}`), {
      title: task.title,
      description: task.description || "",
      rewardCoins: Math.max(1, Number(task.rewardCoins) || 1),
      maxWatchesPerUser: Math.max(1, Number(task.maxWatchesPerUser) || 1),
      active: task.active !== false,
      updatedAt: Date.now(),
    });
    toast({ title: "Task updated ✅" });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold">Ads & Rewards</h2>
        <p className="text-xs text-muted-foreground mt-1">Configure real rewarded ads, feature gates, watch tasks, and the global daily cap.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={CARD}><Eye className="w-4 h-4 text-cyan-400" /><p className="text-2xl font-extrabold mt-2">{aggregate.watches}</p><p className="text-xs text-muted-foreground">Verified watches</p></div>
        <div className={CARD}><span className="text-lg">🪙</span><p className="text-2xl font-extrabold mt-2">{aggregate.coins}</p><p className="text-xs text-muted-foreground">Coins from watch tasks</p></div>
      </div>

      <div className={CARD + " space-y-4"}>
        <div className="flex items-center justify-between">
          <div><h3 className="font-bold text-sm">Global ad controls</h3><p className="text-xs text-muted-foreground">Disabled until a Google ad unit is configured.</p></div>
          <button onClick={() => setSettings((s: any) => ({ ...s, enabled: !s.enabled }))} className={`w-11 h-6 rounded-full p-1 transition-colors ${settings.enabled ? "bg-green-500" : "bg-white/15"}`}>
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${settings.enabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Daily cap per user (all placements combined)</Label>
          <Input type="number" min={1} max={100} value={settings.dailyCap} onChange={e => setSettings((s: any) => ({ ...s, dailyCap: e.target.value }))} className={FIELD + " mt-1"} />
        </div>
        <div className="space-y-2">
          {placements.map(([id, label]) => (
            <div key={id} className="grid grid-cols-[1fr_1.4fr_auto] gap-2 items-center">
              <label className="text-xs">{label}</label>
              <Input value={settings.adUnitIds?.[id] || ""} placeholder="/1234567/rewarded" onChange={e => setSettings((s: any) => ({ ...s, adUnitIds: { ...s.adUnitIds, [id]: e.target.value } }))} className={FIELD} />
              <button onClick={() => setSettings((s: any) => ({ ...s, placements: { ...s.placements, [id]: s.placements?.[id] === false } }))} className={`p-2 rounded-lg ${settings.placements?.[id] === false ? "text-muted-foreground bg-white/5" : "text-green-400 bg-green-500/10"}`} title="Toggle placement">
                {settings.placements?.[id] === false ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
        <GlowButton className="w-full h-9 text-sm" onClick={saveSettings}><Save className="w-3.5 h-3.5 mr-1" />Save ad settings</GlowButton>
      </div>

      <div className={CARD + " space-y-3"}>
        <h3 className="font-bold text-sm">New watch-ad task</h3>
        <Input value={newTask.title} onChange={e => setNewTask(s => ({ ...s, title: e.target.value }))} placeholder="Task title *" className={FIELD} />
        <Input value={newTask.description} onChange={e => setNewTask(s => ({ ...s, description: e.target.value }))} placeholder="Description" className={FIELD} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" value={newTask.rewardCoins} onChange={e => setNewTask(s => ({ ...s, rewardCoins: e.target.value }))} placeholder="Coins" className={FIELD} />
          <Input type="number" value={newTask.maxWatchesPerUser} onChange={e => setNewTask(s => ({ ...s, maxWatchesPerUser: e.target.value }))} placeholder="Max/user" className={FIELD} />
        </div>
        <GlowButton className="w-full h-9 text-sm" onClick={createTask}><Plus className="w-3.5 h-3.5 mr-1" />Create watch task</GlowButton>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className={CARD + " flex items-center gap-3"}>
            <div className="flex-1 min-w-0">
              <Input value={task.title || ""} onChange={e => setTasks(all => all.map(t => t.id === task.id ? { ...t, title: e.target.value } : t))} className={FIELD} />
              <Input value={task.description || ""} onChange={e => setTasks(all => all.map(t => t.id === task.id ? { ...t, description: e.target.value } : t))} placeholder="Description" className={FIELD + " mt-2"} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input type="number" value={task.rewardCoins ?? 1} onChange={e => setTasks(all => all.map(t => t.id === task.id ? { ...t, rewardCoins: e.target.value } : t))} className={FIELD} aria-label="Reward coins" />
                <Input type="number" value={task.maxWatchesPerUser ?? 1} onChange={e => setTasks(all => all.map(t => t.id === task.id ? { ...t, maxWatchesPerUser: e.target.value } : t))} className={FIELD} aria-label="Maximum watches per user" />
              </div>
              <div className="flex gap-2 mt-2">
                <Badge className="text-[10px] bg-yellow-500/15 text-yellow-400">+{task.rewardCoins} 🪙</Badge>
                <Badge className="text-[10px] bg-white/10 text-muted-foreground">max {task.maxWatchesPerUser}/user</Badge>
                <Badge className={`text-[10px] ${task.active === false ? "bg-white/10" : "bg-green-500/15 text-green-400"}`}>{task.active === false ? "Paused" : "Active"}</Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => editTask(task)} className="p-2 rounded-lg bg-primary/10 text-primary" title="Save task"><Save className="w-3.5 h-3.5" /></button>
              <button onClick={() => update(ref(db, `adTasks/${task.id}`), { active: task.active === false })} className="p-2 rounded-lg bg-white/5 text-muted-foreground" title="Toggle task"><Pause className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(ref(db, `adTasks/${task.id}`))} className="p-2 rounded-lg bg-red-500/10 text-red-400" title="Delete task"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {!tasks.length && <p className="text-center py-5 text-sm text-muted-foreground">No watch-ad tasks yet.</p>}
      </div>
    </div>
  );
}