import { Link, useLocation } from "wouter";
import { Home, BookOpen, Trophy, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();
  const { currentUser } = useAuth();

  // Hide nav on unauthenticated pages or admin
  if (!currentUser || ["/", "/login", "/signup", "/onboarding", "/admin"].includes(location)) {
    return null;
  }

  const navItems = [
    { name: "Home", path: "/home", icon: Home },
    { name: "Study", path: "/study", icon: BookOpen },
    { name: "Contests", path: "/competitions", icon: Trophy },
    { name: "Chat", path: "/chat", icon: MessageSquare },
    { name: "Profile", path: `/profile/${currentUser.uid}`, icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-6">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.name} href={item.path}>
              <div 
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-white"
                )}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <item.icon className={cn("w-6 h-6 mb-1", isActive && "drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
