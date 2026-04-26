"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, MessageCircle, Send, Loader2, Copy, Check, Search, Calendar, User } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";

interface PatientConsultation {
  id: string;
  patient_id: string;
  motif_visite: string;
  diagnostic: string;
  created_at: string;
  patients: {
    nom_complet: string;
    telephone: string;
  };
}

export default function DouliaLovePage() {
  const [consultations, setConsultations] = useState<PatientConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<{ id: string; text: string; patientName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchRecentConsultations();
  }, []);

  const fetchRecentConsultations = async () => {
    setLoading(true);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        id,
        patient_id,
        motif_visite,
        diagnostic,
        created_at,
        patients (nom_complet, telephone)
      `)
      .gte('created_at', fortyEightHoursAgo)
      .order('created_at', { ascending: false });

    if (data) setConsultations(data as any);
    setLoading(false);
  };

  const handleGenerateMessage = async (consult: PatientConsultation) => {
    setGeneratingId(consult.id);
    try {
      const response = await fetch('/api/ai/doulia-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: consult.patients.nom_complet,
          motif: consult.motif_visite,
          diagnostic: consult.diagnostic
        })
      });
      const data = await response.json();
      if (data.message) {
        setSelectedMessage({
          id: consult.id,
          text: data.message,
          patientName: consult.patients.nom_complet
        });
      }
    } catch (error) {
      console.error("Error generating message:", error);
    } finally {
      setGeneratingId(null);
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
            <div className="w-14 h-14 bg-red-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-red-200">
              <Heart size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-950 tracking-tighter">DOULIA <span className="text-red-500">Love</span></h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Programme de Fidélisation & Relation Patient</p>
            </div>
          </div>
        </motion.div>
        
        <div className="bg-white border border-slate-100 p-2 rounded-2xl flex gap-1 shadow-sm">
          <div className="px-5 py-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Suivi Post-Consultation</span>
          </div>
        </div>
      </header>

      {/* Stats and Info */}
      <div className="bg-slate-950 rounded-[3rem] p-10 text-white relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Objectif Riverside</h3>
            <p className="text-sm font-medium leading-relaxed italic">&quot;Prendre soin de nos patients même après qu&apos;ils aient quitté nos murs. C&apos;est ça l&apos;amour Riverside.&quot;</p>
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Méthode</h3>
            <p className="text-sm font-medium">Un suivi personnalisé via l&apos;IA pour garantir une récupération optimale et renforcer le lien de confiance.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-black text-white">{consultations.length}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-1">Patients récents</p>
            </div>
            <div className="h-12 w-[1px] bg-white/10" />
            <div className="text-center">
              <p className="text-4xl font-black text-red-500">48h</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-1">Fenêtre de suivi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-xl shadow-slate-200/50">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-950 uppercase tracking-[0.3em] flex items-center gap-3">
            <User size={16} className="text-red-500" /> Patients à contacter
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Rechercher..."
              className="pl-12 pr-6 py-3 bg-slate-50 border border-transparent rounded-xl text-[11px] font-bold uppercase transition-all focus:bg-white focus:border-red-200 outline-none w-64"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="p-20 text-center space-y-6">
              <Loader2 size={40} className="text-red-500 animate-spin mx-auto opacity-20" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Chargement de la base patients...</p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Aucun patient récent à suivre</p>
            </div>
          ) : (
            consultations.map((consult, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={consult.id} 
                className="p-8 flex items-center justify-between hover:bg-slate-50/80 transition-all group"
              >
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:scale-105 transition-all shadow-sm">
                    {consult.patients.nom_complet.charAt(0)}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-950 tracking-tighter">{consult.patients.nom_complet}</h3>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                        <MessageCircle size={12} /> {consult.motif_visite}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                        <Calendar size={12} /> {new Date(consult.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleGenerateMessage(consult)}
                    disabled={generatingId !== null}
                    className="px-8 py-4 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 shadow-lg shadow-slate-200"
                  >
                    {generatingId === consult.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Générer DOULIA Love
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Message Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col"
            >
              {/* WhatsApp Style Header */}
              <div className="bg-[#075E54] p-10 text-white flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center font-black text-2xl">
                    {selectedMessage.patientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{selectedMessage.patientName}</h3>
                    <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Riverside Client Follow-up</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all"
                >
                  <Search size={20} className="rotate-45" />
                </button>
              </div>

              {/* Message Content */}
              <div className="p-12 bg-[#E5DDD5] flex-1 overflow-y-auto">
                <div className="flex flex-col gap-8">
                  <div className="bg-white p-8 rounded-2xl rounded-tl-none shadow-sm relative max-w-[85%] self-start animate-in fade-in slide-in-from-left duration-500">
                    <p className="text-base text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                      {selectedMessage.text}
                    </p>
                    <span className="text-[10px] font-black text-slate-400 mt-4 block text-right uppercase">Just Now • Riverside AI</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-10 border-t border-slate-100 bg-white flex items-center gap-6">
                <button 
                  onClick={() => copyToClipboard(selectedMessage.text)}
                  className="flex-1 py-5 bg-slate-950 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-4 shadow-xl"
                >
                  {copied ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} />}
                  {copied ? "Message Copié !" : "Copier le message"}
                </button>
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="px-10 py-5 bg-slate-50 text-slate-400 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
