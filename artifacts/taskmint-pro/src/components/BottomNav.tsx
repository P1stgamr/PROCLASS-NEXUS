import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  BookOpen,
  Crown,
  MessageSquare,
  GraduationCap,
  Wallet,
  Building2,
  LayoutGrid,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminRole, isStudentRole, isTeacherRole } from "@/lib/roles";
import { AnimatePresence, motion } from "framer-motion";

const PRIMARY_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/premium-exams", label: "Exams", icon: Crown, highlight: true },
  { href: "/courses", label: "Courses", icon: GraduationCap },
] as const;

const MORE_ITEMS = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/wallet", label: "Withdraw", icon: Wallet },
  { href: "/community", label: "Community", icon: Building2 },
] as const;

const HIDDEN_PATHS = ["/", "/login", "/signup", "/onboarding", "/admin", "/forgot-password"];

export function BottomNav() {
  const { currentUser, userProfile } = useAuth();
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const hidden = HIDDEN_PATHS.includes(location) ||
    location.startsWith("/payment/") ||
    location.startsWith("/exam-room/");

  const moreRouteActive = MORE_ITEMS.some(
    (item) => location === item.href || location.startsWith(`${item.href}/`),
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [location]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  if (!currentUser || hidden) return null;

  const isStudent = isStudentRole(userProfile?.role);
  const staffRole = isTeacherRole(userProfile?.role) || isAdminRole(userProfile?.role);
  const primaryItems = isStudent
    ? PRIMARY_ITEMS
    : staffRole
      ? [
          { href: "/home", label: "Home", icon: Home },
          { href: "/community", label: "Community", icon: Building2 },
        ]
      : [{ href: "/home", label: "Home", icon: Home }];

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-blur safe-area-bottom"
      >
        <div
          style={{
            gridTemplateColumns: `repeat(${primaryItems.length + (isStudent ? 1 : 0)}, minmax(0, 1fr))`,
          }}
          className={`mx-auto grid items-center gap-1 px-2 py-2 ${
            isStudent ? "max-w-md" : "max-w-xs"
          }`}
        >
          {primaryItems.map((item) => {
            const active = location === item.href;
            const Icon = item.icon;
            const highlight = "highlight" in item && item.highlight;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground"
                } ${highlight && !active ? "text-yellow-400" : ""}`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-2xl bg-primary/15"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div
                  className={`relative z-10 flex h-6 items-center justify-center ${
                    highlight
                      ? `-mt-4 h-10 w-10 rounded-2xl ${
                          active
                            ? "gradient-primary glow-purple"
                            : "border border-yellow-500/30 bg-yellow-500/20"
                        }`
                      : ""
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      highlight
                        ? active
                          ? "text-white"
                          : "text-yellow-400"
                        : ""
                    }`}
                  />
                </div>
                <span
                  className={`relative z-10 max-w-full truncate whitespace-nowrap text-[10px] font-semibold ${
                    highlight ? "mt-0.5" : ""
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {isStudent && (
            <button
              type="button"
              aria-label="More navigation options"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls="bottom-nav-more-sheet"
              onClick={() => setMoreOpen((open) => !open)}
              className={`relative flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-colors ${
                moreOpen || moreRouteActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {(moreOpen || moreRouteActive) && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-2xl bg-primary/15"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <LayoutGrid className="relative z-10 h-5 w-5" />
              <span className="relative z-10">More</span>
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {isStudent && moreOpen && (
          <motion.div
            className="fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close navigation menu"
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.section
              id="bottom-nav-more-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bottom-nav-more-title"
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 48, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-white/10 bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 shadow-2xl backdrop-blur-2xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 id="bottom-nav-more-title" className="text-base font-extrabold">
                    More
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    আরও পেজে যেতে নির্বাচন করুন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close menu"
                  className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {MORE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = location === item.href || location.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 text-left transition-colors ${
                        active
                          ? "border-primary/30 bg-primary/15 text-primary"
                          : "border-white/5 bg-white/[0.04] text-foreground hover:bg-white/10"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1 text-sm font-semibold">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}