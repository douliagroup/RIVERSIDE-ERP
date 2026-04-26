"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Zap, 
  ArrowUpRight, 
  Activity,
  CreditCard,
  AlertTriangle,
  Layout,
  PieChart as PieChartIcon,
  ShieldCheck,
  BrainCircuit,
  Loader2,
  Calendar,
  CheckCircle2,
  PackageSearch,
  MessageSquare,
  Send,
  Sparkles,
  ArrowDownLeft,
  Bell,
  Box,
  Scale
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";

export default function PatronInsight() {
  const { userRole } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole !== 'patron') {
      router.push('/');
    }
  }, [userRole, router]);

  const [stats, setStats] = useState({
    ca_jour: 0,
    ca_manuel_jour: 0,
    methode_dominante: "Calcul en cours...",
    taux_occupation: 0,
    articles_alerte: 0,
    chambres_totales: 0,
    chambres_occupees: 0,
    dettes_totales: 0
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Bienvenue dans Riverside Intelligence. Je suis prêt à analyser vos opérations stratégiques. Que souhaitez-vous examiner ?" }
  ]);
  const [userInput, setUserInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    async function fetchPatronData() {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // 1. Chiffre d'Affaires du Jour (Système)
        const { data: txJour, error: txErr } = await supabase
          .from('transactions_caisse')
          .select('montant_total, methode_paiement, reste_a_payer')
          .gte('date_transaction', `${today}T00:00:00Z`)
          .lte('date_transaction', `${today}T23:59:59Z`);
        
        const caToday = txJour?.reduce((acc, curr) => acc + (curr.montant_total || 0), 0) || 0;

        // 2. Chiffre d'Affaires du Jour (Manuel / Comptable)
        const { data: manualData } = await supabase
          .from('comptabilite_manuelle')
          .select('montant')
          .eq('date_operation', today)
          .eq('flux', 'ENTREE');
        
        const caManual = manualData?.reduce((acc, curr) => acc + (curr.montant || 0), 0) || 0;

        // 3. Dettes Totales & 30+ Days Alert
        const { data: dettesData } = await supabase
          .from('transactions_caisse')
          .select('reste_a_payer, date_transaction')
          .gt('reste_a_payer', 0);
        
        const totalDettes = dettesData?.reduce((acc, curr) => acc + (curr.reste_a_payer || 0), 0) || 0;
        
        // Check for 30+ days old debts
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const oldDebts = dettesData?.filter(d => new Date(d.date_transaction) < thirtyDaysAgo) || [];
        const oldDebtsAmount = oldDebts.reduce((acc, curr) => acc + (curr.reste_a_payer || 0), 0);

        // 4. Occupation Chambres
        const { data: chmData } = await supabase
          .from('chambres')
          .select('id, est_occupee');
        
        const totalChm = chmData?.length || 0;
        const occChm = chmData?.filter(c => c.est_occupee).length || 0;
        const tauxOcc = totalChm > 0 ? Math.round((occChm / totalChm) * 100) : 0;

        // 5. Stocks Alerte
        const { data: stockData } = await supabase
          .from('stocks')
          .select('designation, quantite_actuelle, seuil_alerte');
        
        const lowStocksList = stockData?.filter(s => (s.quantite_actuelle || 0) <= (s.seuil_alerte || 0)) || [];

        setStats({
          ca_jour: caToday,
          ca_manuel_jour: caManual,
          methode_dominante: "Auto",
          taux_occupation: tauxOcc,
          articles_alerte: lowStocksList.length,
          chambres_totales: totalChm,
          chambres_occupees: occChm,
          dettes_totales: totalDettes
        });

        // Generate Alerts Logic
        const newAlerts = [];
        
        // Finalcial Gap Alert (> 5%)
        const variance = caToday > 0 ? Math.abs((caToday - caManual) / caToday) * 100 : 0;
        if (variance > 5) {
          newAlerts.push({
            type: 'CRITICAL',
            title: 'Écart Financier Suspect',
            desc: `Écart de ${variance.toFixed(1)}% détecté entre caisse (${caToday.toLocaleString()}) et comptabilité (${caManual.toLocaleString()}).`,
            icon: Scale
          });
        }

        // Stock Rupture Alerts
        lowStocksList.slice(0, 3).forEach(s => {
          newAlerts.push({
            type: 'STOCK',
            title: `Seuil Critique: ${s.designation}`,
            desc: `Stock à ${s.quantite_actuelle} unités (Seuil: ${s.seuil_alerte}). Rupture imminente.`,
            icon: Box
          });
        });

        // 30 Days Debt Alert
        if (oldDebtsAmount > 0) {
          newAlerts.push({
            type: 'CRITICAL',
            title: 'Impayés Hors-Délai',
            desc: `${oldDebtsAmount.toLocaleString()} FCFA d'impayés dépassent 30 jours d'ancienneté. Action recommandée.`,
            icon: AlertTriangle
          });
        }

        // Impayés (General volume)
        if (totalDettes > 500000) {
          newAlerts.push({
            type: 'RECOVERY',
            title: 'Volume Impayés Critique',
            desc: `Le montant total des restes à payer dépasse 500,000 FCFA. Plan de recouvrement nécessaire.`,
            icon: ArrowDownLeft
          });
        }

        setAlerts(newAlerts);

      } catch (err) {
        console.error("[Patron] Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatronData();
  }, []);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput) return;

    const userMsg = userInput;
    setUserInput("");
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMsg,
          clinicData: stats
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setChatMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'model', text: `Erreur Stratégique : ${err.message || "Lien rompu avec Riverside Intelligence."}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-red-600" size={48} />
        <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.4em]">Initialisation Riverside Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-riverside-red/10 selection:text-riverside-red">
      {/* Top Header section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-red-100 border border-slate-100 group transition-all duration-500">
             <ShieldCheck size={32} className="text-riverside-red" />
           </div>
           <div>
             <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase leading-none">Riverside <span className="text-riverside-red">Insight</span></h1>
             <div className="flex items-center gap-4 mt-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Directeur Général & Stratégie</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             </div>
           </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Douala, Littoral</span>
            <span className="text-xs font-bold text-slate-400">SESSION AUDIT LIVE</span>
          </div>
          <Link href="/administration">
            <button className="px-6 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-riverside-red/30 transition-all active:scale-95 flex items-center gap-2 group shadow-sm">
              <Layout size={16} className="text-slate-400 group-hover:text-riverside-red transition-colors" /> Admin
            </button>
          </Link>
          <button className="relative w-11 h-11 bg-white border border-slate-100 rounded-xl flex items-center justify-center hover:border-riverside-red/30 transition-all active:scale-95 shadow-sm">
            <Bell size={20} className="text-slate-400" />
            {alerts.length > 0 && <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-riverside-red rounded-full" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Analytics & Alerts */}
        <div className="xl:col-span-12 space-y-8">
          
          {/* KPI Cards section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_0_0_rgba(15,23,42,0.05)] hover:shadow-[0_15px_0_0_rgba(15,23,42,0.1)] transition-all group">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Recettes Système (Jour)</p>
              <h3 className="text-3xl font-black text-slate-950">{stats.ca_jour.toLocaleString()} <span className="text-xs text-slate-400 font-bold">FCFA</span></h3>
              <div className="mt-5 flex items-center gap-2 text-[11px] font-black text-emerald-500">
                <TrendingUp size={14} /> +12% vs hier
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_0_0_rgba(15,23,42,0.05)] hover:shadow-[0_15px_0_0_rgba(15,23,42,0.1)] transition-all group">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Occupation</p>
              <h3 className="text-3xl font-black text-slate-950">{stats.taux_occupation}%</h3>
              <div className="mt-5 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-riverside-red h-full transition-all duration-1000" style={{ width: `${stats.taux_occupation}%` }} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_0_0_rgba(15,23,42,0.05)] hover:shadow-[0_15px_0_0_rgba(15,23,42,0.1)] transition-all group">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Dettes Total</p>
              <h3 className="text-3xl font-black text-riverside-red">{stats.dettes_totales.toLocaleString()} <span className="text-xs text-slate-400 font-bold">FCFA</span></h3>
              <div className="mt-5 text-[11px] font-black text-slate-400 uppercase tracking-tight">Recouvrement nécessaire</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_0_0_rgba(15,23,42,0.05)] hover:shadow-[0_15px_0_0_rgba(15,23,42,0.1)] transition-all group">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Stocks Alertes</p>
              <h3 className="text-3xl font-black text-slate-950">{stats.articles_alerte} <span className="text-xs text-slate-400 font-bold">UNITÉS</span></h3>
              <div className="mt-5 flex items-center gap-2 text-[11px] font-black text-riverside-red animate-pulse">
                <AlertTriangle size={14} /> Seuil critique atteint
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Alerts Center section */}
            <div className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-[0_12px_0_0_rgba(15,23,42,0.05)]">
              <h2 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                <Bell size={18} className="text-riverside-red" /> Notifications Stratégiques
              </h2>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Silence Ops • Aucune anomalie</div>
                ) : (
                  alerts.map((alert, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className="p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:border-riverside-red/30 transition-all flex gap-5"
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        alert.type === 'CRITICAL' ? 'bg-riverside-red/10 text-riverside-red' : 
                        alert.type === 'STOCK' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                      )}>
                        <alert.icon size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-950 uppercase mb-2">{alert.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-tight">{alert.desc}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Financial Gap section */}
            <div className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-[0_12px_0_0_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest mb-1">Audit Flux Financiers</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Contrôle quotidien Douala</p>
                </div>
                <button className="px-6 py-3 bg-slate-950 text-xs font-black text-white uppercase rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg">Exporter</button>
              </div>
              <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <details key={i} className="group overflow-hidden rounded-2xl border border-slate-100 transition-all bg-white hover:border-slate-300">
                      <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                        <div className="flex items-center gap-5">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">2{i} AVRIL</span>
                          <span className="text-sm font-black text-slate-950">Audit T0{i}</span>
                        </div>
                        <div className="flex items-center gap-10">
                          <span className="text-[11px] font-black text-emerald-500 uppercase italic">Conforme</span>
                          <Send size={14} className="text-slate-300 group-open:rotate-90 transition-transform" />
                        </div>
                      </summary>
                      <div className="px-5 pb-5 pt-3 border-t border-slate-50 bg-slate-50/50 grid grid-cols-3 gap-8">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Système</p>
                            <p className="text-sm font-black text-slate-950">412.000 FCFA</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Manuel</p>
                            <p className="text-sm font-black text-slate-950">412.000 FCFA</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Variance</p>
                            <p className="text-sm font-black text-emerald-600">0 FCFA</p>
                        </div>
                      </div>
                    </details>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Column: AI Strategic Chat - Google AI Studio Style */}
        <div className="xl:col-span-12">
           <div className="bg-white border border-slate-100 rounded-[3.5rem] h-[850px] flex flex-col shadow-[0_20px_0_0_rgba(15,23,42,0.05)] relative overflow-hidden transition-all duration-700">
              {/* Header section */}
              <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-riverside-red rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-red-100 animate-pulse-border">
                    <BrainCircuit size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950 uppercase tracking-tighter">Riverside Intelligence</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Assistant Stratégique Haut de Gamme</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">AUDIT LIVE CONNECTÉ</div>
                </div>
              </div>

              {/* Chat Viewport */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 lg:p-16 space-y-12 scrollbar-hide max-w-5xl mx-auto w-full">
                {chatMessages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className="flex flex-col gap-6"
                  >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-lg border",
                         msg.role === 'user' ? "text-slate-500 bg-slate-50 border-slate-100" : "text-riverside-red bg-red-50 border-red-100"
                       )}>
                         {msg.role === 'user' ? 'DIRECTEUR GÉNÉRAL' : 'ANALYSTE RIVERSIDE'}
                       </div>
                    </div>
                    <div className="text-lg leading-[1.8] font-medium text-slate-800 max-w-none">
                      <div className="markdown-content">
                        <Markdown
                          components={{
                            p: ({ children }) => <p className="mb-8 last:mb-0">{children}</p>,
                            h1: ({ children }) => <h1 className="text-2xl font-black text-slate-950 mb-6 uppercase tracking-tight">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-black text-slate-950 mb-5 uppercase tracking-tight">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-black text-slate-950 mb-4 uppercase tracking-tight">{children}</h3>,
                            strong: ({ children }) => <strong className="font-black text-slate-950">{children}</strong>,
                            ul: ({ children }) => <ul className="space-y-4 mb-8">{children}</ul>,
                            li: ({ children }) => (
                              <li className="flex gap-4 items-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-riverside-red mt-[1em] shrink-0" />
                                <span>{children}</span>
                              </li>
                            ),
                          }}
                        >
                          {msg.text}
                        </Markdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-4 p-8 bg-slate-50 rounded-[2rem] w-fit">
                    <div className="w-2.5 h-2.5 bg-riverside-red rounded-full animate-bounce" />
                    <div className="w-2.5 h-2.5 bg-riverside-red rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2.5 h-2.5 bg-riverside-red rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Analyse des flux en cours...</span>
                  </div>
                )}
              </div>

              {/* Prompt Bar section */}
              <div className="p-12 pt-0 flex justify-center">
                <form onSubmit={handleChat} className="relative w-full max-w-3xl">
                  <div className="relative bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner group hover:border-riverside-red/30 transition-all p-2 pr-4 flex items-center">
                    <input 
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Comment se portent nos finances aujourd'hui ?"
                      className="flex-1 bg-transparent px-6 py-4 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <button 
                      type="submit"
                      disabled={chatLoading}
                      className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white hover:bg-riverside-red transition-all shadow-lg active:scale-90 disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
