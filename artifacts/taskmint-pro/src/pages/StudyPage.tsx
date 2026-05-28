import { useState } from "react";
import { motion } from "framer-motion";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { ContestCard } from "@/components/ContestCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { GlowButton } from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, Code, Brain, Clock, Star } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "math", label: "Math" },
  { id: "science", label: "Science" },
  { id: "programming", label: "Code" },
  { id: "english", label: "English" },
];

const SAMPLE_TASKS = [
  { id: "1", title: "Algebra Fundamentals", category: "math", reward: 30, xpReward: 50, difficulty: "Easy", duration: "15 min", description: "Master core algebra concepts with practice problems.", icon: BookOpen },
  { id: "2", title: "Python Basics Quiz", category: "programming", reward: 50, xpReward: 80, difficulty: "Medium", duration: "20 min", description: "Test your Python knowledge with 10 challenges.", icon: Code },
  { id: "3", title: "Physics: Motion Laws", category: "science", reward: 40, xpReward: 60, difficulty: "Medium", duration: "25 min", description: "Understand Newton's laws through simulations.", icon: Brain },
  { id: "4", title: "Timed Vocabulary Test", category: "english", reward: 25, xpReward: 40, difficulty: "Easy", duration: "10 min", description: "Expand your vocabulary in 10 minutes or less.", icon: Clock },
  { id: "5", title: "Data Structures Deep Dive", category: "programming", reward: 80, xpReward: 120, difficulty: "Hard", duration: "40 min", description: "Tackle arrays, linked lists, trees, and graphs.", icon: Code },
  { id: "6", title: "Chemistry Reactions", category: "science", reward: 45, xpReward: 70, difficulty: "Medium", duration: "20 min", description: "Learn about chemical reactions and balancing equations.", icon: Star },
];

const difficultyColor: Record<string, string> = {
  Easy: "bg-green-500/20 text-green-400 border-green-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Hard: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function StudyPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [tasks] = useRealtimeData<Record<string, any>>("tasks");

  const allTasks = tasks ? Object.values(tasks) : SAMPLE_TASKS;
  const filtered = activeCategory === "all" ? allTasks : allTasks.filter((t: any) => t.category === activeCategory);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-extrabold tracking-tight">Study Hub</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Complete tasks to earn coins</p>
        </div>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-5">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Today's Goal</p>
              <p className="text-2xl font-extrabold mt-1">0 / 3 Tasks</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-purple">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-white glow-purple"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
              data-testid={`filter-${cat.id}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <Tabs defaultValue="tasks">
          <TabsList className="w-full bg-white/5 border border-white/10">
            <TabsTrigger value="tasks" className="flex-1">Tasks</TabsTrigger>
            <TabsTrigger value="quizzes" className="flex-1">Quizzes</TabsTrigger>
            <TabsTrigger value="timed" className="flex-1">Timed</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-3">
                <BookOpen className="w-10 h-10 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">No tasks in this category yet.</p>
              </div>
            ) : (
              filtered.map((task: any, i: number) => {
                const Icon = task.icon || BookOpen;
                return (
                  <motion.div
                    key={task.id || i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass-card p-4 rounded-2xl flex gap-4 items-start"
                    data-testid={`task-card-${task.id || i}`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm leading-snug">{task.title}</h4>
                        <Badge className={`text-[10px] shrink-0 border ${difficultyColor[task.difficulty] || difficultyColor.Easy}`}>
                          {task.difficulty || "Easy"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-yellow-500">+{task.reward} coins</span>
                        <span className="text-xs text-primary">+{task.xpReward} XP</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{task.duration || "15 min"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4 space-y-3">
            {["Quick Math Quiz", "Python Fundamentals", "History Challenge"].map((title, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-4 rounded-2xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">10 questions · 5 min</p>
                  </div>
                  <GlowButton size="sm" className="h-8 text-xs px-4" data-testid={`btn-start-quiz-${i}`}>Start</GlowButton>
                </div>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="timed" className="mt-4 space-y-3">
            {["60-Second Math Sprint", "Speed Typing Challenge", "Flash Card Recall"].map((title, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-4 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{title}</h4>
                    <p className="text-xs text-muted-foreground">+60 coins on win</p>
                  </div>
                </div>
                <GlowButton size="sm" className="h-8 text-xs px-4" data-testid={`btn-start-timed-${i}`}>Go</GlowButton>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
