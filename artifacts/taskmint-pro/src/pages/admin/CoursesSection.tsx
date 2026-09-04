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
import { Plus, Edit2, Trash2, Save, X, BookOpen } from "lucide-react";

const FIELD = "h-9 bg-white/5 border-white/10 text-sm";
const CARD = "glass-card p-4 rounded-2xl border border-white/10";

const defaultCourse = { title: "", desc: "", instructor: "", type: "free", price: "0", tag: "programming", duration: "", lessons: "10", emoji: "📚", thumbnail: "" };

export default function CoursesSection({ courses }: { courses: any[] }) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(defaultCourse);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => { setForm(defaultCourse); setEditingId(null); setShowForm(false); };

  const saveCourse = async () => {
    if (!form.title.trim()) { toast({ title: "Title আবশ্যক", variant: "destructive" }); return; }
    const payload = { ...form, price: parseInt(form.price) || 0, lessons: parseInt(form.lessons) || 0, updatedAt: Date.now() };
    if (editingId) {
      await update(ref(db, `courses/${editingId}`), payload);
      await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "course.edit", editingId, { title: form.title });
      toast({ title: "Course updated ✅" });
    } else {
      await push(ref(db, "courses"), { ...payload, students: 0, rating: 5.0, createdAt: Date.now() });
      await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "course.create", undefined, { title: form.title });
      toast({ title: "Course created ✅" });
    }
    resetForm();
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setForm({ title: c.title || "", desc: c.desc || "", instructor: c.instructor || "", type: c.type || "free", price: String(c.price || 0), tag: c.tag || "programming", duration: c.duration || "", lessons: String(c.lessons || 0), emoji: c.emoji || "📚", thumbnail: c.thumbnail || "" });
    setShowForm(true);
  };

  const deleteCourse = async (id: string, title: string) => {
    await remove(ref(db, `courses/${id}`));
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "course.delete", id, { title });
    toast({ title: "Course deleted." });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-extrabold mb-1">Courses</h2>
          <p className="text-xs text-muted-foreground">{courses.length} courses in Firebase</p>
        </div>
        <GlowButton size="sm" className="h-8 px-3 text-xs" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-3 h-3 mr-1" />New Course
        </GlowButton>
      </div>

      {showForm && (
        <div className={CARD + " space-y-4"}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">{editingId ? "Edit Course" : "Create Course"}</h3>
            <button onClick={resetForm} className="ml-auto p-1 rounded-lg hover:bg-white/10"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Course title" className={FIELD} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
              <Textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} placeholder="Course description…" className="bg-white/5 border-white/10 resize-none h-14 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Instructor</Label>
              <Input value={form.instructor} onChange={e => setForm(p => ({ ...p, instructor: e.target.value }))} placeholder="Teacher name" className={FIELD} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Icon (emoji)</Label>
              <Input value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} placeholder="📚" className={FIELD} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Thumbnail URL</Label>
              <Input value={form.thumbnail} onChange={e => setForm(p => ({ ...p, thumbnail: e.target.value }))} placeholder="https://example.com/course-cover.jpg" className={FIELD} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                <option value="free" className="bg-gray-900">Free</option>
                <option value="premium" className="bg-gray-900">Premium</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Price (৳)</Label>
              <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className={FIELD} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
              <select value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                {["ssc","hsc","programming","olympiad","general"].map(t => <option key={t} value={t} className="bg-gray-900">{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Lessons</Label>
              <Input type="number" value={form.lessons} onChange={e => setForm(p => ({ ...p, lessons: e.target.value }))} className={FIELD} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Duration</Label>
              <Input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 8h 30m" className={FIELD} />
            </div>
          </div>
          <GlowButton className="w-full h-9 text-sm" onClick={saveCourse}>
            {editingId ? <><Save className="w-3.5 h-3.5 mr-1.5" />Update Course</> : <><Plus className="w-3.5 h-3.5 mr-1.5" />Create Course</>}
          </GlowButton>
        </div>
      )}

      <div className="space-y-2">
        {courses.length === 0 && !showForm && <p className="text-center py-8 text-sm text-muted-foreground">No courses yet. Create one above.</p>}
        {courses.map(c => (
          <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
            <div className="flex items-center gap-3">
              {c.thumbnail ? <img src={c.thumbnail} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" /> : <span className="text-2xl">{c.emoji || "📚"}</span>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{c.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge className={`text-[9px] px-1.5 py-0 ${c.type === "premium" ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"}`}>{c.type}</Badge>
                  {c.type === "premium" && <span className="text-[10px] text-muted-foreground">৳{c.price}</span>}
                  {c.instructor && <span className="text-[10px] text-muted-foreground">{c.instructor}</span>}
                  <span className="text-[10px] text-muted-foreground">{c.lessons} lessons</span>
                  {c.students > 0 && <span className="text-[10px] text-muted-foreground">{c.students} enrolled</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteCourse(c.id, c.title)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
