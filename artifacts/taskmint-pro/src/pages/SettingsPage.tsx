import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { signOut, updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { ref, update } from "firebase/database";
import { auth, db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { GlowButton } from "@/components/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Bell, Shield, LogOut, ChevronRight,
  Moon, User, X, Eye, EyeOff, Save, Camera,
} from "lucide-react";

export default function SettingsPage() {
  const { currentUser, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const [editModal, setEditModal] = useState(false);
  const [securityModal, setSecurityModal] = useState(false);

  const [editName, setEditName] = useState(userProfile?.name || "");
  const [editPhoto, setEditPhoto] = useState(userProfile?.photoURL || "");
  const [editLoading, setEditLoading] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    setLocation("/login");
    toast({ title: "Signed out", description: "See you next time!" });
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !editName.trim()) return;
    setEditLoading(true);
    try {
      await updateProfile(currentUser, {
        displayName: editName.trim(),
        photoURL: editPhoto.trim() || null,
      });
      await update(ref(db, `users/${currentUser.uid}`), {
        name: editName.trim(),
        photoURL: editPhoto.trim() || null,
      });
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
      setEditModal(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser || !currentUser.email) return;
    if (!currentPw || !newPw || !confirmPw) {
      toast({ title: "সব field পূরণ করুন", variant: "destructive" }); return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "নতুন password মেলেনি", variant: "destructive" }); return;
    }
    if (newPw.length < 6) {
      toast({ title: "Password কমপক্ষে ৬ character হতে হবে", variant: "destructive" }); return;
    }
    setPwLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPw);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPw);
      toast({ title: "Password পরিবর্তন হয়েছে!" });
      setSecurityModal(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      const msg = err.code === "auth/wrong-password" ? "বর্তমান password ভুল" :
        err.code === "auth/too-many-requests" ? "অনেকবার চেষ্টা করেছেন, পরে try করুন" : err.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  };

  const isGoogleUser = currentUser?.providerData?.some(p => p.providerId === "google.com");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-extrabold tracking-tight">Settings</h1>
        </div>
      </div>

      <div className="px-5 py-6 max-w-md mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 glass-card p-5 rounded-2xl">
          <Avatar className="w-14 h-14 ring-2 ring-primary/30">
            <AvatarImage src={userProfile?.photoURL || undefined} />
            <AvatarFallback className="text-xl bg-primary/20">{userProfile?.name?.charAt(0) || "S"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold truncate">{userProfile?.name || "Student"}</h2>
            <p className="text-sm text-muted-foreground truncate">{currentUser?.email}</p>
            <p className="text-xs text-primary mt-1 capitalize">{userProfile?.role || "student"}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2 px-1">Account</h3>
          <div className="glass-card rounded-2xl divide-y divide-white/5 overflow-hidden">
            <button onClick={() => { setEditName(userProfile?.name || ""); setEditPhoto(userProfile?.photoURL || ""); setEditModal(true); }}
              className="flex items-center gap-4 w-full p-4 hover:bg-white/5 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Profile Edit</p>
                <p className="text-xs text-muted-foreground mt-0.5">নাম ও ছবি পরিবর্তন করুন</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button onClick={() => !isGoogleUser ? setSecurityModal(true) : toast({ title: "Google Account", description: "Google দিয়ে login করলে password change করা যায় না।" })}
              className="flex items-center gap-4 w-full p-4 hover:bg-white/5 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Security</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isGoogleUser ? "Google account দিয়ে login করা" : "Password পরিবর্তন করুন"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2 px-1">Preferences</h3>
          <div className="glass-card rounded-2xl divide-y divide-white/5 overflow-hidden">
            {[
              { icon: Moon, label: "Dark Mode", desc: "সর্বদা চালু থাকে", value: darkMode, onChange: setDarkMode },
              { icon: Bell, label: "Notifications", desc: "Contest ও reward এর notification", value: notifications, onChange: setNotifications },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 w-full p-4">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Switch checked={item.value} onCheckedChange={item.onChange} />
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlowButton variant="outline"
            className="w-full h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={handleSignOut} glowColor="none">
            <LogOut className="w-4 h-4 mr-2" />Sign Out
          </GlowButton>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">TaskMint Pro v1.0.0 — Built to inspire</p>
      </div>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4"
            onClick={() => setEditModal(false)}>
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-background border border-white/10 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Profile Edit</h2>
                <button onClick={() => setEditModal(false)} className="p-2 rounded-xl hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="w-20 h-20 ring-2 ring-primary/40">
                    <AvatarImage src={editPhoto || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/20">{editName?.charAt(0) || "S"}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">নাম</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)}
                    placeholder="আপনার নাম লিখুন"
                    className="bg-white/5 border-white/10 focus:border-primary h-12" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Photo URL (optional)</Label>
                  <Input value={editPhoto} onChange={e => setEditPhoto(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="bg-white/5 border-white/10 focus:border-primary h-12" />
                </div>
              </div>

              <GlowButton className="w-full h-12" onClick={handleSaveProfile} disabled={editLoading || !editName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                {editLoading ? "Saving..." : "Save করুন"}
              </GlowButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security / Password Modal */}
      <AnimatePresence>
        {securityModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4"
            onClick={() => setSecurityModal(false)}>
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-background border border-white/10 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Password পরিবর্তন</h2>
                <button onClick={() => setSecurityModal(false)} className="p-2 rounded-xl hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { label: "বর্তমান Password", value: currentPw, onChange: setCurrentPw, placeholder: "••••••••" },
                  { label: "নতুন Password", value: newPw, onChange: setNewPw, placeholder: "কমপক্ষে ৬ character" },
                  { label: "Confirm Password", value: confirmPw, onChange: setConfirmPw, placeholder: "আবার লিখুন" },
                ].map((f, i) => (
                  <div key={i}>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{f.label}</Label>
                    <div className="relative">
                      <Input type={showPw ? "text" : "password"} value={f.value}
                        onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                        className="bg-white/5 border-white/10 focus:border-primary h-12 pr-10" />
                      {i === 0 && (
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <GlowButton className="w-full h-12" onClick={handleChangePassword} disabled={pwLoading}>
                <Shield className="w-4 h-4 mr-2" />
                {pwLoading ? "Updating..." : "Password পরিবর্তন করুন"}
              </GlowButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
