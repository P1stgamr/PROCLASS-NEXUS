import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, off, push, set, remove, update } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { streamGemini } from "@/lib/gemini";
import { getActiveExam } from "@/lib/examMode";
import { GlowButton } from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot, Send, Plus, Trash2, ArrowLeft, Copy, Check,
  BookOpen, Code2, FileText, Zap, Trophy, ChevronRight,
  RotateCcw, Download, Mic, MicOff, Sparkles, MessageSquare,
} from "lucide-react";

type Message = { id: string; role: "user" | "assistant"; content: string; timestamp: number };
type Chat = { id: string; title: string; createdAt: number; lastMessage?: string };

const QUICK_PROMPTS = [
  { icon: BookOpen, label: "Study Help", color: "text-blue-400", prompt: "আমাকে পড়াশোনায় help করো। আমি কোন topic নিয়ে কথা বলতে পারি?" },
  { icon: Code2, label: "Code করো", color: "text-green-400", prompt: "আমাকে Python দিয়ে একটা simple program লিখতে help করো।" },
  { icon: FileText, label: "Notes বানাও", color: "text-purple-400", prompt: "আমার জন্য একটা topic-এর উপর সুন্দর notes বানাও।" },
  { icon: Trophy, label: "Quiz দাও", color: "text-yellow-400", prompt: "আমাকে SSC Math-এর উপর ৫টা MCQ quiz question দাও।" },
  { icon: Zap, label: "Study Plan", color: "text-orange-400", prompt: "আমার জন্য ৭ দিনের একটা study plan বানাও।" },
  { icon: Sparkles, label: "Explain করো", color: "text-pink-400", prompt: "Newton-এর গতিসূত্র সহজভাবে বুঝিয়ে দাও।" },
];

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative my-2 rounded-xl overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <span className="text-xs text-muted-foreground font-mono">{lang || "code"}</span>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs text-green-300 bg-black/40"><code>{code}</code></pre>
    </div>
  );
}

function MessageBubble({ msg, onCopy }: { msg: Message; onCopy: (text: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isUser ? "bg-primary/30 border border-primary/40" : "bg-gradient-to-br from-violet-600 to-blue-600"}`}>
        {isUser ? <span className="text-xs font-bold">U</span> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[82%] group relative ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? "bg-primary/20 border border-primary/30 rounded-tr-sm" : "bg-white/5 border border-white/10 rounded-tl-sm"}`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const inline = !className;
                  const lang = className?.replace("language-", "");
                  if (!inline) {
                    return <CodeBlock code={String(children).replace(/\n$/, "")} lang={lang} />;
                  }
                  return <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-yellow-300" {...props}>{children}</code>;
                },
                p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }: any) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                li: ({ children }: any) => <li className="text-sm">{children}</li>,
                h1: ({ children }: any) => <h1 className="text-base font-bold mb-2 mt-1">{children}</h1>,
                h2: ({ children }: any) => <h2 className="text-sm font-bold mb-1.5 mt-1 text-primary">{children}</h2>,
                h3: ({ children }: any) => <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>,
                strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
                blockquote: ({ children }: any) => <blockquote className="border-l-2 border-primary/50 pl-3 my-2 italic text-muted-foreground">{children}</blockquote>,
                table: ({ children }: any) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
                th: ({ children }: any) => <th className="border border-white/20 px-2 py-1 bg-white/10 font-bold">{children}</th>,
                td: ({ children }: any) => <td className="border border-white/10 px-2 py-1">{children}</td>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
        <button
          onClick={() => onCopy(msg.content)}
          className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 px-2 py-0.5 rounded-lg bg-white/5 text-xs text-muted-foreground hover:text-white flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />Copy
        </button>
      </div>
    </motion.div>
  );
}

