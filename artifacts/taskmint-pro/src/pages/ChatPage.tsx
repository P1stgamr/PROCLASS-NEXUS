import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off, push, set, serverTimestamp } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageSquare, Send, Hash, Users, Settings, Smile,
  AtSign, Bold, Plus, ChevronRight, Sparkles
} from "lucide-react";

const CHANNELS = [
  { id: "general", name: "general", icon: Hash, desc: "সবার জন্য সাধারণ আলোচনা", online: 42 },
  { id: "study", name: "study-help", icon: Hash, desc: "পড়াশোনার সাহায্য", online: 18 },
  { id: "coding", name: "coding", icon: Hash, desc: "Programming আলোচনা", online: 25 },
  { id: "contest", name: "contest", icon: Hash, desc: "Contest tips & tricks", online: 11 },
];

interface Message {
  uid: string;
  name: string;
  photoURL?: string;
  text: string;
  timestamp: number;
}

export default function ChatPage() {
  const { currentUser, userProfile } = useAuth();
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<"channels" | "chat">("channels");
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const chatRef = ref(db, `chats/${activeChannel.id}/messages`);
    const unsub = onValue(chatRef, (snap) => {
      const data = snap.val();
      if (data) {
        const msgs = Object.values(data) as Message[];
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgs.slice(-50));
      } else {
        setMessages([]);
      }
    });
    return () => off(chatRef);
  }, [activeChannel.id]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.values(data) as any[];
        setOnlineUsers(arr.slice(0, 8));
      }
    });
    return () => off(usersRef);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUser || sending) return;
    setSending(true);
    const msgRef = push(ref(db, `chats/${activeChannel.id}/messages`));
    await set(msgRef, {
      uid: currentUser.uid,
      name: userProfile?.name || "Student",
      photoURL: userProfile?.photoURL || null,
      text: text.trim(),
      timestamp: Date.now(),
    });
    setText("");
    setSending(false);
  };

  const formatTime = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const groupMessages = (msgs: Message[]) => {
    const groups: Array<{ uid: string; name: string; photoURL?: string; msgs: Message[] }> = [];
    msgs.forEach(m => {
      const last = groups[groups.length - 1];
      if (last && last.uid === m.uid) {
        last.msgs.push(m);
      } else {
        groups.push({ uid: m.uid, name: m.name, photoURL: m.photoURL, msgs: [m] });
      }
    });
    return groups;
  };

  return (
    <div className="flex h-[calc(100dvh-5rem)] bg-background">
      {/* Sidebar / Channel List */}
      <AnimatePresence initial={false}>
        {(view === "channels" || typeof window !== "undefined" && window.innerWidth >= 768) && (
          <motion.div
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`${view === "channels" ? "flex" : "hidden"} md:flex flex-col w-full md:w-64 border-r border-white/5 bg-black/20 shrink-0`}
          >
            <div className="p-4 border-b border-white/5">
              <h2 className="font-extrabold text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Community
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{onlineUsers.length} members online</p>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold px-2 mb-2">Channels</p>
              <div className="space-y-0.5">
                {CHANNELS.map(ch => (
                  <button key={ch.id} onClick={() => { setActiveChannel(ch); setView("chat"); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${activeChannel.id === ch.id ? "bg-primary/20 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
                    <Hash className={`w-4 h-4 shrink-0 ${activeChannel.id === ch.id ? "text-primary" : ""}`} />
                    <span className="text-sm font-medium truncate">{ch.name}</span>
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${activeChannel.id === ch.id ? "bg-primary/30 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                      {ch.online}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold px-2 mb-2">Online Now</p>
                <div className="space-y-1">
                  {onlineUsers.slice(0, 5).map(u => (
                    <div key={u.uid} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5">
                      <div className="relative shrink-0">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback className="text-[10px]">{u.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-background" />
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{u.name?.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className={`${view === "chat" ? "flex" : "hidden"} md:flex flex-col flex-1 min-w-0`}>
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 bg-background/50 backdrop-blur-xl shrink-0">
          <button className="md:hidden p-1.5 rounded-lg hover:bg-white/10" onClick={() => setView("channels")}>
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Hash className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">{activeChannel.name}</h3>
            <p className="text-[10px] text-muted-foreground truncate">{activeChannel.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1" />
              {activeChannel.online} online
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="font-bold text-base">#{activeChannel.name}</p>
                <p className="text-sm text-muted-foreground mt-1">এই channel-এ প্রথম message করুন!</p>
              </div>
            </div>
          ) : (
            groupMessages(messages).map((group, gi) => {
              const isMe = group.uid === currentUser?.uid;
              return (
                <motion.div key={gi} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                  <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                    <AvatarImage src={group.photoURL} />
                    <AvatarFallback className="text-xs">{group.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col gap-1 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      <span className="text-xs font-semibold">{isMe ? "You" : group.name}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(group.msgs[0]?.timestamp)}</span>
                    </div>
                    {group.msgs.map((m, mi) => (
                      <div key={mi} className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? "gradient-primary text-white rounded-tr-sm"
                          : "glass-card rounded-tl-sm"
                      }`}>
                        {m.text}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3.5 border-t border-white/5 bg-background/50 backdrop-blur-xl shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`#${activeChannel.name} তে message করুন...`}
                className="bg-white/5 border-white/10 focus:border-primary/50 rounded-xl h-11 pr-20 text-sm"
                disabled={sending}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
                  <Smile className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button type="submit" disabled={!text.trim() || sending}
              className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all glow-purple">
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
