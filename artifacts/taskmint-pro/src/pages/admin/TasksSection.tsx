import { useState } from "react";
import { motion } from "framer-motion";
import { ref, push, update, remove } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { logAdminAction } from "@/lib/adminLog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GlowButton } from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Save, X, Target, BookOpen, Code2 } from "lucide-react";

const FIELD = "h-9 bg-white/5 border-white/10 text-sm";
const CARD = "glass-card p-4 rounded-2xl border border-white/10";

export default function TasksSection({ tasks, missions, quizzes, challenges }: {
  tasks: any[]; missions: any[]; quizzes: any[]; challenges: any[];
}) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"tasks" | "missions" | "quizzes" | "challenges">("tasks");

  // Tasks state
  const [newTask, setNewTask] = useState({ title: "", description: "", reward: "50", deadline: "" });
  const [editingTask, setEditingTask] = useState<any>(null);

  // Missions state
  const [newMission, setNewMission] = useState({ title: "", reward: "50", total: "1", icon: "📚" });
  const [editingMission, setEditingMission] = useState<any>(null);

  // Quizzes state
  const [newQuiz, setNewQuiz] = useState({ title: "", subject: "", difficulty: "Easy", questions: "10", duration: "15", reward: "50", cat: "ssc" });
  const [editingQuiz, setEditingQuiz] = useState<any>(null);

  // Challenges state
  const [newChallenge, setNewChallenge] = useState({ title: "", difficulty: "Easy", xp: "50", tag: "Array" });
  const [editingChallenge, setEditingChallenge] = useState<any>(null);

  const log = (action: any, target?: string, details?: any) =>
    logAdminAction(currentUser!.uid, userProfile?.name || "Admin", action, target, details);

  // ── Task CRUD ──
  const createTask = async () => {
    if (!newTask.title.trim()) { toast({ title: "Title দিন", variant: "destructive" }); return; }
    await push(ref(db, "tasks"), { ...newTask, reward: parseInt(newTask.reward), status: "active", createdAt: Date.now() });
    await log("task.create", undefined, { title: newTask.title });
    toast({ title: "Task created ✅" });
    setNewTask({ title: "", description: "", reward: "50", deadline: "" });
  };
  const saveTask = async () => {
    if (!editingTask) return;
    await update(ref(db, `tasks/${editingTask.id}`), { title: editingTask.title, description: editingTask.description, reward: parseInt(editingTask.reward), deadline: editingTask.deadline });
    await log("task.edit", editingTask.id);
    setEditingTask(null); toast({ title: "Task updated ✅" });
  };
  const deleteTask = async (id: string) => {
    await remove(ref(db, `tasks/${id}`));
    await log("task.delete", id);
    toast({ title: "Task deleted." });
  };

  // ── Mission CRUD ──
  const createMission = async () => {
    if (!newMission.title.trim()) { toast({ title: "Title দিন", variant: "destructive" }); return; }
    await push(ref(db, "dailyMissions"), { ...newMission, reward: parseInt(newMission.reward), total: parseInt(newMission.total), createdAt: Date.now() });
    await log("mission.create", undefined, { title: newMission.title });
    toast({ title: "Mission created ✅" });
    setNewMission({ title: "", reward: "50", total: "1", icon: "📚" });
  };
  const saveMission = async () => {
    if (!editingMission) return;
    await update(ref(db, `dailyMissions/${editingMission.id}`), { title: editingMission.title, reward: parseInt(editingMission.reward), total: parseInt(editingMission.total), icon: editingMission.icon });
    await log("mission.edit", editingMission.id);
    setEditingMission(null); toast({ title: "Mission updated ✅" });
  };
  const deleteMission = async (id: string) => {
    await remove(ref(db, `dailyMissions/${id}`));
    await log("mission.delete", id);
    toast({ title: "Mission deleted." });
  };

  // ── Quiz CRUD ──
  const createQuiz = async () => {
    if (!newQuiz.title.trim()) { toast({ title: "Title দিন", variant: "destructive" }); return; }
    await push(ref(db, "quizzes"), { ...newQuiz, questions: parseInt(newQuiz.questions), duration: parseInt(newQuiz.duration), reward: parseInt(newQuiz.reward), attempts: 0, rating: 5.0, createdAt: Date.now() });
    await log("quiz.create", undefined, { title: newQuiz.title });
    toast({ title: "Quiz created ✅" });
    setNewQuiz({ title: "", subject: "", difficulty: "Easy", questions: "10", duration: "15", reward: "50", cat: "ssc" });
  };
  const saveQuiz = async () => {
    if (!editingQuiz) return;
    await update(ref(db, `quizzes/${editingQuiz.id}`), { title: editingQuiz.title, subject: editingQuiz.subject, difficulty: editingQuiz.difficulty, reward: parseInt(editingQuiz.reward) });
    await log("quiz.edit", editingQuiz.id);
    setEditingQuiz(null); toast({ title: "Quiz updated ✅" });
  };
  const deleteQuiz = async (id: string) => {
    await remove(ref(db, `quizzes/${id}`));
    await log("quiz.delete", id);
    toast({ title: "Quiz deleted." });
  };

  // ── Challenge CRUD ──
  const createChallenge = async () => {
    if (!newChallenge.title.trim()) { toast({ title: "Title দিন", variant: "destructive" }); return; }
    await push(ref(db, "codingChallenges"), { ...newChallenge, xp: parseInt(newChallenge.xp), solved: false, createdAt: Date.now() });
    await log("challenge.create", undefined, { title: newChallenge.title });
    toast({ title: "Challenge created ✅" });
    setNewChallenge({ title: "", difficulty: "Easy", xp: "50", tag: "Array" });
  };
  const saveChallenge = async () => {
    if (!editingChallenge) return;
    await update(ref(db, `codingChallenges/${editingChallenge.id}`), { title: editingChallenge.title, difficulty: editingChallenge.difficulty, xp: parseInt(editingChallenge.xp), tag: editingChallenge.tag });
    await log("challenge.edit", editingChallenge.id);
    setEditingChallenge(null); toast({ title: "Challenge updated ✅" });
  };
  const deleteChallenge = async (id: string) => {
    await remove(ref(db, `codingChallenges/${id}`));
    await log("challenge.delete", id);
    toast({ title: "Challenge deleted." });
  };

  const SEL = "flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl mb-4";
  const tabBtn = (id: typeof tab, label: string, count: number) => (
    <button key={id} onClick={() => setTab(id)}
      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${tab === id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
      {label} <span className="opacity-60">({count})</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold mb-1">Tasks & Content</h2>
        <p className="text-xs text-muted-foreground">Manage tasks, missions, quizzes, and coding challenges</p>
      </div>

      <div className={SEL}>
        {tabBtn("tasks", "Tasks", tasks.length)}
        {tabBtn("missions", "Missions", missions.length)}
        {tabBtn("quizzes", "Quizzes", quizzes.length)}
        {tabBtn("challenges", "Coding", challenges.length)}
      </div>

      {/* ─── TASKS ─── */}
      {tab === "tasks" && (
        <div className="space-y-4">
          <div className={CARD + " space-y-3"}>
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-violet-400" /><h3 className="font-bold text-sm">New Task</h3></div>
            <Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Task title *" className={FIELD} />
            <Textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder="Description…" className="bg-white/5 border-white/10 resize-none h-14 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground mb-1 block">Coins Reward</Label>
                <Input type="number" value={newTask.reward} onChange={e => setNewTask(p => ({ ...p, reward: e.target.value }))} className={FIELD} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Deadline</Label>
                <Input type="date" value={newTask.deadline} onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))} className={FIELD} /></div>
            </div>
            <GlowButton className="w-full h-9 text-sm" onClick={createTask}><Plus className="w-3.5 h-3.5 mr-1" />Create Task</GlowButton>
          </div>
          <div className="space-y-2">
            {tasks.map(t => (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
                {editingTask?.id === t.id ? (
                  <div className="space-y-2">
                    <Input value={editingTask.title} onChange={e => setEditingTask((p: any) => ({ ...p, title: e.target.value }))} className={FIELD} />
                    <Textarea value={editingTask.description} onChange={e => setEditingTask((p: any) => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 resize-none h-12 text-sm" />
                    <div className="flex gap-2">
                      <Input type="number" value={editingTask.reward} onChange={e => setEditingTask((p: any) => ({ ...p, reward: e.target.value }))} className={FIELD + " w-28"} />
                      <GlowButton size="sm" className="h-9 px-3 text-xs" onClick={saveTask}><Save className="w-3 h-3 mr-1" />Save</GlowButton>
                      <button onClick={() => setEditingTask(null)} className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                      <div className="flex gap-2 mt-1">
                        <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/15 text-yellow-400">+{t.reward} 🪙</Badge>
                        {t.deadline && <span className="text-[10px] text-muted-foreground">Due: {t.deadline}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setEditingTask({ ...t })} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteTask(t.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            {tasks.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No tasks yet.</p>}
          </div>
        </div>
      )}

      {/* ─── MISSIONS ─── */}
      {tab === "missions" && (
        <div className="space-y-4">
          <div className={CARD + " space-y-3"}>
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-cyan-400" /><h3 className="font-bold text-sm">New Daily Mission</h3></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Input value={newMission.title} onChange={e => setNewMission(p => ({ ...p, title: e.target.value }))} placeholder="Mission title *" className={FIELD} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Icon</Label><Input value={newMission.icon} onChange={e => setNewMission(p => ({ ...p, icon: e.target.value }))} className={FIELD} placeholder="📚" /></div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Coins</Label><Input type="number" value={newMission.reward} onChange={e => setNewMission(p => ({ ...p, reward: e.target.value }))} className={FIELD} /></div>
              <div className="col-span-2"><Label className="text-xs text-muted-foreground mb-1 block">Target count</Label><Input type="number" value={newMission.total} onChange={e => setNewMission(p => ({ ...p, total: e.target.value }))} className={FIELD} /></div>
            </div>
            <GlowButton className="w-full h-9 text-sm" onClick={createMission}><Plus className="w-3.5 h-3.5 mr-1" />Create Mission</GlowButton>
          </div>
          <div className="space-y-2">
            {missions.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
                {editingMission?.id === m.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input value={editingMission.icon} onChange={e => setEditingMission((p: any) => ({ ...p, icon: e.target.value }))} className={FIELD + " w-16"} />
                      <Input value={editingMission.title} onChange={e => setEditingMission((p: any) => ({ ...p, title: e.target.value }))} className={FIELD} />
                    </div>
                    <div className="flex gap-2">
                      <Input type="number" value={editingMission.reward} onChange={e => setEditingMission((p: any) => ({ ...p, reward: e.target.value }))} className={FIELD + " w-24"} placeholder="Coins" />
                      <Input type="number" value={editingMission.total} onChange={e => setEditingMission((p: any) => ({ ...p, total: e.target.value }))} className={FIELD + " w-24"} placeholder="Target" />
                      <GlowButton size="sm" className="h-9 px-3 text-xs" onClick={saveMission}><Save className="w-3 h-3 mr-1" />Save</GlowButton>
                      <button onClick={() => setEditingMission(null)} className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{m.icon || "📚"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{m.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/15 text-yellow-400">+{m.reward} 🪙</Badge>
                        <span className="text-[10px] text-muted-foreground">Target: {m.total}x</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setEditingMission({ ...m })} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteMission(m.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            {missions.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No missions yet.</p>}
          </div>
        </div>
      )}

      {/* ─── QUIZZES ─── */}
      {tab === "quizzes" && (
        <div className="space-y-4">
          <div className={CARD + " space-y-3"}>
            <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400" /><h3 className="font-bold text-sm">New Quiz</h3></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Input value={newQuiz.title} onChange={e => setNewQuiz(p => ({ ...p, title: e.target.value }))} placeholder="Quiz title *" className={FIELD} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Subject</Label><Input value={newQuiz.subject} onChange={e => setNewQuiz(p => ({ ...p, subject: e.target.value }))} placeholder="Mathematics" className={FIELD} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                <select value={newQuiz.cat} onChange={e => setNewQuiz(p => ({ ...p, cat: e.target.value }))} className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                  {["ssc","hsc","code","general"].map(t => <option key={t} value={t} className="bg-gray-900">{t.toUpperCase()}</option>)}
                </select>
              </div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Difficulty</Label>
                <select value={newQuiz.difficulty} onChange={e => setNewQuiz(p => ({ ...p, difficulty: e.target.value }))} className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                  {["Easy","Medium","Hard"].map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
                </select>
              </div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Questions</Label><Input type="number" value={newQuiz.questions} onChange={e => setNewQuiz(p => ({ ...p, questions: e.target.value }))} className={FIELD} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Duration (min)</Label><Input type="number" value={newQuiz.duration} onChange={e => setNewQuiz(p => ({ ...p, duration: e.target.value }))} className={FIELD} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Coins Reward</Label><Input type="number" value={newQuiz.reward} onChange={e => setNewQuiz(p => ({ ...p, reward: e.target.value }))} className={FIELD} /></div>
            </div>
            <GlowButton className="w-full h-9 text-sm" onClick={createQuiz}><Plus className="w-3.5 h-3.5 mr-1" />Create Quiz</GlowButton>
          </div>
          <div className="space-y-2">
            {quizzes.map(q => (
              <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
                {editingQuiz?.id === q.id ? (
                  <div className="space-y-2">
                    <Input value={editingQuiz.title} onChange={e => setEditingQuiz((p: any) => ({ ...p, title: e.target.value }))} className={FIELD} />
                    <Input value={editingQuiz.subject} onChange={e => setEditingQuiz((p: any) => ({ ...p, subject: e.target.value }))} className={FIELD} placeholder="Subject" />
                    <div className="flex gap-2">
                      <Input type="number" value={editingQuiz.reward} onChange={e => setEditingQuiz((p: any) => ({ ...p, reward: e.target.value }))} className={FIELD + " w-24"} placeholder="Reward" />
                      <select value={editingQuiz.difficulty} onChange={e => setEditingQuiz((p: any) => ({ ...p, difficulty: e.target.value }))} className="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                        {["Easy","Medium","Hard"].map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
                      </select>
                      <GlowButton size="sm" className="h-9 px-3 text-xs shrink-0" onClick={saveQuiz}><Save className="w-3 h-3 mr-1" />Save</GlowButton>
                      <button onClick={() => setEditingQuiz(null)} className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs shrink-0"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{q.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        <Badge className="text-[9px] px-1.5 py-0 bg-blue-500/15 text-blue-400">{q.difficulty}</Badge>
                        <span className="text-[10px] text-muted-foreground">{q.subject}</span>
                        <span className="text-[10px] text-yellow-400">+{q.reward} 🪙</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setEditingQuiz({ ...q })} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteQuiz(q.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            {quizzes.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No quizzes yet.</p>}
          </div>
        </div>
      )}

      {/* ─── CHALLENGES ─── */}
      {tab === "challenges" && (
        <div className="space-y-4">
          <div className={CARD + " space-y-3"}>
            <div className="flex items-center gap-2"><Code2 className="w-4 h-4 text-green-400" /><h3 className="font-bold text-sm">New Coding Challenge</h3></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Input value={newChallenge.title} onChange={e => setNewChallenge(p => ({ ...p, title: e.target.value }))} placeholder="Challenge title *" className={FIELD} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Difficulty</Label>
                <select value={newChallenge.difficulty} onChange={e => setNewChallenge(p => ({ ...p, difficulty: e.target.value }))} className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                  {["Easy","Medium","Hard","Expert"].map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
                </select>
              </div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Tag</Label><Input value={newChallenge.tag} onChange={e => setNewChallenge(p => ({ ...p, tag: e.target.value }))} placeholder="Array, DP…" className={FIELD} /></div>
              <div className="col-span-2"><Label className="text-xs text-muted-foreground mb-1 block">XP Reward</Label><Input type="number" value={newChallenge.xp} onChange={e => setNewChallenge(p => ({ ...p, xp: e.target.value }))} className={FIELD} /></div>
            </div>
            <GlowButton className="w-full h-9 text-sm" onClick={createChallenge}><Plus className="w-3.5 h-3.5 mr-1" />Create Challenge</GlowButton>
          </div>
          <div className="space-y-2">
            {challenges.map(c => (
              <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
                {editingChallenge?.id === c.id ? (
                  <div className="space-y-2">
                    <Input value={editingChallenge.title} onChange={e => setEditingChallenge((p: any) => ({ ...p, title: e.target.value }))} className={FIELD} />
                    <div className="flex gap-2">
                      <Input value={editingChallenge.tag} onChange={e => setEditingChallenge((p: any) => ({ ...p, tag: e.target.value }))} className={FIELD + " flex-1"} placeholder="Tag" />
                      <Input type="number" value={editingChallenge.xp} onChange={e => setEditingChallenge((p: any) => ({ ...p, xp: e.target.value }))} className={FIELD + " w-20"} placeholder="XP" />
                      <GlowButton size="sm" className="h-9 px-3 text-xs shrink-0" onClick={saveChallenge}><Save className="w-3 h-3 mr-1" />Save</GlowButton>
                      <button onClick={() => setEditingChallenge(null)} className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs shrink-0"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{c.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        <Badge className={`text-[9px] px-1.5 py-0 ${c.difficulty === "Easy" ? "bg-green-500/15 text-green-400" : c.difficulty === "Medium" ? "bg-yellow-500/15 text-yellow-400" : c.difficulty === "Expert" ? "bg-red-600/15 text-red-500" : "bg-red-500/15 text-red-400"}`}>{c.difficulty}</Badge>
                        <span className="text-[10px] text-muted-foreground">{c.tag}</span>
                        <span className="text-[10px] text-blue-400">+{c.xp} XP</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setEditingChallenge({ ...c })} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteChallenge(c.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            {challenges.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No challenges yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
