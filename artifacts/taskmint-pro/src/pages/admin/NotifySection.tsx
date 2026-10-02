import { useState } from "react";
import { ref, push, update } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { logAdminAction } from "@/lib/adminLog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlowButton } from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { sendNotifications } from "@/lib/notifications";
import type { NotificationSendInput } from "@workspace/api-client-react";
import { Bell, Gift, Send, Users } from "lucide-react";

const CARD = "glass-card p-4 rounded-2xl border border-white/10";

interface Props {
  users: any[];
  isSuperAdmin: boolean;
}

export default function NotifySection({ users, isSuperAdmin }: Props) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  // Broadcast notification
  const [notifMsg, setNotifMsg] = useState("");
  const [notifType, setNotifType] = useState<NotificationSendInput["type"]>("system");
  const [targetRole, setTargetRole] = useState("all");
  const [sending, setSending] = useState(false);

  // Single user gift
  const [gift, setGift] = useState({ uid: "", coins: "", message: "" });
  const [sendingGift, setSendingGift] = useState(false);

  // XP award
  const [xpAward, setXpAward] = useState({ uid: "", xp: "", reason: "" });
  const [sendingXp, setSendingXp] = useState(false);

  const sendNotification = async () => {
    if (!notifMsg.trim() || !currentUser) return;
    setSending(true);
    try {
      const targets = targetRole === "all" ? users : users.filter(u => u.role === targetRole);
      const result = await sendNotifications(currentUser, {
        recipients: targets.map((user) => user.uid),
        type: notifType,
        message: notifMsg.trim(),
      });
      await logAdminAction(currentUser.uid, userProfile?.name || "Admin", "notification.send", undefined, { message: notifMsg.slice(0, 80), count: result.writtenRecipients });
      toast({
        title: `Notification sent to ${result.writtenRecipients} user${result.writtenRecipients !== 1 ? "s" : ""} ✅`,
        description: result.pushSent
          ? `Push alert delivered to ${result.pushSent} device${result.pushSent !== 1 ? "s" : ""}.${result.pushFailed ? ` ${result.pushFailed} failed.` : ""}`
          : `${result.noPushToken} user${result.noPushToken !== 1 ? "s" : ""} have no enabled push device; the in-app inbox was updated.`,
      });
      setNotifMsg("");
    } catch (error: any) {
      toast({
        title: "Notification could not be sent",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const sendGift = async () => {
    if (!gift.uid || !gift.coins) { toast({ title: "User UID ও coins দিন", variant: "destructive" }); return; }
    setSendingGift(true);
    try {
      const user = users.find(u => u.uid === gift.uid);
      if (!user) { toast({ title: "User not found", variant: "destructive" }); return; }
      await push(ref(db, `gifts/${gift.uid}`), { coins: parseInt(gift.coins), message: gift.message || "Admin থেকে বিশেষ উপহার 🎁", sentAt: Date.now(), claimed: false, senderName: userProfile?.name || "Admin" });
      let notificationError = "";
      if (currentUser) {
        try {
          await sendNotifications(currentUser, {
            recipients: [gift.uid],
            type: "gift",
            message: "🎁 আপনার জন্য gift এসেছে! Gifts page-এ claim করুন।",
          });
        } catch (error: any) {
          notificationError = error?.message || "Notification could not be delivered.";
        }
      }
      await logAdminAction(currentUser!.uid, userProfile?.name || "Admin", "gift.send", gift.uid, { coins: gift.coins });
      toast({
        title: `${gift.coins} coins gift sent to ${user.name} ✅`,
        description: notificationError ? `Gift saved, but notification failed: ${notificationError}` : undefined,
        variant: notificationError ? "destructive" : "default",
      });
      setGift({ uid: "", coins: "", message: "" });
    } finally { setSendingGift(false); }
  };

  const awardXP = async () => {
    if (!xpAward.uid || !xpAward.xp) { toast({ title: "User UID ও XP দিন", variant: "destructive" }); return; }
    setSendingXp(true);
    try {
      const user = users.find(u => u.uid === xpAward.uid);
      if (!user) { toast({ title: "User not found", variant: "destructive" }); return; }
      const newXP = (user.xp || 0) + parseInt(xpAward.xp);
      await update(ref(db, `users/${xpAward.uid}`), { xp: newXP });
      let notificationError = "";
      if (currentUser) {
        try {
          await sendNotifications(currentUser, {
            recipients: [xpAward.uid],
            type: "xp",
            message: `⚡ +${xpAward.xp} XP awarded by admin${xpAward.reason ? ` — ${xpAward.reason}` : ""}!`,
          });
        } catch (error: any) {
          notificationError = error?.message || "Notification could not be delivered.";
        }
      }
      toast({
        title: `${xpAward.xp} XP awarded to ${user.name} ✅`,
        description: notificationError ? `XP saved, but notification failed: ${notificationError}` : undefined,
        variant: notificationError ? "destructive" : "default",
      });
      setXpAward({ uid: "", xp: "", reason: "" });
    } finally { setSendingXp(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold mb-1">Notifications & Rewards</h2>
        <p className="text-xs text-muted-foreground">Send notifications, gifts, and XP to users</p>
      </div>

      {/* Broadcast */}
      <div className={CARD + " space-y-3"}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-sm">Broadcast Notification</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">{users.length} users</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
            <select value={notifType} onChange={e => setNotifType(e.target.value as NotificationSendInput["type"])} className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
              {["system","contest","coin","gift","xp","announcement"].map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Target</Label>
            <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white appearance-none">
              <option value="all" className="bg-gray-900">All Users</option>
              {["student","moderator","admin","super_admin"].map(r => <option key={r} value={r} className="bg-gray-900">{r}</option>)}
            </select>
          </div>
        </div>
        <Textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Notification message…" className="bg-white/5 border-white/10 resize-none h-20 text-sm" />
        <GlowButton className="w-full h-9 text-sm" onClick={sendNotification} disabled={sending || !notifMsg.trim()}>
          <Send className="w-3.5 h-3.5 mr-1.5" />{sending ? "Sending…" : "Send Notification"}
        </GlowButton>
      </div>

      {/* Gift coins */}
      {isSuperAdmin && (
        <div className={CARD + " space-y-3"}>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-yellow-400" />
            <h3 className="font-bold text-sm">Send Gift Coins</h3>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">User UID</Label>
            <Input value={gift.uid} onChange={e => setGift(p => ({ ...p, uid: e.target.value }))} placeholder="Paste user UID here" className="h-9 bg-white/5 border-white/10 text-sm font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Coins</Label>
              <Input type="number" value={gift.coins} onChange={e => setGift(p => ({ ...p, coins: e.target.value }))} placeholder="100" className="h-9 bg-white/5 border-white/10 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Message (optional)</Label>
              <Input value={gift.message} onChange={e => setGift(p => ({ ...p, message: e.target.value }))} placeholder="Special gift 🎁" className="h-9 bg-white/5 border-white/10 text-sm" />
            </div>
          </div>
          <GlowButton className="w-full h-9 text-sm" onClick={sendGift} disabled={sendingGift}>
            <Gift className="w-3.5 h-3.5 mr-1.5" />{sendingGift ? "Sending…" : "Send Gift"}
          </GlowButton>
        </div>
      )}

      {/* Award XP */}
      {isSuperAdmin && (
        <div className={CARD + " space-y-3"}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm">Award XP to User</h3>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">User UID</Label>
            <Input value={xpAward.uid} onChange={e => setXpAward(p => ({ ...p, uid: e.target.value }))} placeholder="Paste user UID" className="h-9 bg-white/5 border-white/10 text-sm font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">XP Amount</Label>
              <Input type="number" value={xpAward.xp} onChange={e => setXpAward(p => ({ ...p, xp: e.target.value }))} placeholder="500" className="h-9 bg-white/5 border-white/10 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Reason (optional)</Label>
              <Input value={xpAward.reason} onChange={e => setXpAward(p => ({ ...p, reason: e.target.value }))} placeholder="Contest winner" className="h-9 bg-white/5 border-white/10 text-sm" />
            </div>
          </div>
          <GlowButton className="w-full h-9 text-sm" onClick={awardXP} disabled={sendingXp}>
            <Send className="w-3.5 h-3.5 mr-1.5" />{sendingXp ? "Awarding…" : "Award XP"}
          </GlowButton>
        </div>
      )}
    </div>
  );
}
