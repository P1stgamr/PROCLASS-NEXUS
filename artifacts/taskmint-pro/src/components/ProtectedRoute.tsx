import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { currentUser, userProfile, loading } = useAuth();

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

  if (requireAdmin && userProfile?.role !== "admin") {
    return <Redirect to="/home" />;
  }

  return <>{children}</>;
}
