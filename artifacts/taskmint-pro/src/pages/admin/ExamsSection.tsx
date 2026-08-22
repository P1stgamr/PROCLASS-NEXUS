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
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff, Copy, Clock, Trophy, ListPlus } from "lucide-react";
import { format } from "date-fns";

const FIELD = "h-9 bg-white/5 border-white/10 text-sm";
const CARD = "glass-card p-4 rounded-2xl border border-white/10";

const EXAM_CATEGORIES = ["MCQ", "CQ", "Quiz", "Practice", "Assignment", "Mock Test", "Live Test"];
const LEVELS = ["All", "SSC", "HSC", "University", "Beginner", "Intermediate", "Advanced"];

const defaultExam = {
  title: "", description: "", category: "MCQ", level: "All",
  entryFee: "", prizePool: "", duration: "30", totalQuestions: "20",
  maxParticipants: "100", startTimeStr: "", endTimeStr: "",
  negativeMarking: false, randomQuestions: false,
  passingMarks: "", certificateEnabled: false,
};

type ExamQuestion = {
  id: string;
  question: string;
  options: string[];
  correct: number;
  points: number;
};

const createQuestion = (): ExamQuestion => ({
  id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  question: "",
  options: ["", "", "", ""],
  correct: 0,
  points: 1,
});

const categoryColor: Record<string, string> = {
  MCQ: "bg-blue-500/20 text-blue-400", CQ: "bg-purple-500/20 text-purple-400",
  Quiz: "bg-cyan-500/20 text-cyan-400", Practice: "bg-green-500/20 text-green-400",
  Assignment: "bg-yellow-500/20 text-yellow-400", "Mock Test": "bg-orange-500/20 text-orange-400",
  "Live Test": "bg-red-500/20 text-red-400",
};

