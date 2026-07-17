import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  BookOpen, Crown, Star, Users, Clock, ChevronRight,
  Lock, Play, Filter, Zap, Code2, FlaskConical,
  Calculator, Globe, Palette, Music
} from "lucide-react";

type CourseFilter = "all" | "free" | "premium" | "ssc" | "hsc" | "programming" | "olympiad";

const CATEGORY_ICONS: Record<string, any> = {
  programming: Code2, math: Calculator, science: FlaskConical,
  english: Globe, design: Palette, general: BookOpen, music: Music,
};


const FILTERS: { id: CourseFilter; label: string }[] = [
  { id: "all", label: "সব" },
  { id: "free", label: "Free" },
  { id: "premium", label: "Premium" },
  { id: "ssc", label: "SSC" },
  { id: "hsc", label: "HSC" },
  { id: "programming", label: "Programming" },
  { id: "olympiad", label: "Olympiad" },
];

export default function CoursesPage() {
  const { userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [fbCourses, setFbCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const coursesRef = ref(db, "courses");
    const unsub = onValue(coursesRef, (snap) => {
      const data = snap.val();
      if (data) {
        setFbCourses(Object.values(data));
      }
      setLoading(false);
    });
    return () => off(coursesRef);
  }, []);

  const allCourses = fbCourses;

  const filtered = allCourses.filter((c: any) => {
    if (filter === "all") return true;
    if (filter === "free") return c.type === "free";
    if (filter === "premium") return c.type === "premium";
    return c.tag === filter;
  });

  const isPremium = userProfile?.membership && userProfile.membership !== "free";

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Courses</h1>
              <p className="text-[11px] text-muted-foreground">{allCourses.length}+ courses available</p>
            </div>
            <div className="ml-auto">
              {isPremium ? (
                <Badge className="badge-level text-[10px]"><Crown className="w-2.5 h-2.5 mr-1" />{userProfile?.membership}</Badge>
              ) : (
                <button onClick={() => setLocation("/membership")}
                  className="text-xs text-primary font-semibold flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg">
                  <Crown className="w-3 h-3" />Upgrade
                </button>
              )}
            </div>
          </div>
          {/* Filter Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f.id ? "gradient-primary text-white" : "bg-white/5 text-muted-foreground hover:text-white"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 max-w-md mx-auto">
        {/* Featured Banner — only shown when there are courses */}
        {filter === "all" && allCourses.length > 0 && (() => {
          const featured = allCourses.find((c: any) => c.featured) || allCourses[0];
          if (!featured) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-5 rounded-3xl relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(124,58,237,0.2) 100%)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <Badge className="badge-coin text-[10px] mb-2"><Zap className="w-2.5 h-2.5 mr-1" />Featured</Badge>
                <h3 className="font-extrabold text-lg mb-1">{featured.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{featured.desc}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {featured.students > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{(featured.students || 0).toLocaleString()} students</span>}
                  {featured.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{featured.rating}</span>}
                  {featured.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{featured.duration}</span>}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {loading ? (
          <div className="space-y-3">{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {filtered.length === 0 && (
                <div className="py-16 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">এই category-তে কোনো course নেই এখনো</p>
                </div>
              )}
              {filtered.map((course: any, i: number) => {
                const isPremiumCourse = course.type === "premium";
                const isLocked = isPremiumCourse && !isPremium;
                const CatIcon = CATEGORY_ICONS[course.category] || BookOpen;

                return (
                  <motion.div key={course.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card rounded-2xl p-4 flex gap-4 cursor-pointer hover:bg-white/[0.08] transition-all active:scale-[0.98]"
                    onClick={() => isLocked && setLocation("/membership")}>
                    {/* Thumbnail */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 text-3xl
                      ${isPremiumCourse ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20" : "bg-gradient-to-br from-blue-500/20 to-violet-500/10 border border-blue-500/20"}`}>
                      {course.emoji || "📚"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-sm leading-tight line-clamp-1">{course.title}</h4>
                        {isPremiumCourse ? (
                          <Badge className="badge-level shrink-0 text-[9px]"><Crown className="w-2 h-2 mr-0.5" />৳{course.price}</Badge>
                        ) : (
                          <Badge className="shrink-0 text-[9px] bg-green-500/20 text-green-400 border-green-500/20">Free</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{course.desc}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-yellow-400" />{course.rating}</span>
                        <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{(course.students || 0).toLocaleString()}</span>
                        <span className="flex items-center gap-0.5"><Play className="w-2.5 h-2.5" />{course.lessons} lessons</span>
                      </div>
                    </div>
                    <div className="flex items-center self-center">
                      {isLocked ? (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Upgrade CTA */}
        {!isPremium && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            onClick={() => setLocation("/membership")}
            className="mt-5 p-5 rounded-3xl cursor-pointer relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.2) 0%, rgba(249,115,22,0.15) 100%)", border: "1px solid rgba(234,179,8,0.25)" }}>
            <div className="absolute top-0 right-0 w-28 h-28 bg-yellow-500/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0">
                <Crown className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-yellow-400">Premium Membership</p>
                <p className="text-xs text-muted-foreground">সব premium courses unlock করুন মাত্র ৳99/মাসে</p>
              </div>
              <ChevronRight className="w-5 h-5 text-yellow-400 shrink-0" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
