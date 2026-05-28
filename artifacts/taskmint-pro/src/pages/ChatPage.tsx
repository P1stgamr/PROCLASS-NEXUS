import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off, push, set, serverTimestamp } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { ChatBubble } from "@/components/ChatBubble";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Send, Hash } from "lucide-react";

interface Message {
  id: string;
  uid: string;
  text: string;
  timestamp: number;
  userName: string;
  photoURL?: string;
}

export default function ChatPage() {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const msgRef = ref(db, "chats/global/messages");
    const unsub = onValue(msgRef, (snap) => {
      const data = snap.val();
      if (data) {
        const msgs: Message[] = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs.slice(-100));
      } else {
        setMessages([]);
      }
      setLoading(false);
    });
    return () => off(msgRef);
  }, []);

  useEffect(() => {
    const typingRef = ref(db, "chats/global/typing");
    const unsub = onValue(typingRef, (snap) => {
      const data = snap.val();
      if (data && currentUser) {
        const others = Object.entries(data)
          .filter(([uid, _name]) => uid !== currentUser.uid && _name)
          .map(([, _name]) => _name as string);
        setTyping(others);
      } else {
        setTyping([]);
      }
    });
    return () => { off(typingRef); unsub(); };
  }, [currentUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = () => {
    if (!currentUser) return;
    const typingRef = ref(db, `chats/global/typing/${currentUser.uid}`);
    set(typingRef, userProfile?.name || "Someone");
    if (typingTimeoutRef.current !== null) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      set(typingRef, null);
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    const msgRef = ref(db, "chats/global/messages");
    const newMsg = {
      uid: currentUser.uid,
      text: text.trim(),
      timestamp: Date.now(),
      userName: userProfile?.name || "Student",
      photoURL: userProfile?.photoURL || null,
    };
    await push(msgRef, newMsg);
    const typingRef = ref(db, `chats/global/typing/${currentUser.uid}`);
    await set(typingRef, null);
    setText("");
  };

  const showAvatar = (msgs: Message[], idx: number) => {
    if (idx === 0) return true;
    return msgs[idx].uid !== msgs[idx - 1].uid;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 py-4 shrink-0">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Hash className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="font-bold text-base">Global Chat</h1>
            <p className="text-xs text-green-400 font-medium">{messages.length > 0 ? "Active" : "Be the first to chat"}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 max-w-md mx-auto w-full pb-4">
        {loading ? (
          <div className="flex justify-center pt-8"><LoadingSpinner /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Hash className="w-8 h-8 text-blue-400/50" />
            </div>
            <div>
              <p className="font-semibold text-sm">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Say hello and start the conversation!</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChatBubble
                  text={msg.text}
                  timestamp={msg.timestamp}
                  isOwn={msg.uid === currentUser?.uid}
                  userName={msg.userName}
                  photoURL={msg.photoURL}
                  showAvatar={showAvatar(messages, i)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {typing.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 pl-2"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{typing.join(", ")} {typing.length > 1 ? "are" : "is"} typing...</span>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 bg-background/80 backdrop-blur-xl border-t border-white/5 px-4 pb-24 pt-3">
        <form onSubmit={sendMessage} className="flex gap-3 max-w-md mx-auto">
          <Input
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            placeholder="Message #global..."
            className="flex-1 h-11 bg-white/5 border-white/10 rounded-xl"
            data-testid="input-chat-message"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors glow-purple shrink-0"
            data-testid="btn-send-message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