export default function ExamsSection({ exams, examResults }: { exams: any[]; examResults: Record<string, any[]> }) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(defaultExam);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => { setForm(defaultExam); setQuestions([]); setEditingId(null); setShowForm(false); };

  const updateQuestion = (questionId: string, patch: Partial<ExamQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, ...patch } : q));
  };

  const updateQuestionOption = (questionId: string, index: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      const options = [...q.options];
      options[index] = value;
      return { ...q, options };
    }));
  };

  const saveExam = async () => {
    if (!form.title || !form.startTimeStr || !form.endTimeStr) {
      toast({ title: "Title ও সময় আবশ্যক", variant: "destructive" }); return;
    }
    if (questions.length === 0) {
      toast({ title: "কমপক্ষে ১টি প্রশ্ন যোগ করুন", variant: "destructive" }); return;
    }
    if (questions.some(q => !q.question.trim() || q.options.some(option => !option.trim()) || q.correct < 0 || q.correct > 3 || q.points < 1)) {
      toast({ title: "প্রতিটি প্রশ্ন, ৪টি option এবং points পূরণ করুন", variant: "destructive" }); return;
    }
    const startTs = new Date(form.startTimeStr).getTime();
    const endTs = new Date(form.endTimeStr).getTime();
    if (endTs <= startTs) { toast({ title: "End time must be after start time", variant: "destructive" }); return; }

    const payload = {
      title: form.title, description: form.description, category: form.category, level: form.level,
      entryFee: parseInt(form.entryFee) || 0, prizePool: parseInt(form.prizePool) || 0,
      duration: parseInt(form.duration), totalQuestions: parseInt(form.totalQuestions),
      maxParticipants: parseInt(form.maxParticipants), startTime: startTs, endTime: endTs,
      negativeMarking: form.negativeMarking, randomQuestions: form.randomQuestions,
      passingMarks: parseInt(form.passingMarks) || 0,
      certificateEnabled: form.certificateEnabled,
      questions: Object.fromEntries(questions.map(q => [q.id, {
        id: q.id,
        question: q.question.trim(),
        options: q.options.map(option => option.trim()),
        correct: q.correct,
        points: q.points,
      }])),
      updatedAt: Date.now(),
    };

    if (editingId) {
      await update(ref(db, `premiumExams/${editingId}`), payload);
      await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "exam.edit", editingId, { title: form.title });
      toast({ title: "Exam updated ✅" });
    } else {
      await push(ref(db, "premiumExams"), { ...payload, participants: 0, status: "scheduled", createdAt: Date.now() });
      await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "exam.create", undefined, { title: form.title });
      toast({ title: "Exam created ✅" });
    }
    resetForm();
  };

  const startEdit = (exam: any) => {
    setEditingId(exam.id);
    setForm({
      title: exam.title || "", description: exam.description || "",
      category: exam.category || "MCQ", level: exam.level || "All",
      entryFee: String(exam.entryFee || ""), prizePool: String(exam.prizePool || ""),
      duration: String(exam.duration || 30), totalQuestions: String(exam.totalQuestions || 20),
      maxParticipants: String(exam.maxParticipants || 100),
      startTimeStr: exam.startTime ? format(exam.startTime, "yyyy-MM-dd'T'HH:mm") : "",
      endTimeStr: exam.endTime ? format(exam.endTime, "yyyy-MM-dd'T'HH:mm") : "",
      negativeMarking: exam.negativeMarking || false,
      randomQuestions: exam.randomQuestions || false,
      passingMarks: String(exam.passingMarks || ""),
      certificateEnabled: exam.certificateEnabled || false,
    });
    setQuestions(exam.questions ? Object.values(exam.questions) as ExamQuestion[] : []);
    setShowForm(true);
  };

  const deleteExam = async (id: string, title: string) => {
    await remove(ref(db, `premiumExams/${id}`));
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "exam.delete", id, { title });
    toast({ title: "Exam deleted." });
  };

  const togglePublish = async (exam: any) => {
    const newStatus = exam.status === "published" ? "scheduled" : "published";
    await update(ref(db, `premiumExams/${exam.id}`), { status: newStatus, updatedAt: Date.now() });
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", newStatus === "published" ? "exam.publish" : "exam.unpublish", exam.id, { title: exam.title });
    toast({ title: newStatus === "published" ? "Exam published ✅" : "Exam unpublished." });
  };

  const duplicateExam = async (exam: any) => {
    const { id, participants, status, createdAt, ...rest } = exam;
    await push(ref(db, "premiumExams"), { ...rest, title: `${exam.title} (Copy)`, participants: 0, status: "scheduled", createdAt: Date.now() });
    await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "exam.duplicate", exam.id, { title: exam.title });
    toast({ title: "Exam duplicated ✅" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-extrabold mb-1">Exam Management</h2>
          <p className="text-xs text-muted-foreground">{exams.length} exams in Firebase</p>
        </div>
        <GlowButton size="sm" className="h-8 px-3 text-xs" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-3 h-3 mr-1" />New Exam
        </GlowButton>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className={CARD + " space-y-4"}>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">{editingId ? "Edit Exam" : "Create Exam"}</h3>
            <button onClick={resetForm} className="ml-auto p-1 rounded-lg hover:bg-white/10"><X className="w-3.5 h-3.5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Exam title" className={FIELD} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 resize-none h-14 text-sm" placeholder="Exam description…" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                {EXAM_CATEGORIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Level</Label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
                {LEVELS.map(l => <option key={l} value={l} className="bg-gray-900">{l}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Entry Fee (coins)</Label>
              <Input type="number" value={form.entryFee} onChange={e => setForm(p => ({ ...p, entryFee: e.target.value }))} className={FIELD} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Prize Pool (coins)</Label>
              <Input type="number" value={form.prizePool} onChange={e => setForm(p => ({ ...p, prizePool: e.target.value }))} className={FIELD} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Duration (min)</Label>
              <Input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} className={FIELD} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Total Questions</Label>
              <Input type="number" value={form.totalQuestions} onChange={e => setForm(p => ({ ...p, totalQuestions: e.target.value }))} className={FIELD} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Max Participants</Label>
              <Input type="number" value={form.maxParticipants} onChange={e => setForm(p => ({ ...p, maxParticipants: e.target.value }))} className={FIELD} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Passing Marks (%)</Label>
              <Input type="number" value={form.passingMarks} onChange={e => setForm(p => ({ ...p, passingMarks: e.target.value }))} className={FIELD} placeholder="50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Start Time *</Label>
              <Input type="datetime-local" value={form.startTimeStr} onChange={e => setForm(p => ({ ...p, startTimeStr: e.target.value }))} className={FIELD} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">End Time *</Label>
              <Input type="datetime-local" value={form.endTimeStr} onChange={e => setForm(p => ({ ...p, endTimeStr: e.target.value }))} className={FIELD} />
            </div>
            <div className="col-span-2 flex flex-wrap gap-4">
              {[
                { key: "negativeMarking", label: "Negative Marking" },
                { key: "randomQuestions", label: "Random Questions" },
                { key: "certificateEnabled", label: "Certificate on Completion" },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(form as any)[opt.key]} onChange={e => setForm(p => ({ ...p, [opt.key]: e.target.checked }))} className="w-3.5 h-3.5 rounded" />
                  <span className="text-xs">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListPlus className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="font-bold text-sm">Exam Questions</h3>
                  <p className="text-[10px] text-muted-foreground">{questions.length} question{questions.length === 1 ? "" : "s"} added</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuestions(prev => [...prev, createQuestion()])}
                className="inline-flex items-center rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25"
              >
                <Plus className="w-3 h-3 mr-1" />Add Question
              </button>
            </div>

            {questions.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/15 px-3 py-5 text-center text-xs text-muted-foreground">
                Add questions so students can take this exam.
              </div>
            )}

            {questions.map((question, index) => (
              <div key={question.id} className="rounded-xl border border-white/10 bg-black/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Question {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setQuestions(prev => prev.filter(q => q.id !== question.id))}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                    title="Remove question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Textarea
                  value={question.question}
                  onChange={e => updateQuestion(question.id, { question: e.target.value })}
                  placeholder="Write the question…"
                  className="min-h-16 resize-none bg-white/5 border-white/10 text-sm"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {question.options.map((option, optionIndex) => (
                    <Input
                      key={optionIndex}
                      value={option}
                      onChange={e => updateQuestionOption(question.id, optionIndex, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                      className={FIELD}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Correct option</Label>
                    <select
                      value={question.correct}
                      onChange={e => updateQuestion(question.id, { correct: Number(e.target.value) })}
                      className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white"
                    >
                      {question.options.map((_, optionIndex) => (
                        <option key={optionIndex} value={optionIndex} className="bg-gray-900">
                          Option {String.fromCharCode(65 + optionIndex)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Points</Label>
                    <Input
                      type="number"
                      min="1"
                      value={question.points}
                      onChange={e => updateQuestion(question.id, { points: Number(e.target.value) || 0 })}
                      className={FIELD}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <GlowButton className="w-full h-9 text-sm" onClick={saveExam}>
            {editingId ? <><Save className="w-3.5 h-3.5 mr-1.5" />Update Exam</> : <><Plus className="w-3.5 h-3.5 mr-1.5" />Create Exam</>}
          </GlowButton>
        </div>
      )}

      {/* Exam list */}
      <div className="space-y-3">
        {exams.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No exams yet. Create one above.</p>}
        {exams.map(exam => {
          const results = examResults[exam.id] || [];
          return (
            <motion.div key={exam.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CARD}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-sm">{exam.title}</p>
                    <Badge className={`text-[9px] px-1.5 py-0 ${categoryColor[exam.category] || "bg-gray-500/20 text-gray-400"}`}>{exam.category}</Badge>
                    <Badge className={`text-[9px] px-1.5 py-0 ${exam.status === "published" ? "bg-green-500/20 text-green-400" : exam.status === "completed" ? "bg-gray-500/20 text-gray-400" : "bg-yellow-500/20 text-yellow-400"}`}>{exam.status}</Badge>
                    {exam.negativeMarking && <Badge className="text-[9px] px-1.5 py-0 bg-red-500/15 text-red-400">-ve</Badge>}
                    {exam.certificateEnabled && <Badge className="text-[9px] px-1.5 py-0 bg-purple-500/15 text-purple-400">Cert</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    <span><Clock className="w-3 h-3 inline mr-0.5" />{exam.duration}m</span>
                    <span>Q:{exam.totalQuestions}</span>
                    <span>Fee:{exam.entryFee} 🪙</span>
                    <span>Prize:{exam.prizePool} 🪙</span>
                    <span>{exam.participants || 0}/{exam.maxParticipants} enrolled</span>
                    {results.length > 0 && <span className="text-green-400">{results.length} results</span>}
                  </div>
                  {exam.startTime && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(exam.startTime, "dd MMM yyyy, HH:mm")} → {exam.endTime ? format(exam.endTime, "HH:mm") : "?"}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => startEdit(exam)} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => togglePublish(exam)} className={`p-1.5 rounded-lg transition-colors ${exam.status === "published" ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400" : "bg-green-500/10 hover:bg-green-500/20 text-green-400"}`} title={exam.status === "published" ? "Unpublish" : "Publish"}>
                    {exam.status === "published" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => duplicateExam(exam)} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors" title="Duplicate">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteExam(exam.id, exam.title)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
