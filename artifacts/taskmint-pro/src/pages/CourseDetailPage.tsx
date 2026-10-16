import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { off, onValue, ref } from "firebase/database";
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, FileText, GraduationCap, Lock, Play, ShieldCheck } from "lucide-react";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlowButton } from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { BKASH_NUMBER } from "@/lib/payments";
import {
  getGetCommunityCourseAccessQueryKey,
  getGetCommunityCourseContentQueryKey,
  useCreateCommunityCoursePurchaseRequest,
  useEnrollInFreeCommunityCourse,
  useGetCommunityCourseAccess,
  useGetCommunityCourseContent,
} from "@workspace/api-client-react";
import type { CommunityCourseModuleInput } from "@workspace/api-client-react";

const CARD = "glass-card rounded-2xl border border-white/10";

export default function CourseDetailPage() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ transactionId: "", bkashNumber: "" });
  const [purchasePending, setPurchasePending] = useState(false);
  const [locallyEnrolled, setLocallyEnrolled] = useState(false);
  const freeEnroll = useEnrollInFreeCommunityCourse();
  const purchase = useCreateCommunityCoursePurchaseRequest();

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    const courseRef = ref(db, `courses/${courseId}`);
    const unsubscribe = onValue(courseRef, (snapshot) => {
      setCourse(snapshot.exists() ? { id: courseId, ...snapshot.val() } : null);
      setLoadError(false);
      setLoading(false);
    }, () => { setLoadError(true); setLoading(false); });
    return () => { off(courseRef); unsubscribe(); };
  }, [courseId]);

  useEffect(() => {
    setLocallyEnrolled(false);
    setPurchasePending(false);
  }, [courseId]);

  const isCommunity = isCommunityCourse(course);
  const isPremiumMember = !!userProfile?.membership && userProfile.membership !== "free" &&
    (!userProfile.membershipExpiry || userProfile.membershipExpiry > Date.now());
  const isOwner = !!currentUser?.uid && (course?.ownerUid === currentUser.uid || course?.communityOwnerUid === currentUser.uid);
  const accessQuery = useGetCommunityCourseAccess(courseId, {
    query: {
      enabled: Boolean(courseId && currentUser?.uid && isCommunity && !isOwner),
      queryKey: getGetCommunityCourseAccessQueryKey(courseId),
      refetchInterval: (query) => query.state.data?.purchasePending ? 8_000 : false,
    },
  });
  const enrolled = locallyEnrolled || accessQuery.data?.enrolled === true;
  const hasPendingPurchase = purchasePending || accessQuery.data?.purchasePending === true;
  const enrollmentLoading = isCommunity && !!currentUser?.uid && !isOwner && accessQuery.isLoading;
  const canAccess = isCommunity && (enrolled || isOwner);
  const contentQuery = useGetCommunityCourseContent(courseId, {
    query: { enabled: canAccess, queryKey: getGetCommunityCourseContentQueryKey(courseId) },
  });

  const enrollFree = async () => {
    try {
      await freeEnroll.mutateAsync({ courseId });
      setLocallyEnrolled(true);
      void accessQuery.refetch();
      toast({ title: "You're enrolled", description: "Course lessons are now unlocked." });
    } catch (error: any) {
      toast({ title: "Enrollment failed", description: error?.message || "Please try again.", variant: "destructive" });
    }
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await purchase.mutateAsync({ courseId, data: { transactionId: paymentForm.transactionId.trim(), bkashNumber: paymentForm.bkashNumber.trim() } });
      setPurchasePending(true);
      void accessQuery.refetch();
      setPaymentForm({ transactionId: "", bkashNumber: "" });
      toast({ title: "Payment submitted", description: "Your bKash payment is waiting for approval." });
    } catch (error: any) {
      toast({ title: "Could not submit payment", description: error?.message || "Check the details and try again.", variant: "destructive" });
    }
  };

  if (loading) return <main className="min-h-[100dvh] bg-background p-5"><div className="max-w-2xl mx-auto space-y-4"><div className="skeleton h-10 w-36" /><div className="skeleton h-56 rounded-3xl" /><div className="skeleton h-32 rounded-2xl" /></div></main>;
  if (loadError) return <main className="min-h-[100dvh] bg-background p-5 flex items-center justify-center"><div className={`${CARD} p-6 max-w-sm text-center`}><BookOpen className="w-8 h-8 mx-auto text-primary mb-3" /><h1 className="font-bold">Course unavailable</h1><p className="text-sm text-muted-foreground mt-2">Could not load course details.</p><button onClick={() => setLocation("/courses")} className="mt-4 text-sm text-primary">Back to courses</button></div></main>;
  if (!course) return <main className="min-h-[100dvh] bg-background p-5 flex items-center justify-center"><div className={`${CARD} p-6 text-center`}><h1 className="font-bold">Course not found</h1><button onClick={() => setLocation("/courses")} className="mt-4 text-sm text-primary">Back to courses</button></div></main>;

  const isPendingApproval = isCommunity && course.status === "pending";
  const price = Number(course.price || 0);
  const isFree = course.type === "free" || price <= 0;
  const communityName = course.communityName || course.community?.name || course.instructor || "Community academy";
  const modules: CommunityCourseModuleInput[] = contentQuery.data?.modules || [];

  return <main className="min-h-[100dvh] bg-background pb-24">
    <header className="sticky top-0 z-30 border-b border-white/5 bg-background/90 backdrop-blur-xl px-5 py-3">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <button onClick={() => setLocation("/courses")} className="rounded-xl p-2 hover:bg-white/10" aria-label="Back to courses"><ArrowLeft className="w-5 h-5" /></button>
        <div><p className="text-[10px] uppercase tracking-[.18em] text-primary">TaskMint Pro · Courses</p><h1 className="text-sm font-bold">Course details</h1></div>
        {isCommunity && <Badge className="ml-auto bg-primary/15 text-primary">Academy course</Badge>}
      </div>
    </header>
    <div className="max-w-2xl mx-auto px-5 py-5 space-y-5">
      <section className={`${CARD} overflow-hidden`}>
        <div className="relative h-48 sm:h-60 bg-gradient-to-br from-blue-500/20 to-violet-500/10">
          {course.thumbnail && <img src={course.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex flex-wrap gap-2 mb-2"><Badge className={isFree ? "bg-green-500/20 text-green-300" : "badge-level"}>{isFree ? "Free" : `৳${price}`}</Badge>{course.grade && <Badge variant="outline">{course.grade}</Badge>}{course.tag && <Badge variant="outline">{course.tag}</Badge>}</div>
            <h2 className="text-2xl font-extrabold leading-tight">{course.title}</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-line">{course.description || course.desc || "A structured course built to help you learn with confidence."}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {isCommunity ? <span className="flex items-center gap-2">{(course.communityLogo || course.community?.logo) && <img src={course.communityLogo || course.community.logo} alt="" className="w-7 h-7 rounded-full object-cover" />}<span><b className="block text-foreground">{communityName}</b>{course.instructor || "Course instructor"}</span></span> : <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-primary" />Platform course</span>}
            {course.duration && <span className="flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{course.duration}</span>}
            {(course.moduleCount || course.modules?.length) > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{course.moduleCount || course.modules.length} modules</span>}
          </div>
          {isPendingApproval ? <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">This course is waiting for approval and is not open for enrollment yet.</div> :
            isCommunity && enrollmentLoading && !isOwner ? <div className="skeleton h-11 rounded-xl" /> :
            isCommunity && enrolled ? <div className="rounded-xl border border-green-400/20 bg-green-400/10 p-3 flex items-center gap-2 text-sm text-green-200" data-testid="status-enrolled"><CheckCircle2 className="w-4 h-4" />Already enrolled · lessons unlocked</div> :
            isCommunity && !isOwner ? isFree ? <GlowButton onClick={enrollFree} disabled={freeEnroll.isPending}>{freeEnroll.isPending ? "Enrolling…" : "Enroll free"}</GlowButton> :
              <form onSubmit={submitPayment} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                 <div><h3 className="text-sm font-bold">Pay ৳{price} with bKash</h3><p className="text-xs text-muted-foreground">Send ৳{price} to <strong className="text-foreground">{BKASH_NUMBER}</strong>, then share your bKash number and transaction ID for approval.</p></div>
                {hasPendingPurchase && <p className="text-xs text-amber-200">Payment request submitted · pending approval</p>}
                <Input value={paymentForm.bkashNumber} onChange={(e) => setPaymentForm({ ...paymentForm, bkashNumber: e.target.value })} required minLength={8} maxLength={24} placeholder="Your bKash number" aria-label="bKash number" />
                <Input value={paymentForm.transactionId} onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })} required minLength={4} maxLength={128} placeholder="Transaction ID" aria-label="Transaction ID" />
                <GlowButton type="submit" disabled={purchase.isPending || hasPendingPurchase}>{purchase.isPending ? "Submitting…" : hasPendingPurchase ? "Payment approval pending" : "Request enrollment"}</GlowButton>
              </form> :
            !isCommunity && course.type === "premium" && !isPremiumMember ? <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 flex items-center gap-3"><Lock className="w-5 h-5 text-amber-300" /><div className="flex-1 text-sm">Platform premium course · membership required.</div><button onClick={() => setLocation("/membership")} className="text-xs text-amber-200">View plans</button></div> : null}
        </div>
      </section>

      {isCommunity && canAccess && <section className={`${CARD} p-5 space-y-4`}>
        <div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /><div><h3 className="font-bold">Course content</h3><p className="text-xs text-muted-foreground">Modules unlock in the order your academy prepared.</p></div></div>
        {contentQuery.isLoading ? <div className="space-y-3">{[0, 1].map((item) => <div key={item} className="skeleton h-16 rounded-xl" />)}</div> :
          contentQuery.isError ? <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm"><p>Course content could not load.</p><button onClick={() => contentQuery.refetch()} className="mt-2 text-primary text-xs">Try again</button></div> :
          modules.length === 0 ? <div className="text-sm text-muted-foreground py-5 text-center">Content is being prepared.</div> :
          modules.map((module, moduleIndex) => <article key={`${module.title}-${moduleIndex}`} className="rounded-xl border border-white/10 overflow-hidden">
            <div className="bg-white/[0.04] px-4 py-3 flex items-center gap-3"><span className="w-7 h-7 rounded-lg bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{String(moduleIndex + 1).padStart(2, "0")}</span><h4 className="font-semibold text-sm">{module.title}</h4><span className="ml-auto text-[10px] text-muted-foreground">{module.lessons.length} lessons</span></div>
            <div className="divide-y divide-white/5">{module.lessons.map((lesson, lessonIndex) => <div key={`${lesson.title}-${lessonIndex}`} className="px-4 py-3">
              <div className="flex items-start gap-3"><div className="mt-0.5 text-primary">{lesson.type === "video" ? <Play className="w-4 h-4" /> : lesson.type === "pdf" ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium">{lesson.title}</p><p className="text-[10px] text-muted-foreground capitalize">{lesson.type}{lesson.duration ? ` · ${lesson.duration} min` : ""}</p>
                {lesson.content && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">{lesson.content}</p>}
                {lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-primary">Open video</a>}
                {lesson.pdfUrl && <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-primary">Open PDF</a>}
                {lesson.quizQuestions?.map((question, questionIndex) => <div key={questionIndex} className="mt-3 rounded-lg bg-white/[0.04] p-3"><p className="text-xs font-semibold">{question.question}</p><ol className="mt-2 list-decimal pl-4 text-xs text-muted-foreground">{question.options.map((option, optionIndex) => <li key={optionIndex} className={optionIndex === question.correctAnswer ? "text-green-300" : ""}>{option}</li>)}</ol>{question.explanation && <p className="mt-2 text-[10px] text-muted-foreground">{question.explanation}</p>}</div>)}
                {lesson.flashcards?.map((card, cardIndex) => <details key={cardIndex} className="mt-2 rounded-lg bg-white/[0.04] p-3 text-xs"><summary className="cursor-pointer">{card.front}</summary><p className="pt-2 text-muted-foreground">{card.back}</p></details>)}
              </div></div>
            </div>)}</div>
          </article>)}
      </section>}

      {isCommunity && !canAccess && !isPendingApproval && <section className={`${CARD} p-5 flex gap-3 items-center text-sm text-muted-foreground`}><Lock className="w-5 h-5 text-primary shrink-0" /><p>Enroll in this course to unlock the modules and lessons.</p></section>}
    </div>
  </main>;
}

function isCommunityCourse(course: any) {
  return Boolean(course?.communityId || course?.communityName || course?.communityLogo || course?.community || course?.ownerType === "community" || course?.createdBy === "community");
}
