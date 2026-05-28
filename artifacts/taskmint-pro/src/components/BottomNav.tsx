import { Link, useLocation } from "wouter";
import { Home, BookOpen, Crown, MessageSquare, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();
  const { currentUser } = useAuth();

  const hiddenPaths = ["/", "/login", "/signup", "/onboarding", "/admin"];
  const isHidden = hiddenPaths.includes(location) ||
    location.startsWith("/payment/") ||
    location.startsWith("/exam-room/");

  if (!currentUser || isHidden) return null;

  const navItems = [
    { name: "Home", path: "/home", icon: Home },
    { name: "Study", path: "/study", icon: BookOpen },
    { name: "Exams", path: "/premium-exams", icon: Crown },
    { name: "Chat", path: "/chat", icon: MessageSquare },
    { name: "Wallet", path: "/wallet", icon: Wallet },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-4">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.path || location.startsWith(item.path + "/");
          const isExam = item.path === "/premium-exams";
          return (
            <Link key={item.name} href={item.path}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 min-w-[56px]",
                  isActive ? (isExam ? "text-yellow-400" : "text-primary") : "text-muted-foreground hover:text-white"
                )}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6 mb-1",
                    isActive && isExam && "drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]",
                    isActive && !isExam && "drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                  )}
                />
                <span className={cn("text-[10px] font-medium", isActive && isExam && "text-yellow-400")}>
                  {item.name}
                </span>
                {isExam && isActive && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-yellow-400" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
