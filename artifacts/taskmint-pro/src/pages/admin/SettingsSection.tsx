import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { logAdminAction } from "@/lib/adminLog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowButton } from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield, Save, Zap, Bell } from "lucide-react";

const CARD = "glass-card p-4 rounded-2xl border border-white/10";
const FIELD = "h-9 bg-white/5 border-white/10 text-sm";

interface PlatformSettings {
  maintenanceMode: boolean;
  registrationOpen: boolean;
  aiEnabled: boolean;
  geminiModel: string;
  maxCoinsPerDay: string;
  withdrawMinAmount: string;
  withdrawMaxAmount: string;
  referralBonus: string;
  platformName: string;
  supportEmail: string;
  announcementBanner: string;
  announcementEnabled: boolean;
}

const defaults: PlatformSettings = {
  maintenanceMode: false,
  registrationOpen: true,
  aiEnabled: true,
  geminiModel: "gemini-1.5-flash-8b",
  maxCoinsPerDay: "500",
  withdrawMinAmount: "50",
  withdrawMaxAmount: "5000",
  referralBonus: "100",
  platformName: "ProClass Nexus",
  supportEmail: "",
  announcementBanner: "",
  announcementEnabled: false,
};

export default function SettingsSection() {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings>(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "platformSettings"), snap => {
      if (snap.val()) setSettings({ ...defaults, ...snap.val() });
    });
    return () => unsub();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await update(ref(db, "platformSettings"), { ...settings, updatedAt: Date.now() });
      await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "settings.update", undefined, { by: userProfile?.name });
      toast({ title: "Settings saved ✅" });
    } finally { setSaving(false); }
  };

  const toggle = (key: keyof PlatformSettings) => setSettings(p => ({ ...p, [key]: !p[key] }));

  const ToggleRow = ({ label, desc, settingKey }: { label: string; desc?: string; settingKey: keyof PlatformSettings }) => (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
      </div>
      <button
        onClick={() => toggle(settingKey)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${settings[settingKey] ? "bg-primary" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings[settingKey] ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold mb-1">Platform Settings</h2>
        <p className="text-xs text-muted-foreground">Super Admin only — settings stored in Firebase</p>
      </div>

      {/* Platform identity */}
      <div className={CARD + " space-y-4"}>
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" />
          <h3 className="font-bold text-sm">Platform Identity</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Platform Name</Label>
            <Input value={settings.platformName} onChange={e => setSettings(p => ({ ...p, platformName: e.target.value }))} className={FIELD} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Support Email</Label>
            <Input type="email" value={settings.supportEmail} onChange={e => setSettings(p => ({ ...p, supportEmail: e.target.value }))} placeholder="support@example.com" className={FIELD} />
          </div>
        </div>
      </div>

      {/* Announcement banner */}
      <div className={CARD + " space-y-4"}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-yellow-400" />
          <h3 className="font-bold text-sm">Announcement Banner</h3>
        </div>
        <ToggleRow label="Enable Banner" desc="Show announcement at top of the app" settingKey="announcementEnabled" />
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Banner Message</Label>
          <Input value={settings.announcementBanner} onChange={e => setSettings(p => ({ ...p, announcementBanner: e.target.value }))} placeholder="e.g. New exam starting tomorrow! 🎉" className={FIELD} />
        </div>
      </div>

      {/* Access control */}
      <div className={CARD + " space-y-4"}>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          <h3 className="font-bold text-sm">Access Control</h3>
        </div>
        <ToggleRow label="Maintenance Mode" desc="Blocks all user access (admin bypass)" settingKey="maintenanceMode" />
        <ToggleRow label="Open Registration" desc="Allow new users to sign up" settingKey="registrationOpen" />
      </div>

      {/* AI settings */}
      <div className={CARD + " space-y-4"}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-sm">AI Features</h3>
        </div>
        <ToggleRow label="Enable AI Assistant" desc="Gemini-powered AI chat for all users" settingKey="aiEnabled" />
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Gemini Model</Label>
          <select value={settings.geminiModel} onChange={e => setSettings(p => ({ ...p, geminiModel: e.target.value }))} className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
            {["gemini-1.5-flash-8b","gemini-1.5-flash","gemini-1.5-pro","gemini-2.0-flash"].map(m => <option key={m} value={m} className="bg-gray-900">{m}</option>)}
          </select>
        </div>
      </div>

      {/* Economy settings */}
      <div className={CARD + " space-y-4"}>
        <div className="flex items-center gap-2">
          <span className="text-base">🪙</span>
          <h3 className="font-bold text-sm">Economy & Rewards</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Max Coins/Day</Label>
            <Input type="number" value={settings.maxCoinsPerDay} onChange={e => setSettings(p => ({ ...p, maxCoinsPerDay: e.target.value }))} className={FIELD} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Referral Bonus (coins)</Label>
            <Input type="number" value={settings.referralBonus} onChange={e => setSettings(p => ({ ...p, referralBonus: e.target.value }))} className={FIELD} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Min Withdraw (৳)</Label>
            <Input type="number" value={settings.withdrawMinAmount} onChange={e => setSettings(p => ({ ...p, withdrawMinAmount: e.target.value }))} className={FIELD} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Max Withdraw (৳)</Label>
            <Input type="number" value={settings.withdrawMaxAmount} onChange={e => setSettings(p => ({ ...p, withdrawMaxAmount: e.target.value }))} className={FIELD} />
          </div>
        </div>
      </div>

      <GlowButton className="w-full h-10 text-sm" onClick={save} disabled={saving}>
        <Save className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save All Settings"}
      </GlowButton>
    </div>
  );
}
