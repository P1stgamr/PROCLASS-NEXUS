import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ArrowLeft, LayoutDashboard, Users, Crown, FileCheck,
  BookOpen, Trophy, CreditCard, Wallet, Bell, Settings,
  ClipboardList, BarChart3, Target, Gift, Code2, FileSpreadsheet
} from "lucide-react";

export type AdminSection =
  | "dashboard" | "users" | "membership" | "tasks" | "courses"
  | "exams" | "practice" | "payments" | "wallet" | "notify" | "gifts"
  | "analytics" | "logs" | "settings";

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.FC<{ className?: string }>;
  superOnly?: boolean;
  badge?: number;
}

interface AdminLayoutProps {
  section: AdminSection;
  setSection: (s: AdminSection) => void;
  children: ReactNode;
  badges?: Partial<Record<AdminSection, number>>;
}

export default function AdminLayout({ section, setSection, children, badges = {} }: AdminLayoutProps) {
  const [, setLocation] = useLocation();
  const { userProfile } = useAuth();
  const { isSuperAdmin } = useAdminPermissions();

  const roleLabel = userProfile?.role === "owner" ? "Owner" : userProfile?.role === "super_admin" ? "Super Admin" : "Basic Admin";
  const roleColor = isSuperAdmin ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30";

  const nav: NavItem[] = ([
    { id: "dashboard" as AdminSection, label: "Dashboard", icon: LayoutDashboard },
    { id: "users" as AdminSection, label: "Users", icon: Users, superOnly: true },
    { id: "membership" as AdminSection, label: "Membership", icon: Crown, superOnly: true },
    { id: "tasks" as AdminSection, label: "Tasks", icon: Target },
    { id: "courses" as AdminSection, label: "Courses", icon: BookOpen },
    { id: "exams" as AdminSection, label: "Exams", icon: Trophy },
    { id: "practice" as AdminSection, label: "MCQ Bank", icon: FileSpreadsheet },
    { id: "payments" as AdminSection, label: "Payments", icon: CreditCard, superOnly: true, badge: badges.payments },
    { id: "wallet" as AdminSection, label: "Withdraw", icon: Wallet, superOnly: true, badge: badges.wallet },
    { id: "notify" as AdminSection, label: "Notify", icon: Bell },
    { id: "gifts" as AdminSection, label: "Gifts", icon: Gift, superOnly: true },
    { id: "analytics" as AdminSection, label: "Analytics", icon: BarChart3, superOnly: true },
    { id: "logs" as AdminSection, label: "Logs", icon: ClipboardList, superOnly: true },
    { id: "settings" as AdminSection, label: "Settings", icon: Settings, superOnly: true },
  ] as NavItem[]).filter(item => !item.superOnly || isSuperAdmin);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/home")} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-none">Admin Panel</h1>
              <p className="text-[9px] text-muted-foreground">PROCLASS NEXUS Control Center</p>
            </div>
          </div>
          <Badge className={`text-[10px] ${roleColor}`}>{roleLabel}</Badge>
        </div>
      </div>

      {/* Horizontal scrollable nav */}
      <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-1 overflow-x-auto no-scrollbar px-4 py-2">
            {nav.map(item => {
              const Icon = item.icon;
              const active = section === item.id;
              const badgeCount = item.badge ?? 0;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`relative flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-medium transition-all ${
                    active
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center font-bold text-white">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 max-w-5xl mx-auto w-full">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
