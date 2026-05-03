"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  BrainCircuit, 
  Send, 
  Sidebar as SidebarIcon, 
  Plus, 
  MessageSquare, 
  History,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Layout,
  Bell,
  Search,
  Zap,
  Loader2,
  Trash2
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
  created_at?: string;
};

export default function PatronChatPage() {
  const { userRole } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && userRole !== 'patron') {
      router.push('/');
    }
  }, [userRole, router, mounted]);

  // Scroll to bottom on chat update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations_patron')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      if (data && data.length > 0) {
        setChatMessages(data.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          text: m.content,
          created_at: m.created_at
        })));
        
        // Grouping user messages for sidebar history
        const userMsgs = data.filter((m: any) => m.role === 'user');
        setHistory(userMsgs.reverse()); // Last messages first in sidebar
      } else {
        setChatMessages([
          { role: 'model', text: "Bienvenue dans Riverside Intelligence. Je suis prêt à analyser vos opérations stratégiques. Que souhaitez-vous examiner ?" }
        ]);
      }
    } catch (err) {
      console.error("Erreur historique:", err);
    }
  };

  useEffect(() => {
    if (mounted) fetchChatHistory();
  }, [mounted]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput || chatLoading) return;

    const userMsg = userInput;
    setUserInput("");
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg, created_at: new Date().toISOString() }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setChatMessages(prev => [...prev, { role: 'model', text: data.text, created_at: new Date().toISOString() }]);
      fetchChatHistory(); // Refresh history sidebar
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'model', text: `Erreur : ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const groupHistoryByDate = (historyItems: any[]) => {
    const groups: { [key: string]: any[] } = {};
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    
    historyItems.forEach(item => {
      const date = new Date(item.created_at);
      const dateStr = date.toLocaleDateString();
      let label = dateStr;
      
      if (dateStr === todayStr) label = "Aujourd'hui";
      else {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (dateStr === yesterday.toLocaleDateString()) label = "Hier";
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return groups;
  };

  const groupedHistory = groupHistoryByDate(history);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside 
        className={cn(
          "bg-slate-50 border-r border-slate-100 flex flex-col transition-all duration-300 ease-in-out relative z-30",
          isSidebarOpen ? "w-72" : "w-0"
        )}
      >
        <div className={cn("flex flex-col h-full overflow-hidden", !isSidebarOpen && "invisible")}>
          {/* Sidebar Header */}
          <div className="p-4 mb-4">
            <button 
              onClick={() => {
                setChatMessages([{ role: 'model', text: "Comment puis-je vous aider aujourd'hui ?" }]);
                // Optional: Clear table if user wants new session
              }}
              className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-full text-sm font-black text-slate-700 hover:shadow-md transition-all w-full group"
            >
              <Plus size={20} className="text-riverside-red group-hover:rotate-90 transition-transform" />
              Nouvelle discussion
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-6 scrollbar-hide">
            {Object.entries(groupedHistory).map(([label, items]) => (
              <div key={label} className="space-y-1">
                <h4 className="px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{label}</h4>
                {items.map((item, idx) => (
                  <button 
                    key={idx}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-200/50 transition-colors text-left group"
                  >
                    <MessageSquare size={14} className="text-slate-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 truncate flex-1 uppercase tracking-tight">
                      {item.content.length > 25 ? item.content.substring(0, 25) + "..." : item.content}
                    </span>
                    <MoreVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-100">
             <Link href="/patron">
               <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-200/50 text-xs font-black uppercase text-slate-500 tracking-widest transition-colors">
                 <Layout size={16} /> Tableau de bord
               </button>
             </Link>
          </div>
        </div>

        {/* Floating Sidebar Toggle Button (Inside Sidebar but accessible) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute -right-12 top-6 w-10 h-10 bg-white border border-slate-100 rounded-xl shadow-lg flex items-center justify-center hover:text-riverside-red transition-all z-40"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col relative h-full bg-white">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-50 flex items-center justify-between px-6 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            {isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                title="Masquer le menu"
              >
                <SidebarIcon size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-riverside-red rounded-lg flex items-center justify-center text-white shadow-lg shadow-red-100">
                <BrainCircuit size={18} />
              </div>
              <h1 className="text-sm font-black uppercase text-slate-950 tracking-tighter">Riverside Intelligence</h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden md:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connecté • Strategist v4</span>
             </div>
             <div className="w-px h-6 bg-slate-100 hidden md:block" />
             <Link href="/patron">
               <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-400 hover:bg-riverside-red hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest group">
                 <Layout size={16} />
                 <span>Quitter Chat</span>
               </button>
             </Link>
             <ShieldCheck size={20} className="text-riverside-red" />
          </div>
        </header>

        {/* Chat Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto pt-8 pb-32 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto w-full px-6 space-y-12">
            {chatMessages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i}
                className={cn(
                  "flex gap-6",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "flex gap-4 max-w-[85%]",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-sm",
                    msg.role === 'user' ? "bg-slate-900 text-white" : "bg-red-50 text-riverside-red border border-red-100"
                  )}>
                    {msg.role === 'user' ? <ShieldCheck size={16} /> : <BrainCircuit size={16} />}
                  </div>
                  
                  <div className={cn(
                    "p-5 rounded-2xl text-[15px] leading-relaxed text-left whitespace-pre-wrap",
                    msg.role === 'user' 
                      ? "bg-slate-50 text-slate-800 border border-slate-100" 
                      : "bg-white text-slate-800"
                  )}>
                    {msg.text.replace(/[*#]/g, '')}
                  </div>
                </div>
              </motion.div>
            ))}

            {chatLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-riverside-red border border-red-100">
                  <BrainCircuit size={16} className="animate-pulse" />
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl flex gap-1.5 items-center">
                   <div className="w-1.5 h-1.5 bg-riverside-red rounded-full animate-bounce [animation-delay:0s]" />
                   <div className="w-1.5 h-1.5 bg-riverside-red rounded-full animate-bounce [animation-delay:0.2s]" />
                   <div className="w-1.5 h-1.5 bg-riverside-red rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area (Gemini Style) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <div className="max-w-3xl mx-auto">
            <form 
              onSubmit={handleChat}
              className="relative bg-slate-50 border border-slate-200 rounded-[2rem] p-1.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group pr-3"
            >
              <div className="flex items-center gap-2">
                <button type="button" className="p-3 text-slate-400 hover:text-riverside-red transition-colors">
                  <Plus size={20} />
                </button>
                <textarea 
                  value={userInput}
                  onChange={(e) => {
                    setUserInput(e.target.value);
                    // Simple auto-resize logic
                    e.target.style.height = 'inherit';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChat(e as any);
                    }
                  }}
                  placeholder="Posez votre question stratégique..."
                  className="flex-1 bg-transparent py-4 text-sm font-medium outline-none text-slate-700 placeholder:text-slate-400 resize-none min-h-[52px] max-h-[200px]"
                  disabled={chatLoading}
                  rows={1}
                />
                <button 
                  type="submit"
                  disabled={!userInput.trim() || chatLoading}
                  className="w-11 h-11 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-riverside-red transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:hover:bg-slate-900"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
            <p className="text-[9px] text-center mt-3 text-slate-400 font-black uppercase tracking-[0.2em]">
              L&apos;IA peut faire des erreurs. Vérifiez les informations financières critiques.
            </p>
          </div>
        </div>

      </main>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.025em;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #0f172a;
        }
        .markdown-content p {
          margin-bottom: 1rem;
        }
        .markdown-content ul {
          margin-bottom: 1rem;
          list-style: none;
        }
        .markdown-content li {
          position: relative;
          padding-left: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .markdown-content li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.6em;
          width: 0.35rem;
          height: 0.35rem;
          border-radius: 50%;
          background: #e11d48;
        }
      `}</style>
    </div>
  );
}
