'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '@/src/lib/utils';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export default function ChatInterneWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchMessages();
      const channel = supabase
        .channel('messages_internes_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_internes' }, (payload) => {
          setMessages((current) => [...current, payload.new as Message]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setFetching(true);
      const { data, error } = await supabase
        .from('messages_internes')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error("Chat fetch error:", err);
      toast.error("Impossible de charger les messages.");
    } finally {
      setFetching(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user || loading) return;

    setLoading(true);
    try {
      const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Personnel";
      
      const { error } = await supabase
        .from('messages_internes')
        .insert([{
          sender_id: user.id,
          sender_name: displayName,
          content: inputValue.trim()
        }]);

      if (error) throw error;
      setInputValue("");
    } catch (err: any) {
      console.error("Msg send error:", err);
      toast.error("Échec de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="w-80 md:w-96 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden mb-4 flex flex-col h-[500px]"
          >
            <div className="p-6 bg-slate-900 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest leading-none">Canal Interne</h4>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">Chat Riverside</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:text-red-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50"
            >
              {fetching ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                  <Loader2 className="animate-spin mb-2" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Chargement...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 text-slate-300">
                  <p className="text-[10px] font-black uppercase tracking-widest">Aucun message</p>
                  <p className="text-[8px] font-bold mt-1">Engagez la conversation entre collègues.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "flex flex-col",
                    msg.sender_id === user?.id ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm",
                      msg.sender_id === user?.id 
                        ? "bg-slate-900 text-white rounded-tr-none" 
                        : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                    )}>
                      {msg.sender_id !== user?.id && (
                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mb-1">{msg.sender_name}</p>
                      )}
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-50 relative">
              <input 
                type="text"
                placeholder="Message interne..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 p-4 pr-14 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-slate-900 transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim() || loading}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-emerald-500 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl hover:bg-emerald-600 transition-all border-4 border-white group"
      >
        <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />
        <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      </motion.button>
    </div>
  );
}
