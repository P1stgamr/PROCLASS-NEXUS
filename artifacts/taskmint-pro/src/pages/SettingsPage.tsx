import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { GlowButton } from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { Settings, Bell, Shield, LogOut, ChevronRight, Moon, User } from "lucide-react";

type SettingItemBase = {
  icon: React.ElementType;
  label: string;
  description?: string;
};

type ActionItem = SettingItemBase & {
  kind: "action";
  action?: () => void;
  testId?: string;
};

type ToggleItem = SettingItemBase & {
  kind: "toggle";
  value: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
};

type SettingItem = ActionItem | ToggleItem;

export default function SettingsPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleSignOut = async () => {
    await signOut(auth);
    setLocation("/login");
    toast({ title: "Signed out", description: "See you next time!" });
  };

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: "Account",
      items: [
        {
          kind: "action",
          icon: User,
          label: "Profile",
          description: "Edit your name and photo",
          action: () => setLocation(`/profile/${currentUser?.uid}`),
          testId: "btn-setting-profile",
        },
        {
          kind: "action",
          icon: Shield,
          label: "Security",
          description: "Password and account security",
          testId: "btn-setting-security",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          kind: "toggle",
          icon: Moon,
          label: "Dark Mode",
          description: "Always on for the best experience",
          value: darkMode,
          onChange: setDarkMode,
          testId: "toggle-dark-mode",
        },
        {
          kind: "toggle",
          icon: Bell,
          label: "Push Notifications",
          description: "Get notified about contests and rewards",
          value: notifications,
          onChange: setNotifications,
          testId: "toggle-notifications",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-extrabold tracking-tight">Settings</h1>
        </div>
      </div>

      <div className="px-5 py-6 max-w-md mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 glass-card p-5 rounded-2xl"
        >
          <Avatar className="w-14 h-14 ring-2 ring-primary/30">
            <AvatarImage src={userProfile?.photoURL || undefined} />
            <AvatarFallback className="text-xl bg-primary/20">{userProfile?.name?.charAt(0) || "S"}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold">{userProfile?.name || "Student"}</h2>
            <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            <p className="text-xs text-primary mt-1 capitalize">{userProfile?.role || "student"}</p>
          </div>
        </motion.div>

        {sections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + si * 0.1 }}
          >
            <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2 px-1">
              {section.title}
            </h3>
            <div className="glass-card rounded-2xl divide-y divide-white/5 overflow-hidden">
              {section.items.map((item, i) => (
                <button
                  key={i}
                  className="flex items-center gap-4 w-full p-4 hover:bg-white/5 transition-colors text-left"
                  onClick={item.kind === "action" ? item.action : undefined}
                  data-testid={item.testId || `btn-setting-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {item.kind === "toggle" ? (
                    <Switch
                      checked={item.value}
                      onCheckedChange={item.onChange}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlowButton
            variant="outline"
            className="w-full h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={handleSignOut}
            glowColor="none"
            data-testid="btn-sign-out"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </GlowButton>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">
          TaskMint Pro v1.0.0 — Built to inspire
        </p>
      </div>
    </div>
  );
}
