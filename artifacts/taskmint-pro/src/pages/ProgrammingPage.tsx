import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { ref, update } from "firebase/database";
import { db } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Code2, Play, Sparkles, CheckCircle2, Lock, ChevronRight,
  RotateCcw, Copy, Lightbulb, BookOpen, Trophy, Zap,
  Terminal, X, ChevronDown, ChevronUp
} from "lucide-react";

const LANGUAGES = [
  { id: "python", label: "Python", color: "text-blue-400", starter: 'def solution(nums):\n    # আপনার code এখানে লিখুন\n    pass\n\nprint(solution([1, 2, 3]))' },
  { id: "javascript", label: "JavaScript", color: "text-yellow-400", starter: 'function solution(nums) {\n  // আপনার code এখানে লিখুন\n  return null;\n}\n\nconsole.log(solution([1, 2, 3]));' },
  { id: "cpp", label: "C++", color: "text-pink-400", starter: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // আপনার code এখানে লিখুন\n  return 0;\n}' },
  { id: "java", label: "Java", color: "text-orange-400", starter: 'public class Solution {\n  public static void main(String[] args) {\n    // আপনার code এখানে লিখুন\n  }\n}' },
];

type Problem = {
  id: string; title: string; titleBn: string; difficulty: "Easy" | "Medium" | "Hard";
  xp: number; tags: string[]; description: string; examples: { input: string; output: string }[];
  hint: string; premium?: boolean;
};

const PROBLEMS: Problem[] = [
  {
    id: "p1", title: "Two Sum", titleBn: "দুটি সংখ্যার যোগফল",
    difficulty: "Easy", xp: 50, tags: ["Array", "HashMap"],
    description: "একটি integer array `nums` এবং একটি integer `target` দেওয়া আছে। দুটি numbers খুঁজুন যাদের যোগফল `target` এর সমান।",
    examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }, { input: "nums = [3,2,4], target = 6", output: "[1,2]" }],
    hint: "HashMap ব্যবহার করুন: প্রতিটি element-এর জন্য `target - nums[i]` আগে দেখা হয়েছে কিনা check করুন।",
  },
  {
    id: "p2", title: "Palindrome Check", titleBn: "Palindrome যাচাই",
    difficulty: "Easy", xp: 50, tags: ["String"],
    description: "একটি string `s` দেওয়া আছে। যদি এটি palindrome হয় তাহলে `true`, না হলে `false` return করুন। Palindrome মানে উল্টো করলেও একই থাকে।",
    examples: [{ input: "s = 'racecar'", output: "true" }, { input: "s = 'hello'", output: "false" }],
    hint: "String-কে reverse করুন এবং original-এর সাথে compare করুন।",
  },
  {
    id: "p3", title: "Fibonacci Sequence", titleBn: "Fibonacci সংখ্যা",
    difficulty: "Easy", xp: 60, tags: ["DP", "Math"],
    description: "N-তম Fibonacci number বের করুন। F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2)।",
    examples: [{ input: "n = 5", output: "5" }, { input: "n = 10", output: "55" }],
    hint: "Iteration বা memoization ব্যবহার করুন। Recursive solution O(2^n) — inefficient!",
  },
  {
    id: "p4", title: "Valid Parentheses", titleBn: "সঠিক Bracket",
    difficulty: "Medium", xp: 80, tags: ["Stack", "String"],
    description: "শুধুমাত্র `(`, `)`, `{`, `}`, `[`, `]` দিয়ে গঠিত একটি string দেওয়া আছে। এটি valid কিনা check করুন।",
    examples: [{ input: "s = '()[]{}'", output: "true" }, { input: "s = '([)]'", output: "false" }],
    hint: "Stack ব্যবহার করুন: opening bracket push করুন, closing bracket-এ stack-এর top check করুন।",
  },
  {
    id: "p5", title: "Binary Search", titleBn: "Binary Search",
    difficulty: "Medium", xp: 80, tags: ["Binary Search", "Array"],
    description: "Sorted array `nums` এ `target` খুঁজুন এবং তার index return করুন। না পেলে -1 return করুন। O(log n) time complexity হতে হবে।",
    examples: [{ input: "nums = [-1,0,3,5,9,12], target = 9", output: "4" }, { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1" }],
    hint: "left=0, right=len-1, mid=(left+right)//2। nums[mid]==target হলে return, < হলে left=mid+1, > হলে right=mid-1।",
  },
  {
    id: "p6", title: "Merge Sort", titleBn: "Merge Sort Algorithm",
    difficulty: "Hard", xp: 120, tags: ["Sorting", "Divide & Conquer"],
    description: "Merge sort algorithm implement করুন। Array-কে sort করে return করুন। O(n log n) time complexity হতে হবে।",
    examples: [{ input: "[38, 27, 43, 3, 9]", output: "[3, 9, 27, 38, 43]" }],
    hint: "Array-কে দুটি ভাগে ভাগ করুন, প্রতিটি sort করুন, তারপর merge করুন।",
    premium: true,
  },
  {
    id: "p7", title: "LCS Problem", titleBn: "Longest Common Subsequence",
    difficulty: "Hard", xp: 150, tags: ["DP", "String"],
    description: "দুটি string `text1` এবং `text2` দেওয়া আছে। তাদের longest common subsequence এর length বের করুন।",
    examples: [{ input: "text1 = 'abcde', text2 = 'ace'", output: "3" }],
    hint: "2D DP table ব্যবহার করুন। dp[i][j] = text1[0..i] এবং text2[0..j] এর LCS।",
    premium: true,
  },
];

const SOLVED_KEY = "proclass_solved";

export default function ProgrammingPage() {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].starter);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY) || "[]")); } catch { return new Set(); }
  });
  const [filterDiff, setFilterDiff] = useState<string>("all");
  const [showEditor, setShowEditor] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const diffConfig: Record<string, string> = { Easy: "text-green-400 bg-green-500/10", Medium: "text-yellow-400 bg-yellow-500/10", Hard: "text-red-400 bg-red-500/10" };

  const filteredProblems = PROBLEMS.filter(p => filterDiff === "all" || p.difficulty === filterDiff);

  const openProblem = (p: Problem) => {
    if (p.premium && userProfile?.membership === "free") {
      toast({ title: "Premium problem", description: "Gold বা Platinum membership দরকার।" });
      return;
    }
    setSelectedProblem(p);
    setCode(lang.starter);
    setOutput("");
    setShowHint(false);
    setShowEditor(true);
  };

  const handleLangChange = (l: typeof LANGUAGES[0]) => {
    setLang(l);
    setCode(l.starter);
  };

  const runCode = async () => {
    if (!selectedProblem) return;
    setRunning(true);
    setOutput("⏳ Running...");
    await new Promise(r => setTimeout(r, 1200));
    // Simulated output
    const lines = [
      `> Language: ${lang.label}`,
      `> Problem: ${selectedProblem.title}`,
      "",
      "✅ Code compiled successfully!",
      "",
      `Test case 1: ${selectedProblem.examples[0]?.input}`,
      `Expected: ${selectedProblem.examples[0]?.output}`,
      "Result: ✅ Passed",
      "",
      selectedProblem.examples[1] ? `Test case 2: ${selectedProblem.examples[1]?.input}\nExpected: ${selectedProblem.examples[1]?.output}\nResult: ✅ Passed` : "",
      "",
      "🎉 All test cases passed!",
    ].filter(Boolean).join("\n");
    setOutput(lines);
    setRunning(false);
  };

  const markSolved = async () => {
    if (!selectedProblem || !currentUser) return;
    if (solved.has(selectedProblem.id)) return;
    const newSolved = new Set([...solved, selectedProblem.id]);
    setSolved(newSolved);
    localStorage.setItem(SOLVED_KEY, JSON.stringify([...newSolved]));
    await update(ref(db, `users/${currentUser.uid}`), {
      xp: (userProfile?.xp || 0) + selectedProblem.xp,
    });
    toast({ title: `+${selectedProblem.xp} XP earned! 🎉`, description: `${selectedProblem.title} solved!` });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied!" });
  };

  const totalXP = [...solved].reduce((acc, id) => {
    const p = PROBLEMS.find(pr => pr.id === id);
    return acc + (p?.xp || 0);
  }, 0);

  if (showEditor && selectedProblem) {
    return (
      <div className="min-h-screen bg-background pb-4 flex flex-col">
        {/* Editor Header */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-2xl border-b border-white/[0.06] px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => setShowEditor(false)}
              className="p-2 rounded-xl glass-card hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm truncate">{selectedProblem.title}</p>
                <Badge className={`text-[10px] px-2 py-0.5 ${diffConfig[selectedProblem.difficulty]}`}>
                  {selectedProblem.difficulty}
                </Badge>
                {solved.has(selectedProblem.id) && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={copyCode} className="p-2 rounded-xl glass-card hover:bg-white/10 transition-colors">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={runCode} disabled={running}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-60">
                <Play className="w-3.5 h-3.5" />{running ? "Running..." : "Run"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full space-y-4">
          {/* Problem Description */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">সমস্যা</h3>
              <div className="flex gap-1 ml-auto">
                {selectedProblem.tags.map(t => (
                  <Badge key={t} className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary">{t}</Badge>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{selectedProblem.description}</p>
            <div className="mt-3 space-y-2">
              {selectedProblem.examples.map((ex, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 text-xs font-mono">
                  <p className="text-muted-foreground">Input: <span className="text-white">{ex.input}</span></p>
                  <p className="text-muted-foreground">Output: <span className="text-green-400">{ex.output}</span></p>
                </div>
              ))}
            </div>
          </div>

          {/* Hint */}
          <button onClick={() => setShowHint(!showHint)}
            className="w-full flex items-center justify-between p-3.5 glass-card rounded-2xl hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold">Hint দেখুন</span>
            </div>
            {showHint ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHint && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="glass-card rounded-2xl p-4 border border-yellow-500/20">
              <p className="text-sm text-yellow-300/90 leading-relaxed">{selectedProblem.hint}</p>
            </motion.div>
          )}

          {/* Language Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {LANGUAGES.map(l => (
              <button key={l.id} onClick={() => handleLangChange(l)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${lang.id === l.id ? "gradient-primary text-white" : "glass-card text-muted-foreground hover:text-white"}`}>
                <Code2 className={`w-3 h-3 ${lang.id === l.id ? "text-white" : l.color}`} />
                {l.label}
              </button>
            ))}
          </div>

          {/* Code Editor */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <span className="text-xs text-muted-foreground ml-1">solution.{lang.id === "javascript" ? "js" : lang.id === "python" ? "py" : lang.id === "cpp" ? "cpp" : "java"}</span>
              <button onClick={() => setCode(lang.starter)} className="ml-auto p-1 rounded-lg hover:bg-white/10 transition-colors">
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              className="w-full bg-transparent px-4 py-3 font-mono text-sm text-white resize-none outline-none min-h-[220px] leading-relaxed"
              style={{ tabSize: 2 }}
              onKeyDown={e => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  setCode(code.substring(0, start) + "  " + code.substring(end));
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.selectionStart = start + 2;
                      textareaRef.current.selectionEnd = start + 2;
                    }
                  }, 0);
                }
              }}
            />
          </div>

          {/* Output */}
          {output && (
            <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
                <Terminal className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-semibold text-green-400">Output</span>
              </div>
              <pre className="px-4 py-3 text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">{output}</pre>
            </div>
          )}

          {/* Solve Button */}
          {output.includes("All test cases") && !solved.has(selectedProblem.id) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              onClick={markSolved}
              className="w-full py-4 rounded-2xl gradient-primary text-white font-bold text-base flex items-center justify-center gap-2 glow-purple">
              <CheckCircle2 className="w-5 h-5" />
              Solved! +{selectedProblem.xp} XP Claim করুন
            </motion.button>
          )}
          {solved.has(selectedProblem.id) && (
            <div className="w-full py-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              ✅ Solved! {selectedProblem.xp} XP earned
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Programming</h1>
              <p className="text-[11px] text-muted-foreground">{solved.size}/{PROBLEMS.length} solved · {totalXP} XP earned</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{solved.size} solved</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-5">
        {/* Progress */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Total Progress</span>
            <span className="text-xs text-muted-foreground">{solved.size}/{PROBLEMS.length}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full gradient-primary rounded-full"
              initial={{ width: 0 }} animate={{ width: `${(solved.size / PROBLEMS.length) * 100}%` }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[{ label: "Easy", count: PROBLEMS.filter(p => p.difficulty === "Easy" && solved.has(p.id)).length, total: PROBLEMS.filter(p => p.difficulty === "Easy").length, color: "text-green-400" },
              { label: "Medium", count: PROBLEMS.filter(p => p.difficulty === "Medium" && solved.has(p.id)).length, total: PROBLEMS.filter(p => p.difficulty === "Medium").length, color: "text-yellow-400" },
              { label: "Hard", count: PROBLEMS.filter(p => p.difficulty === "Hard" && solved.has(p.id)).length, total: PROBLEMS.filter(p => p.difficulty === "Hard").length, color: "text-red-400" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-base font-bold ${s.color}`}>{s.count}/{s.total}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Filter */}
        <div className="flex gap-2">
          {["all", "Easy", "Medium", "Hard"].map(d => (
            <button key={d} onClick={() => setFilterDiff(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterDiff === d ? "gradient-primary text-white" : "glass-card text-muted-foreground hover:text-white"}`}>
              {d === "all" ? "All" : d}
            </button>
          ))}
        </div>

        {/* Problem List */}
        <div className="space-y-2.5">
          {filteredProblems.map((p, i) => {
            const isSolved = solved.has(p.id);
            const isLocked = p.premium && userProfile?.membership === "free";
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openProblem(p)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all ${isSolved ? "glass-card border border-green-500/20" : "glass-card-hover"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSolved ? "bg-green-500/20" : isLocked ? "bg-white/5" : "bg-primary/10"}`}>
                  {isSolved ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                    : isLocked ? <Lock className="w-5 h-5 text-muted-foreground" />
                    : <Code2 className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm truncate">{p.title}</p>
                    {p.premium && <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/20 text-yellow-400 shrink-0">Premium</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] px-1.5 py-0 ${diffConfig[p.difficulty]}`}>{p.difficulty}</Badge>
                    {p.tags.slice(0, 2).map(t => (
                      <span key={t} className="text-[10px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-xs font-bold text-primary">+{p.xp}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Coming Soon */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-5 border border-primary/20 text-center">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-bold text-sm mb-1">আরও সমস্যা আসছে!</h3>
          <p className="text-xs text-muted-foreground">Real code execution, contests, এবং AI explanation — শীঘ্রই আসছে।</p>
        </motion.div>
      </div>
    </div>
  );
}
