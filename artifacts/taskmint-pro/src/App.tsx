import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";

import SplashPage from "@/pages/SplashPage";
import OnboardingPage from "@/pages/OnboardingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import HomePage from "@/pages/HomePage";
import StudyPage from "@/pages/StudyPage";
import CompetitionsPage from "@/pages/CompetitionsPage";
import UploadPage from "@/pages/UploadPage";
import ChatPage from "@/pages/ChatPage";
import WalletPage from "@/pages/WalletPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import PremiumExamPage from "@/pages/PremiumExamPage";
import PaymentPage from "@/pages/PaymentPage";
import ExamRoomPage from "@/pages/ExamRoomPage";
import AIAssistantPage from "@/pages/AIAssistantPage";
import CommunityPage from "@/pages/CommunityPage";
import GiftsPage from "@/pages/GiftsPage";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import MembershipPage from "@/pages/MembershipPage";
import ProgrammingPage from "@/pages/ProgrammingPage";
import ModelTestPage from "@/pages/ModelTestPage";
import PracticeResultPage from "@/pages/PracticeResultPage";
import PracticeHubPage from "@/pages/PracticeHubPage";
import ProfileSetupPage from "@/pages/ProfileSetupPage";
import { FloatingAIButton } from "@/components/FloatingAIButton";
import { NotificationPushListener } from "@/components/NotificationPushListener";
import NotFound from "@/pages/not-found";
import { getExamReturnPath, useExamMode } from "@/lib/examMode";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ExamRestrictedAIRoute() {
  const activeExam = useExamMode();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!activeExam) return;
    const message = "পরীক্ষা চলাকালীন AI Assistant ব্যবহার করা যাবে না";
    toast({ title: message, variant: "destructive" });
    setLocation(getExamReturnPath(activeExam));
  }, [activeExam?.examId, activeExam?.expiresAt, activeExam?.returnPath, setLocation, toast]);

  if (activeExam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <p className="glass-card rounded-2xl p-6 text-sm font-semibold text-yellow-300">
          পরীক্ষা চলাকালীন AI Assistant ব্যবহার করা যাবে না
        </p>
      </div>
    );
  }
  return <ProtectedRoute studentOnly><AIAssistantPage /></ProtectedRoute>;
}

function Router() {
  return (
    <>
      <NotificationPushListener />
      <Switch>
        <Route path="/" component={SplashPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/profile/setup">
          <ProtectedRoute requireProfile={false}><ProfileSetupPage /></ProtectedRoute>
        </Route>

        <Route path="/home">
          <ProtectedRoute><HomePage /></ProtectedRoute>
        </Route>
        <Route path="/study">
          <ProtectedRoute studentOnly><StudyPage /></ProtectedRoute>
        </Route>
        <Route path="/practice">
          <ProtectedRoute studentOnly><PracticeHubPage /></ProtectedRoute>
        </Route>
        <Route path="/practice/:testId">
          {(params) => <ProtectedRoute studentOnly><ModelTestPage /></ProtectedRoute>}
        </Route>
        <Route path="/model-test/:testId">
          {(params) => <ProtectedRoute studentOnly><ModelTestPage /></ProtectedRoute>}
        </Route>
        <Route path="/daily-quiz/:testId">
          {(params) => <ProtectedRoute studentOnly><ModelTestPage /></ProtectedRoute>}
        </Route>
        <Route path="/premium-model-test/:testId">
          {(params) => <ProtectedRoute studentOnly><ModelTestPage /></ProtectedRoute>}
        </Route>
        <Route path="/practice-result/:testId">
          {(params) => <ProtectedRoute studentOnly><PracticeResultPage /></ProtectedRoute>}
        </Route>
        <Route path="/competitions">
          <ProtectedRoute studentOnly><CompetitionsPage /></ProtectedRoute>
        </Route>
        <Route path="/premium-exams">
          <ProtectedRoute studentOnly><PremiumExamPage /></ProtectedRoute>
        </Route>
        <Route path="/payment/:examId">
          {(params) => <ProtectedRoute studentOnly><PaymentPage /></ProtectedRoute>}
        </Route>
        <Route path="/exam-room/:examId">
          {(params) => <ProtectedRoute studentOnly><ExamRoomPage /></ProtectedRoute>}
        </Route>
        <Route path="/upload">
          <ProtectedRoute studentOnly><UploadPage /></ProtectedRoute>
        </Route>
        <Route path="/chat">
          <ProtectedRoute studentOnly><ChatPage /></ProtectedRoute>
        </Route>
        <Route path="/wallet">
          <ProtectedRoute studentOnly><WalletPage /></ProtectedRoute>
        </Route>
        <Route path="/leaderboard">
          <ProtectedRoute studentOnly><LeaderboardPage /></ProtectedRoute>
        </Route>
        <Route path="/notifications">
          <ProtectedRoute><NotificationsPage /></ProtectedRoute>
        </Route>
        <Route path="/profile/:uid">
          {(params) => <ProtectedRoute><ProfilePage /></ProtectedRoute>}
        </Route>
        <Route path="/settings">
          <ProtectedRoute><SettingsPage /></ProtectedRoute>
        </Route>
        <Route path="/admin">
          <ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>
        </Route>
        <Route path="/ai">
          <ExamRestrictedAIRoute />
        </Route>
        <Route path="/ai-assistant">
          <ExamRestrictedAIRoute />
        </Route>
        <Route path="/gifts">
          <ProtectedRoute studentOnly><GiftsPage /></ProtectedRoute>
        </Route>
        <Route path="/courses">
          <ProtectedRoute studentOnly><CoursesPage /></ProtectedRoute>
        </Route>
        <Route path="/courses/:courseId">
          {(params) => <ProtectedRoute studentOnly><CourseDetailPage /></ProtectedRoute>}
        </Route>
        <Route path="/community">
          <ProtectedRoute><CommunityPage /></ProtectedRoute>
        </Route>
        <Route path="/membership">
          <ProtectedRoute studentOnly><MembershipPage /></ProtectedRoute>
        </Route>
        <Route path="/programming">
          <ProtectedRoute studentOnly><ProgrammingPage /></ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
      <BottomNav />
      <FloatingAIButton />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