export default function AIAssistantPage() {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeExam, setActiveExam] = useState(getActiveExam);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const checkExamMode = () => setActiveExam(getActiveExam());
    checkExamMode();
    const interval = window.setInterval(checkExamMode, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const chatRef = ref(db, `aiChats/${currentUser.uid}`);
    const unsub = onValue(chatRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        arr.sort((a: any, b: any) => b.createdAt - a.createdAt);
        setChats(arr);
      }
    }, () => setChatError("Chat history could not be loaded. You can still start a new chat."));
    return () => off(chatRef);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !activeChatId) { setMessages([]); return; }
    const msgRef = ref(db, `aiMessages/${activeChatId}`);
    const unsub = onValue(msgRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        arr.sort((a: any, b: any) => a.timestamp - b.timestamp);
        setMessages(arr);
      } else {
        setMessages([]);
      }
    }, () => setChatError("This chat could not be loaded. Please start a new chat."));
    return () => off(msgRef);
  }, [currentUser, activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const createNewChat = async () => {
    if (!currentUser) return;
    try {
      const chatRef = push(ref(db, `aiChats/${currentUser.uid}`));
      await set(chatRef, { title: "New Chat", createdAt: Date.now() });
      setActiveChatId(chatRef.key);
      setShowSidebar(false);
      setMessages([]);
      setChatError(null);
    } catch (error: any) {
      setChatError(error.message || "Could not create a chat.");
      toast({ title: "Could not create chat", description: error.message, variant: "destructive" });
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!currentUser) return;
    try {
      await remove(ref(db, `aiChats/${currentUser.uid}/${chatId}`));
      await remove(ref(db, `aiMessages/${chatId}`));
      if (activeChatId === chatId) { setActiveChatId(null); setMessages([]); }
    } catch (error: any) {
      setChatError(error.message || "Could not delete this chat.");
      toast({ title: "Could not delete chat", description: error.message, variant: "destructive" });
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming || !currentUser) return;
    setStreaming(true);
    setStreamingContent("");
    setChatError(null);
    try {
      let chatId = activeChatId;
      if (!chatId) {
        const chatRef = push(ref(db, `aiChats/${currentUser.uid}`));
        const title = text.slice(0, 40) + (text.length > 40 ? "..." : "");
        await set(chatRef, { title, createdAt: Date.now(), lastMessage: text.slice(0, 60) });
        chatId = chatRef.key!;
        setActiveChatId(chatId);
      }
      const userMsg: Omit<Message, "id"> = { role: "user", content: text.trim(), timestamp: Date.now() };
      await push(ref(db, `aiMessages/${chatId}`), userMsg);
      const isFirst = messages.length === 0;
      if (isFirst) {
        const title = text.slice(0, 45) + (text.length > 45 ? "..." : "");
        await update(ref(db, `aiChats/${currentUser.uid}/${chatId}`), { title, lastMessage: text.slice(0, 60) });
      }
      setInput("");
      let full = "";
      for await (const delta of streamGemini(messages, userMsg.content)) {
        full += delta;
        setStreamingContent(full);
      }
      const assistantMsg: Omit<Message, "id"> = { role: "assistant", content: full, timestamp: Date.now() };
      await push(ref(db, `aiMessages/${chatId}`), assistantMsg);
      await update(ref(db, `aiChats/${currentUser.uid}/${chatId}`), { lastMessage: full.slice(0, 60) });
    } catch (err: any) {
      const message = err.message || "The AI service failed. Please try again.";
      setChatError(message);
      toast({ title: "AI Error", description: message, variant: "destructive" });
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }, [activeChatId, messages, streaming, currentUser, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const allMessages: Message[] = streaming
    ? [...messages, { id: "streaming", role: "assistant", content: streamingContent || "●●●", timestamp: Date.now() }]
    : messages;

  if (activeExam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="glass-card rounded-3xl p-6 max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold">AI exam চলাকালীন বন্ধ</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Exam শেষ না হওয়া পর্যন্ত TaskMint AI ব্যবহার করা যাবে না।
            </p>
          </div>
          <GlowButton className="w-full" onClick={() => setLocation(`/exam-room/${activeExam.examId}`)}>
            Exam-এ ফিরে যান
          </GlowButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/home")} className="p-2 rounded-xl hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm">TaskMint AI</h1>
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />Online
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-xs hover:bg-white/10 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button onClick={createNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors">
              <Plus className="w-3.5 h-3.5" />New
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 max-w-2xl mx-auto w-full relative">
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-40 bg-background/95 backdrop-blur-xl border-r border-white/10 flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-bold text-sm">Chat History</h2>
                <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                <button onClick={() => { createNewChat(); setShowSidebar(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/20 text-primary text-sm hover:bg-primary/30 transition-colors">
                  <Plus className="w-4 h-4" />New Chat
                </button>
                {chats.map((chat) => (
                  <div key={chat.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${activeChatId === chat.id ? "bg-white/10" : "hover:bg-white/5"}`}
                    onClick={() => { setActiveChatId(chat.id); setShowSidebar(false); }}>
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chat.title}</p>
                      {chat.lastMessage && <p className="text-[10px] text-muted-foreground truncate">{chat.lastMessage}</p>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
            {chatError && (
              <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <div className="flex items-start justify-between gap-3">
                  <p>{chatError}</p>
                  <button onClick={() => setChatError(null)} className="text-xs text-red-300 hover:text-white">Dismiss</button>
                </div>
              </div>
            )}
            {allMessages.length === 0 ? (
              <div className="py-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-8">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-violet-500/30">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-extrabold mb-2">TaskMint AI</h2>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    আমি আপনার AI সহকারী। পড়াশোনা, programming, বা যেকোনো বিষয়ে জিজ্ঞেস করুন।
                  </p>
                </motion.div>
                <div className="grid grid-cols-2 gap-2.5">
                  {QUICK_PROMPTS.map((p, i) => (
                    <motion.button key={i}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      onClick={() => sendMessage(p.prompt)}
                      className="glass-card p-3.5 rounded-2xl text-left flex items-start gap-2.5 hover:bg-white/10 transition-colors group">
                      <p.icon className={`w-4 h-4 shrink-0 mt-0.5 ${p.color}`} />
                      <div>
                        <p className="text-xs font-semibold">{p.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{p.prompt}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              allMessages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} onCopy={copyText} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 pb-24 pt-3 border-t border-white/5">
            <div className="flex gap-2 items-end bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-primary/50 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="যেকোনো প্রশ্ন করুন... (Enter to send, Shift+Enter for new line)"
                rows={1}
                disabled={streaming}
                className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/60 py-1.5 px-1 max-h-32 min-h-[36px]"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 128) + "px";
                }}
                data-testid="ai-input"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                data-testid="ai-send"
              >
                {streaming ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
              Powered by Gemini · TaskMint AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
