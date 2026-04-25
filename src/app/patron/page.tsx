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
          .eq('type', 'Entrée');
        
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
    <div className="min-h-screen bg-[#020617] text-slate-100 p-6 md:p-10 font-sans selection:bg-red-600/30 overflow-x-hidden">
      
      {/* Premium Backdrop */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-900/10 blur-[150px] rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-900/50 blur-[150px] rounded-full -ml-32 -mb-32" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03]" />
      </div>

      {/* Top Navigation / Header */}
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-900 rounded-[24px] flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.3)] border border-white/10 group hover:scale-105 transition-transform duration-500">
             <ShieldCheck size={32} className="text-white" />
           </div>
           <div>
             <h1 className="text-3xl font-black tracking-tight text-white uppercase italic leading-none">Riverside <span className="text-red-600">Insight</span></h1>
             <div className="flex items-center gap-4 mt-2">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Patron & Strategic Unit</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             </div>
           </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Douala, Littoral</span>
            <span className="text-xs font-mono text-slate-300">25 AVRIL 2026 • 11:15</span>
          </div>
          <Link href="/administration">
            <button className="px-6 py-3.5 bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 group">
              <Layout size={16} className="text-red-500 group-hover:rotate-12 transition-transform" /> Administration
            </button>
          </Link>
          <button className="relative w-12 h-12 bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all">
            <Bell size={20} className="text-slate-400" />
            {alerts.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full animate-ping" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Analytics & Alerts */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] group">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Caisse Recettes (Jour)</p>
              <h3 className="text-2xl font-black text-white">{stats.ca_jour.toLocaleString()} <span className="text-[10px] text-slate-600">FCFA</span></h3>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                <TrendingUp size={12} /> +12.3% vs hier
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] group">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Occupation</p>
              <h3 className="text-2xl font-black text-white">{stats.taux_occupation}%</h3>
              <div className="mt-4 w-full bg-slate-800/50 h-1 rounded-full overflow-hidden">
                <div className="bg-red-600 h-full transition-all duration-1000" style={{ width: `${stats.taux_occupation}%` }} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] group">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Volume Dettes</p>
              <h3 className="text-2xl font-black text-red-500">{stats.dettes_totales.toLocaleString()} <span className="text-[10px] text-slate-600">FCFA</span></h3>
              <div className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Recouvrement urgent</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] group">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Articles en Alerte</p>
              <h3 className="text-2xl font-black text-white">{stats.articles_alerte} <span className="text-[10px] text-slate-600">PRODUITS</span></h3>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-500 animate-pulse">
                <AlertTriangle size={12} /> Réapprovisionnement requis
              </div>
            </motion.div>
          </div>

          {/* Alerts Center */}
          <div className="bg-slate-900/20 backdrop-blur-xl border border-white/5 p-8 rounded-[40px]">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <Bell size={16} className="text-red-500" /> Notifications de Pilotage
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {alerts.length === 0 ? (
                <div className="col-span-2 py-10 text-center text-slate-600 italic text-sm">Aucune anomalie détectée pour le moment.</div>
              ) : (
                alerts.map((alert, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx} 
                    className="p-5 bg-slate-900/60 border border-white/5 rounded-3xl hover:border-red-500/30 transition-all flex gap-4"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      alert.type === 'CRITICAL' ? 'bg-red-500/10 text-red-500' : 
                      alert.type === 'STOCK' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                    )}>
                      <alert.icon size={24} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase mb-1">{alert.title}</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-tighter">{alert.desc}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Financial Gap Table / Detail */}
          <div className="bg-slate-900/40 border border-white/5 p-10 rounded-[40px]">
             <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-widest mb-1">Audit de Caisse Mensuel</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Traçabilité des écarts par jour</p>
               </div>
               <button className="px-5 py-2 bg-slate-800 text-[9px] font-black text-white uppercase rounded-xl border border-white/5 hover:bg-slate-700 transition-all">Exporter PDF</button>
             </div>
             <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-5">
                       <span className="text-[10px] font-mono text-slate-600">2{i} AVR</span>
                       <span className="text-xs font-bold text-slate-300">Journal de caisse T0{i}</span>
                    </div>
                    <div className="flex items-center gap-12 text-right">
                       <div>
                          <p className="text-[8px] font-black text-slate-500 uppercase">Caisse</p>
                          <p className="text-xs font-black text-white">412.000</p>
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-500 uppercase">Audit</p>
                          <p className="text-xs font-black text-emerald-500">412.000</p>
                       </div>
                       <div className="w-20">
                          <span className="text-[9px] font-black text-emerald-500/50 uppercase italic tracking-tighter">Conforme</span>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

        </div>

        {/* Right Column: AI Strategic Chat */}
        <div className="xl:col-span-4 h-full">
           <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[40px] h-[780px] flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-red-600/10 to-transparent pointer-events-none" />
              
              {/* Chat Header */}
              <div className="p-8 pb-6 border-b border-white/5 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase italic tracking-wider">Riverside Intelligence</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                       <Sparkles size={10} className="text-red-500" /> Analyste Stratégique (Gemini 1.5)
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Body */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide relative z-10">
                {chatMessages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className={cn(
                      "flex",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] p-4 text-[11px] leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-slate-800 text-white rounded-3xl rounded-tr-sm border border-white/5" 
                        : "bg-slate-950/80 text-slate-300 rounded-3xl rounded-tl-sm border border-white/5"
                    )}>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </motion.div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-950/80 p-4 rounded-3xl border border-white/5 flex items-center gap-2">
                       <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce" />
                       <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:-.3s]" />
                       <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:-.5s]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-8 pt-4 relative z-10">
                <form onSubmit={handleChat} className="relative">
                  <input 
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Posez une question sur vos opérations..."
                    className="w-full bg-slate-950 border border-white/5 p-4 pr-14 rounded-2xl text-[11px] font-medium outline-none focus:border-red-600/50 transition-all placeholder:text-slate-700"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-2 bottom-2 w-10 bg-red-600 rounded-xl flex items-center justify-center text-white hover:bg-red-700 transition-all"
                  >
                    <Send size={16} />
                  </button>
                </form>
                <div className="mt-4 flex items-center justify-center gap-4">
                   <button className="text-[8px] font-black text-slate-600 uppercase hover:text-slate-400 transition-colors">Analyse CA</button>
                   <span className="text-slate-800">|</span>
                   <button className="text-[8px] font-black text-slate-600 uppercase hover:text-slate-400 transition-colors">Dettes Patients</button>
                   <span className="text-slate-800">|</span>
                   <button className="text-[8px] font-black text-slate-600 uppercase hover:text-slate-400 transition-colors">Stocks Critiques</button>
                </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
