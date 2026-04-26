"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Megaphone, Layout, Facebook, Copy, Check, Loader2, Sparkles, TrendingUp, BarChart3, Image as ImageIcon, Share2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

export default function CMPage() {
  const [generating, setGenerating] = useState(false);
  const [postContent, setPostContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleGeneratePost = async () => {
    setGenerating(true);
    setAnalyzing(true);
    
    // Simuler l'analyse
    await new Promise(r => setTimeout(r, 2000));
    setAnalyzing(false);

    try {
      const response = await fetch('/api/ai/cm-post', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.post) {
        setPostContent(data.post);
      }
    } catch (error) {
      console.error("Error generating post:", error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 h-full overflow-y-auto pb-32 scrollbar-hide">
      {/* Header section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <Megaphone size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-950 tracking-tighter">COMMUNITY <span className="text-indigo-600">Manager</span></h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Espace Créatif & Rayonnement Digital Riverside</p>
            </div>
          </div>
        </motion.div>
        
        <div className="flex gap-4">
          <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stratégie Connectée</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Controls & Analysis */}
        <section className="space-y-10">
          <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <Sparkles size={18} className="text-indigo-500" /> Riverside Insight
            </h2>

            <div className="space-y-8">
              <p className="text-sm text-slate-500 leading-[1.8] font-medium">
                Notre intelligence analyse en temps réel les diagnostics médicaux pour identifier les préoccupations sanitaires actuelles de la population de Douala.
              </p>

              <button 
                onClick={handleGeneratePost}
                disabled={generating}
                className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50 shadow-2xl shadow-indigo-100 group"
              >
                {generating ? <Loader2 size={24} className="animate-spin" /> : <TrendingUp size={24} className="group-hover:rotate-12 transition-transform" />}
                {generating ? "Analyse & Rédaction..." : "LANCER L'IA STRATÉGIQUE"}
              </button>

              {analyzing && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-5"
                >
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm">
                    <BarChart3 size={20} className="animate-pulse" />
                  </div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Analyse des 10 derniers diagnostics en cours...</p>
                </motion.div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] group hover:border-indigo-200 transition-all">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 mb-6 shadow-sm">
                <Share2 size={20} />
              </div>
              <h4 className="text-xs font-black text-slate-950 uppercase mb-2">Multi-Plateforme</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">Posts optimisés pour Facebook, Instagram et WhatsApp Status.</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] group hover:border-indigo-200 transition-all">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-pink-500 mb-6 shadow-sm">
                <Layout size={20} />
              </div>
              <h4 className="text-xs font-black text-slate-950 uppercase mb-2">Visuels IA</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">Suggère des idées de visuels impactants pour vos créations graphiques.</p>
            </div>
          </div>
        </section>

        {/* Right: Preview Area */}
        <section className="bg-slate-200/50 p-10 rounded-[3.5rem] border border-slate-200/50 flex flex-col items-center justify-center min-h-[600px] relative">
          <div className="absolute top-8 left-10 flex items-center gap-3">
             <Facebook size={18} className="text-indigo-600" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aperçu Réseaux Sociaux</span>
          </div>

          <AnimatePresence mode="wait">
            {!postContent ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-6"
              >
                <div className="mx-auto w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center text-slate-200 shadow-inner">
                  <ImageIcon size={48} />
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Attente de direction stratégique...</p>
              </motion.div>
            ) : (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
              >
                {/* FB Post Header */}
                <div className="p-8 border-b border-slate-50 flex items-center gap-5">
                   <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-indigo-600 font-black text-xl">R</div>
                   <div>
                     <h4 className="text-sm font-black text-slate-950">Riverside Medical Center</h4>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">À l&apos;instant • Douala, Cameroun</p>
                   </div>
                </div>

                {/* Post Content */}
                <div className="p-8 lg:p-10 flex-1 bg-slate-50/30">
                  <p className="text-lg text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                    {postContent}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-slate-50 flex gap-4">
                  <button 
                    onClick={() => copyToClipboard(postContent)}
                    className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4 shadow-xl shadow-indigo-100"
                  >
                    {copied ? <Check size={20} className="text-emerald-300" /> : <Copy size={20} />}
                    {copied ? "Post Copié !" : "Copier le Post"}
                  </button>
                  <button 
                    onClick={() => setPostContent(null)}
                    className="px-8 py-5 bg-slate-100 text-slate-400 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
