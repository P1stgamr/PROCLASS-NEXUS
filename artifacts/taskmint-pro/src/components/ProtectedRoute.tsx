import { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AppRole, isAdminRole, isTeacherRole } from "@/lib/roles";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireProfile?: boolean;
  allowedRoles?: AppRole[];
  studentOnly?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireProfile = true, allowedRoles, studentOnly = false }: ProtectedRouteProps) {
  const { currentUser, userProfile, loading, needsProfileSetup } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  if (requireProfile && needsProfileSetup && location !== "/profile/setup") {
    return <Redirect to="/profile/setup" />;
  }

  if (requireAdmin && (!userProfile || !isAdminRole(userProfile.role))) {
    return <Redirect to="/home" />;
  }
  if (allowedRoles && (!userProfile || !allowedRoles.includes(userProfile.role))) {
    return <Redirect to={isTeacherRole(userProfile?.role) ? "/community" : "/home"} />;
  }
  if (studentOnly && userProfile?.role !== "student") {
    return <Redirect to="/community" />;
  }

  return <>{children}</>;
}
