import { useEffect, useMemo, useState } from "react";
import { onValue, off, push, ref, remove, set } from "firebase/database";
import * as XLSX from "xlsx";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, FileSpreadsheet, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { logAdminAction } from "@/lib/adminLog";
import { MCQ_SUBJECTS, normalizeMcqSubject } from "@/lib/mcqSubjects";

const SUBJECTS = MCQ_SUBJECTS.map((subject) => subject.id);
const FIELD = "bg-white/5 border-white/10";
const emptyQuestion = { subject: "math", topic: "", difficulty: "Medium", question: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "1", explanation: "" };
const emptyTest = { title: "", description: "", type: "free", subject: "math", topic: "", difficulty: "all", questionCount: "25", duration: "30", negativeMarking: true, negativeMarkValue: "0.25", entryFee: "20", reward: "25", startTime: "", endTime: "" };

function adminRole(role?: string) { return role === "admin" || role === "super_admin" || role === "owner"; }

export default function PracticeAdminSection() {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"questions" | "tests">("questions");
  const [questions, setQuestions] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [premiumTests, setPremiumTests] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [question, setQuestion] = useState<any>(emptyQuestion);
  const [test, setTest] = useState<any>(emptyTest);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editingTest, setEditingTest] = useState<{ id: string; path: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filterSubject, setFilterSubject] = useState("math");

  useEffect(() => {
    const listeners = [
      ["questionBank", setQuestions],
      ["modelTests", setTests],
      ["premiumExams", setPremiumTests],
      ["quizSchedules", setSchedules],
    ].map(([path, setter]: any) => {
      const databaseRef = ref(db, path as string);
      onValue(databaseRef, (snapshot) => {
        const value = snapshot.val() || {};
        const list = Object.entries(value).map(([id, raw]: [string, any]) => ({ id, ...raw }));
        setter(list);
      });
      return databaseRef;
    });
    return () => listeners.forEach((databaseRef) => off(databaseRef));
  }, []);

  // questionBank is a two-level tree; flatten it for the admin table.
  const flatQuestions = useMemo(() => {
    const flat: any[] = [];
    questions.forEach((subjectNode: any) => {
      if (subjectNode.subject && subjectNode.question) flat.push(subjectNode);
      else Object.entries(subjectNode)
        .filter(([key]) => key !== "id" && key !== "subject")
        .forEach(([id, raw]: [string, any]) => flat.push({ id, subject: subjectNode.id, ...(raw as any) }));
    });
    return flat.filter((item) => item.subject === filterSubject);
  }, [questions, filterSubject]);

  const saveQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !adminRole(userProfile?.role) || !question.question.trim() || [question.optionA, question.optionB, question.optionC, question.optionD].some((value: string) => !value.trim())) {
      toast({ title: "প্রশ্ন ও চারটি option পূরণ করুন", variant: "destructive" });
      return;
    }
    setSaving(true);
    const id = editingQuestion || push(ref(db, `questionBank/${question.subject}`)).key;
    if (!id) return;
    const payload = { question: question.question.trim(), options: [question.optionA, question.optionB, question.optionC, question.optionD].map((value: string) => value.trim()), correct: Math.max(0, Number(question.correct) - 1), topic: question.topic.trim() || "General", difficulty: question.difficulty, explanation: question.explanation.trim(), points: 1, updatedAt: Date.now() };
    try {
      await set(ref(db, `questionBank/${question.subject}/${id}`), payload);
      await logAdminAction(currentUser.uid, userProfile?.name || "Admin", editingQuestion ? "question.edit" : "question.create", id, { subject: question.subject });
      toast({ title: editingQuestion ? "Question updated" : "Question added" });
      setQuestion(emptyQuestion); setEditingQuestion(null);
    } catch (error: any) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const parseRow = (row: any) => {
    const pick = (...keys: string[]) => keys.map((key) => row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()]).find((value) => value !== undefined && value !== "");
    const options = [pick("optionA", "A", "Option A"), pick("optionB", "B", "Option B"), pick("optionC", "C", "Option C"), pick("optionD", "D", "Option D")];
    const rawOptions = pick("options", "Options");
    const splitOptions = rawOptions ? String(rawOptions).split(/\s*\|\s*|\s*;\s*/) : [];
    const finalOptions = options.every((value) => value) ? options : splitOptions;
    const answer = String(pick("correct", "correctAnswer", "answer", "Correct") ?? "1").trim();
    let correct = Number(answer);
    if (!Number.isFinite(correct)) correct = "ABCD".indexOf(answer.toUpperCase()) + 1;
    return { subject: normalizeMcqSubject(pick("subject", "Subject") || "math"), topic: String(pick("topic", "Topic") || "General"), difficulty: String(pick("difficulty", "Difficulty") || "Medium"), question: String(pick("question", "text", "Question") || ""), options: finalOptions.map(String), correct: Math.max(0, correct - 1), explanation: String(pick("explanation", "Explanation") || ""), points: 1, updatedAt: Date.now() };
  };

  const importFile = async (file: File) => {
    setImporting(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
      const updates: Promise<void>[] = [];
      rows.map(parseRow).filter((item: any) => item.question && item.options.length >= 2).forEach((item: any) => {
        const id = push(ref(db, `questionBank/${item.subject}`)).key;
        if (id) updates.push(set(ref(db, `questionBank/${item.subject}/${id}`), item));
      });
      await Promise.all(updates);
      if (currentUser) await logAdminAction(currentUser.uid, userProfile?.name || "Admin", "question.import", file.name, { imported: updates.length });
      toast({ title: `${updates.length}টি প্রশ্ন import হয়েছে`, description: "CSV, XLS এবং XLSX format সমর্থিত" });
    } catch (error: any) { toast({ title: "Import failed", description: error.message, variant: "destructive" }); }
    finally { setImporting(false); }
  };

  const saveTest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !test.title.trim()) return;
    const isPremium = test.type === "premium";
    const isSchedule = test.type === "daily" || test.type === "weekly";
    const path = isPremium ? "premiumExams" : isSchedule ? "quizSchedules" : "modelTests";
    const id = editingTest?.id || push(ref(db, path)).key;
    if (!id) return;
    setSaving(true);
    const duration = Math.min(180, Math.max(isSchedule ? 5 : 30, Number(test.duration) || 30));
    const count = Math.min(100, Math.max(isSchedule ? 5 : 25, Number(test.questionCount) || 25));
    const payload: any = { title: test.title.trim(), description: test.description.trim(), subject: test.subject, topic: test.topic.trim(), difficulty: test.difficulty, questionCount: count, duration, durationMinutes: duration, negativeMarking: Boolean(test.negativeMarking), negativeMarkValue: Number(test.negativeMarkValue) || 0.25, reward: Number(test.reward) || 0, mode: isSchedule ? "practice" : "test", updatedAt: Date.now() };
    if (isSchedule) payload.scheduleType = test.type;
    if (isPremium) Object.assign(payload, { modelTest: true, premium: true, entryFee: Number(test.entryFee) || 0, level: "Model Test", participants: 0, maxParticipants: 1000, prizePool: 0, startTime: test.startTime ? new Date(test.startTime).getTime() : 0, endTime: test.endTime ? new Date(test.endTime).getTime() : 0 });
    try {
      await set(ref(db, `${path}/${id}`), payload);
      await logAdminAction(currentUser.uid, userProfile?.name || "Admin", editingTest ? "test.edit" : "test.create", id, { path, type: test.type });
      toast({ title: editingTest ? "Test updated" : "Test published" });
      setTest(emptyTest); setEditingTest(null);
    } catch (error: any) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const editTest = (item: any, path: string) => {
    setEditingTest({ id: item.id, path });
    setTest({ ...emptyTest, ...item, type: path === "premiumExams" ? "premium" : path === "quizSchedules" ? item.scheduleType || "daily" : "free", duration: String(item.duration || item.durationMinutes || 30), questionCount: String(item.questionCount || 25), negativeMarkValue: String(item.negativeMarkValue || .25), entryFee: String(item.entryFee || 20), reward: String(item.reward || 0) });
  };
  const deleteTest = async (item: any, path: string) => { if (window.confirm("এই test delete করবেন?")) { await remove(ref(db, `${path}/${item.id}`)); toast({ title: "Test deleted" }); } };

  return (
    <div className="space-y-5">
      <div><p className="text-xs text-primary uppercase tracking-widest">Learning operations</p><h2 className="text-2xl font-extrabold mt-1">Question Bank & Tests</h2><p className="text-sm text-muted-foreground mt-1">MCQ content, timed model tests, daily quizzes এবং premium entry এক জায়গা থেকে পরিচালনা করুন।</p></div>
      <div className="flex gap-2 p-1 rounded-xl bg-white/5 max-w-md"><button onClick={() => setTab("questions")} className={`flex-1 rounded-lg py-2 text-xs font-bold ${tab === "questions" ? "gradient-primary text-white" : "text-muted-foreground"}`}>Question bank</button><button onClick={() => setTab("tests")} className={`flex-1 rounded-lg py-2 text-xs font-bold ${tab === "tests" ? "gradient-primary text-white" : "text-muted-foreground"}`}>Model tests</button></div>

      {tab === "questions" ? <div className="grid xl:grid-cols-[380px_1fr] gap-5">
        <div className="space-y-4">
          <form onSubmit={saveQuestion} className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-bold">{editingQuestion ? "Edit question" : "Add a question"}</h3>{editingQuestion && <button type="button" onClick={() => { setEditingQuestion(null); setQuestion(emptyQuestion); }}><X className="w-4 h-4 text-muted-foreground" /></button>}</div>
            <select value={question.subject} onChange={(e) => setQuestion({ ...question, subject: e.target.value })} className={`w-full h-10 rounded-xl px-3 text-sm ${FIELD}`}>{MCQ_SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            <div className="grid grid-cols-2 gap-2"><Input value={question.topic} onChange={(e) => setQuestion({ ...question, topic: e.target.value })} placeholder="Topic / chapter" className={FIELD} /><select value={question.difficulty} onChange={(e) => setQuestion({ ...question, difficulty: e.target.value })} className={`h-10 rounded-xl px-3 text-sm ${FIELD}`}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
            <Textarea value={question.question} onChange={(e) => setQuestion({ ...question, question: e.target.value })} placeholder="Question text" className={`${FIELD} min-h-20`} />
            <div className="grid grid-cols-2 gap-2">{["optionA", "optionB", "optionC", "optionD"].map((key, index) => <Input key={key} value={question[key]} onChange={(e) => setQuestion({ ...question, [key]: e.target.value })} placeholder={`Option ${String.fromCharCode(65 + index)}`} className={FIELD} />)}</div>
            <div className="grid grid-cols-2 gap-2"><select value={question.correct} onChange={(e) => setQuestion({ ...question, correct: e.target.value })} className={`h-10 rounded-xl px-3 text-sm ${FIELD}`}><option value="1">Correct: A</option><option value="2">Correct: B</option><option value="3">Correct: C</option><option value="4">Correct: D</option></select><Input value={question.explanation} onChange={(e) => setQuestion({ ...question, explanation: e.target.value })} placeholder="Optional explanation" className={FIELD} /></div>
            <GlowButton type="submit" disabled={saving} className="w-full">{editingQuestion ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{saving ? "Saving…" : editingQuestion ? "Update question" : "Add question"}</GlowButton>
          </form>
          <label className="glass-card rounded-2xl p-5 flex items-center gap-3 cursor-pointer hover:bg-white/10"><FileSpreadsheet className="w-8 h-8 text-green-400" /><div className="flex-1"><p className="font-bold text-sm">Bulk import</p><p className="text-xs text-muted-foreground">CSV, XLS, XLSX · headers: subject, question, optionA-D, correct, topic</p></div><Upload className="w-4 h-4 text-primary" /><input type="file" className="hidden" accept=".csv,.tsv,.xls,.xlsx" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />{importing && <span className="text-xs text-primary">Reading…</span>}</label>
        </div>
        <div className="glass-card rounded-2xl p-5"><div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="font-bold">Published questions</h3><p className="text-xs text-muted-foreground">{flatQuestions.length}টি {MCQ_SUBJECTS.find((s) => s.id === filterSubject)?.label || filterSubject} questions</p></div><select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={`h-9 rounded-xl px-3 text-sm ${FIELD}`}>{MCQ_SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div><div className="space-y-2 max-h-[620px] overflow-y-auto">{flatQuestions.map((item) => <div key={item.id} className="rounded-xl bg-white/5 p-3 flex items-start gap-3"><div className="flex-1 min-w-0"><div className="flex gap-2 items-center"><Badge className="text-[10px]">{item.difficulty}</Badge><span className="text-[10px] text-muted-foreground">{item.topic}</span></div><p className="text-sm mt-1 line-clamp-2">{item.question}</p></div><button onClick={() => { setEditingQuestion(item.id); setQuestion({ ...emptyQuestion, ...item, optionA: item.options?.[0] || "", optionB: item.options?.[1] || "", optionC: item.options?.[2] || "", optionD: item.options?.[3] || "", correct: String(Number(item.correct) + 1) }); }} className="p-2 rounded-lg hover:bg-white/10"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => remove(ref(db, `questionBank/${item.subject}/${item.id}`))} className="p-2 rounded-lg hover:bg-red-500/10 text-red-300"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div></div>
      </div> : <div className="grid xl:grid-cols-[380px_1fr] gap-5">
        <form onSubmit={saveTest} className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="font-bold">{editingTest ? "Edit published test" : "Publish a test"}</h3>
          <select value={test.type} onChange={(e) => setTest({ ...test, type: e.target.value })} className={`w-full h-10 rounded-xl px-3 text-sm ${FIELD}`}><option value="free">Free model test</option><option value="daily">Daily short quiz</option><option value="weekly">Weekly short quiz</option><option value="premium">Premium model test</option></select>
          <Input value={test.title} onChange={(e) => setTest({ ...test, title: e.target.value })} placeholder="Test title" className={FIELD} required /><Textarea value={test.description} onChange={(e) => setTest({ ...test, description: e.target.value })} placeholder="Description" className={`${FIELD} min-h-16`} />
          <div className="grid grid-cols-2 gap-2"><select value={test.subject} onChange={(e) => setTest({ ...test, subject: e.target.value })} className={`h-10 rounded-xl px-3 text-sm ${FIELD}`}>{MCQ_SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select><Input value={test.topic} onChange={(e) => setTest({ ...test, topic: e.target.value })} placeholder="Topic (optional)" className={FIELD} /></div>
          <div className="grid grid-cols-2 gap-2"><Input type="number" min={test.type === "daily" || test.type === "weekly" ? 5 : 25} max="100" value={test.questionCount} onChange={(e) => setTest({ ...test, questionCount: e.target.value })} placeholder="Questions" className={FIELD} /><Input type="number" min={test.type === "daily" || test.type === "weekly" ? 5 : 30} max="180" value={test.duration} onChange={(e) => setTest({ ...test, duration: e.target.value })} placeholder="Minutes" className={FIELD} /></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={test.negativeMarking} onChange={(e) => setTest({ ...test, negativeMarking: e.target.checked })} /> Negative marking <Input value={test.negativeMarkValue} onChange={(e) => setTest({ ...test, negativeMarkValue: e.target.value })} className={`h-8 w-20 ${FIELD}`} /></div>
          {test.type === "premium" && <div className="grid grid-cols-2 gap-2"><Input type="number" value={test.entryFee} onChange={(e) => setTest({ ...test, entryFee: e.target.value })} placeholder="Entry fee ৳" className={FIELD} /><Input type="number" value={test.reward} onChange={(e) => setTest({ ...test, reward: e.target.value })} placeholder="XP/coin reward" className={FIELD} /></div>}
          <div className="grid grid-cols-2 gap-2"><Input type="datetime-local" value={test.startTime} onChange={(e) => setTest({ ...test, startTime: e.target.value })} className={FIELD} /><Input type="datetime-local" value={test.endTime} onChange={(e) => setTest({ ...test, endTime: e.target.value })} className={FIELD} /></div>
          <GlowButton type="submit" className="w-full" disabled={saving}><BookOpen className="w-4 h-4 mr-2" />{saving ? "Publishing…" : editingTest ? "Update test" : "Publish test"}</GlowButton>
        </form>
        <div className="space-y-4">{[["Free & short quizzes", tests.map((i) => ({ ...i, path: "modelTests" })), schedules.map((i) => ({ ...i, path: "quizSchedules" }))], ["Premium model tests", premiumTests.filter((i) => i.modelTest).map((i) => ({ ...i, path: "premiumExams" }))]].map(([heading, ...groups]: any) => <div key={heading} className="glass-card rounded-2xl p-5"><h3 className="font-bold mb-3">{heading}</h3><div className="space-y-2">{groups.flat().map((item: any) => <div key={`${item.path}-${item.id}`} className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{item.title}</p><p className="text-xs text-muted-foreground">{item.questionCount || 25} Q · {item.duration || 30} min · {item.subject}</p></div><Badge className={item.premium ? "bg-yellow-500/15 text-yellow-300" : "bg-green-500/15 text-green-300"}>{item.scheduleType || (item.premium ? "premium" : "free")}</Badge><button onClick={() => editTest(item, item.path)} className="p-2 rounded-lg hover:bg-white/10"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => deleteTest(item, item.path)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-300"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div></div>)}</div>
      </div>}
    </div>
  );
}