import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ref, onValue, off, query, limitToLast } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { LoadingSpinner } from "@/components/LoadingSpinner";

import AdminLayout, { type AdminSection } from "./admin/AdminLayout";
import DashboardSection from "./admin/DashboardSection";
import UsersSection from "./admin/UsersSection";
import MembershipSection from "./admin/MembershipSection";
import TasksSection from "./admin/TasksSection";
import CoursesSection from "./admin/CoursesSection";
import ExamsSection from "./admin/ExamsSection";
import PaymentsSection from "./admin/PaymentsSection";
import NotifySection from "./admin/NotifySection";
import AnalyticsSection from "./admin/AnalyticsSection";
import LogsSection from "./admin/LogsSection";
import SettingsSection from "./admin/SettingsSection";

export default function AdminPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { isAdmin, isSuperAdmin, can } = useAdminPermissions();

  const [section, setSection] = useState<AdminSection>("dashboard");
  const [loading, setLoading] = useState(true);

  // All data loaded at top level and passed down
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [membershipRequests, setMembershipRequests] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (authLoading || !userProfile) return;
    if (!isAdmin) { setLocation("/home"); return; }

    const listeners: (() => void)[] = [];

    const subscribe = (path: string, cb: (d: any) => void) => {
      const r = ref(db, path);
      const unsub = onValue(r, snap => {
        if (snap.val()) cb(snap.val());
        setLoading(false);
      }, () => setLoading(false));
      listeners.push(() => off(r));
      return unsub;
    };

    const subscribeLimited = (path: string, cb: (d: any) => void) => {
      const r = query(ref(db, path), limitToLast(100));
      const unsub = onValue(r, snap => {
        cb(snap.val() || {});
        setLoading(false);
      }, () => setLoading(false));
      listeners.push(() => off(r));
      return unsub;
    };

    subscribeLimited("users", d => setUsers(Object.values(d)));
    subscribe("tasks", d => setTasks(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))));
    subscribe("dailyMissions", d => setMissions(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))));
    subscribe("courses", d => setCourses(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))));
    subscribe("premiumExams", d => setExams(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))));
    subscribe("quizzes", d => setQuizzes(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))));
    subscribe("codingChallenges", d => setChallenges(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v }))));

    if (isSuperAdmin) {
      subscribeLimited("paymentRequests", d =>
        setPaymentRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a, b) => b.createdAt - a.createdAt)));
      subscribeLimited("withdrawRequests", d =>
        setWithdrawRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a, b) => b.createdAt - a.createdAt)));
      subscribeLimited("membershipRequests", d =>
        setMembershipRequests(Object.entries(d).map(([id, v]: [string, any]) => ({ id, ...v })).sort((a, b) => b.requestedAt - a.requestedAt)));

      const resultsRef = ref(db, "examResults");
      onValue(resultsRef, snap => {
        const data = snap.val();
        if (!data) return;
        const grouped: Record<string, any[]> = {};
        Object.entries(data).forEach(([examId, byUid]: [string, any]) => {
          grouped[examId] = Object.values(byUid).sort((a: any, b: any) => b.score - a.score);
        });
        setExamResults(grouped);
      });
      listeners.push(() => off(resultsRef));
    }

    setLoading(false);
    return () => listeners.forEach(fn => fn());
  }, [authLoading, userProfile, isAdmin, isSuperAdmin, setLocation]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) return null;

  const pendingPayments = paymentRequests.filter(r => r.status === "pending").length;
  const pendingWithdraws = withdrawRequests.filter(r => r.status === "pending").length;

  const badges: Partial<Record<AdminSection, number>> = {
    payments: pendingPayments,
    wallet: pendingWithdraws,
  };

  const renderSection = () => {
    switch (section) {
      case "dashboard":
        return (
          <DashboardSection
            users={users} tasks={tasks} missions={missions} courses={courses} exams={exams}
            pendingPayments={pendingPayments} pendingWithdraws={pendingWithdraws}
            pendingMemberships={membershipRequests.filter(r => r.status === "pending").length}
          />
        );
      case "users":
        return can.manageUsers ? <UsersSection users={users} /> : <Forbidden />;
      case "membership":
        return can.manageMembership ? <MembershipSection /> : <Forbidden />;
      case "tasks":
        return (
          <TasksSection tasks={tasks} missions={missions} quizzes={quizzes} challenges={challenges} />
        );
      case "courses":
        return <CoursesSection courses={courses} />;
      case "exams":
        return <ExamsSection exams={exams} examResults={examResults} />;
      case "payments":
        return can.managePayments ? (
          <PaymentsSection
            paymentRequests={paymentRequests} withdrawRequests={withdrawRequests}
            membershipRequests={membershipRequests} users={users}
          />
        ) : <Forbidden />;
      case "wallet":
        return can.manageWallet ? (
          <PaymentsSection
            paymentRequests={paymentRequests} withdrawRequests={withdrawRequests}
            membershipRequests={membershipRequests} users={users}
          />
        ) : <Forbidden />;
      case "notify":
        return <NotifySection users={users} isSuperAdmin={isSuperAdmin} />;
      case "gifts":
        return can.sendGifts ? <NotifySection users={users} isSuperAdmin={isSuperAdmin} /> : <Forbidden />;
      case "analytics":
        return can.viewAnalytics ? (
          <AnalyticsSection users={users} exams={exams} courses={courses} tasks={tasks} />
        ) : <Forbidden />;
      case "logs":
        return can.viewLogs ? <LogsSection /> : <Forbidden />;
      case "settings":
        return can.manageSettings ? <SettingsSection /> : <Forbidden />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout section={section} setSection={setSection} badges={badges}>
      {renderSection()}
    </AdminLayout>
  );
}

function Forbidden() {
  return (
    <div className="text-center py-20">
      <p className="text-4xl mb-3">🚫</p>
      <p className="font-bold text-lg">Access Denied</p>
      <p className="text-sm text-muted-foreground mt-1">You don't have permission to access this section.</p>
    </div>
  );
}
