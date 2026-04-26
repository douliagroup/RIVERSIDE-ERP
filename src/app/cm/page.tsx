"use client";

import React, { useState } from "react";
import { 
  Megaphone, 
  Sparkles, 
  Facebook, 
  TrendingUp, 
  BarChart3, 
  MessageSquarePlus, 
  Loader2,
  Copy,
  CheckCircle2,
  Share2,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";

export default function CommunityManagerPage() {
  const { userRole } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [postContent, setPostContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Guard: Only patron or communication roles
  const canAccess = userRole === "patron" || userRole === "personnel"; // In this ERP demo Personnel often covers roles, ideally we'd have 'communication'

  const generatePost = async () => {
    setIsGenerating(true);
    setPostContent(null);
    try {
      const res = await fetch("/api/ai/cm-post", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPostContent(data.postContent);
    } catch (err) {
      console.error("CM Generation Error:", err);
      alert("Erreur lors de la génération du post.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!postContent) return;
    navigator.clipboard.writeText(postContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!canAccess && userRole !== null) {
     return (
       <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accès réservé au pôle communication</p>
       </div>
     );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 min-h-screen pb-20">
      {/* Hero */}
      <div className="relative rounded-[3rem] overflow-hidden bg-slate-900 p-12 text-white shadow-2xl">
         <div className="absolute top-0 right-0 w-96 h-96 bg-riverside-red/20 rounded-full -mr-48 -mt-48 blur-3xl opacity-50" />
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-4 text-center md:text-left">
               <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm">
                  <Megaphone size={14} className="text-riverside-red" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-riverside-red">Acquisition Riverside</span>
               </div>
               <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">Community Manager <span className="text-riverside-red text-shadow-sm">IA</span></h1>
               <p className="text-slate-400 font-bold max-w-md uppercase text-[11px] tracking-wide leading-relaxed">Analysez les tendances de garde et générez des campagnes d&apos;acquisition intelligentes.</p>
            </div>
            
            <button 
              onClick={generatePost}
              disabled={isGenerating}
              className="group bg-riverside-red text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-tighter text-sm shadow-xl shadow-red-900/40 hover:scale-105 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
            >
               {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
               Générer la Campagne Actuelle
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
         {/* Sidebar: Trends */}
         <div className="lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <TrendingUp size={16} className="text-riverside-red" />
                 Tendances Santé (7 Jours)
               </h3>
               
               <div className="space-y-4">
                  {[
                    { label: "Paludisme", val: "+12%", color: "text-riverside-red" },
                    { label: "Typhoïde", val: "+5%", color: "text-amber-500" },
                    { label: "Pédiatrie", val: "+8%", color: "text-emerald-500" }
                  ].map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                       <span className="text-[10px] font-black text-slate-500 uppercase">{t.label}</span>
                       <span className={cn("text-xs font-black", t.color)}>{t.val}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-4">
               <div className="flex items-center gap-3">
                  <BarChart3 size={20} className="text-slate-400" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">KPI Acquisition</h3>
               </div>
               <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                  <div>
                     <p className="text-xl font-black text-slate-900 tracking-tighter">1.2k</p>
                     <p className="text-[8px] font-bold text-slate-400 uppercase">Engagements</p>
                  </div>
                  <div>
                     <p className="text-xl font-black text-emerald-500 tracking-tighter">24</p>
                     <p className="text-[8px] font-bold text-slate-400 uppercase">RDV Générés</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Main content: Post Editor / Preview */}
         <div className="lg:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
               {!postContent && !isGenerating ? (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="h-[500px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 space-y-6"
                 >
                    <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-sm">
                       <MessageSquarePlus size={32} className="text-slate-200" />
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-slate-300 uppercase italic">Aucune Campagne En Cours</h3>
                       <p className="text-slate-400 text-xs font-medium mt-2 max-w-xs mx-auto">Appuyez sur le bouton ci-dessus pour que l&apos;IA analyse les rapports de garde et rédige un post.</p>
                    </div>
                 </motion.div>
               ) : isGenerating ? (
                 <motion.div 
                   key="loading"
                   className="h-[500px] bg-white border border-slate-100 rounded-[3rem] flex flex-col items-center justify-center p-12 space-y-6"
                 >
                    <div className="relative">
                       <Loader2 className="animate-spin text-riverside-red" size={48} />
                       <Sparkles className="absolute -top-2 -right-2 text-amber-400 animate-pulse" size={20} />
                    </div>
                    <div className="text-center">
                       <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Analyse du Big Data Riverside...</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Rédaction d&apos;un post viral en cours</p>
                    </div>
                 </motion.div>
               ) : (
                 <motion.div 
                   key="post"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-6"
                 >
                    <div className="flex items-center justify-between px-4">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Facebook size={14} className="text-blue-600" />
                         Preview Facebook Campaign
                       </h3>
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={copyToClipboard}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                              copied ? "bg-emerald-500 text-white" : "bg-white border border-slate-100 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                             {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                             {copied ? "Copié !" : "Copier le texte"}
                          </button>
                       </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                       <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-riverside-red rounded-2xl flex items-center justify-center text-white font-black text-lg">R</div>
                             <div>
                                <h4 className="text-sm font-black text-slate-900">Riverside Medical Center</h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                   <Calendar size={10} /> Sponsorisé • Douala
                                </div>
                             </div>
                          </div>
                          <button className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><Share2 size={16} /></button>
                       </div>

                       <div className="p-10 bg-slate-50/50">
                          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-inner min-h-[300px]">
                             <pre className="whitespace-pre-wrap font-sans text-sm font-medium text-slate-700 leading-relaxed italic">
                                {postContent}
                             </pre>
                          </div>
                       </div>

                       <div className="p-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                          <div className="flex items-center -space-x-2">
                             {[1, 2, 3].map(i => (
                               <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
                             ))}
                             <span className="ml-4 text-[10px] font-black text-slate-400 uppercase">+ 42 likes</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                             <span className="text-[10px] font-black text-emerald-600 uppercase">Prêt pour Publication</span>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
}
