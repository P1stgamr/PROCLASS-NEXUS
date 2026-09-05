import { Link, useLocation } from "wouter";
import { Home, BookOpen, Crown, MessageSquare, GraduationCap, Wallet, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminRole, isStudentRole, isTeacherRole } from "@/lib/roles";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/premium-exams", label: "Exams", icon: Crown, highlight: true },
  { href: "/courses", label: "Courses", icon: GraduationCap },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/wallet", label: "Withdraw", icon: Wallet },
  { href: "/community", label: "Community", icon: Building2 },
];

const HIDDEN_PATHS = ["/", "/login", "/signup", "/onboarding", "/admin", "/forgot-password"];

export function BottomNav() {
  const { currentUser, userProfile } = useAuth();
  const [location] = useLocation();

  const hidden = HIDDEN_PATHS.includes(location) ||
    location.startsWith("/payment/") ||
    location.startsWith("/exam-room/");

  if (!currentUser || hidden) return null;
  const items = isTeacherRole(userProfile?.role) || isAdminRole(userProfile?.role)
    ? NAV_ITEMS.filter((item) => ["/home", "/community"].includes(item.href))
    : isStudentRole(userProfile?.role) ? NAV_ITEMS : NAV_ITEMS.filter((item) => ["/home", "/community"].includes(item.href));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-blur safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {items.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <button className={`relative flex flex-col items-center justify-center gap-1 min-w-[52px] py-2 px-2 rounded-2xl transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              } ${item.highlight && !active ? "text-yellow-400" : ""}`}>
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-2xl bg-primary/15"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={`relative z-10 ${item.highlight ? `w-12 h-12 rounded-2xl flex items-center justify-center -mt-6 ${active ? "gradient-primary glow-purple" : "bg-yellow-500/20 border border-yellow-500/30"}` : ""}`}>
                  <item.icon className={`${item.highlight ? "w-5 h-5" : "w-5 h-5"} ${item.highlight && active ? "text-white" : item.highlight ? "text-yellow-400" : ""}`} />
                </div>
                <span className={`relative z-10 text-[10px] font-semibold ${item.highlight ? "mt-1" : ""}`}>{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
