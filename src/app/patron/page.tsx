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
  Scale,
  Wallet,
  Clock,
  Printer
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PatronInsight() {
  const { userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && userRole !== 'patron') {
      router.push('/');
    }
  }, [userRole, router, mounted, authLoading]);

  const [stats, setStats] = useState({
    ca_jour: 0,
    encaisse_reelle: 0,
    ca_manuel_jour: 0,
    methode_dominante: "Calcul en cours...",
    taux_occupation: 0,
    articles_alerte: 0,
    chambres_totales: 0,
    chambres_occupees: 0,
    dettes_totales: 0,
    solde_caisse: 0
  });
  
  const [waitingList, setWaitingList] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const [journal, setJournal] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [userInput, setUserInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [expenseHistory, setExpenseHistory] = useState<any[]>([]);

  // Scroll to bottom on chat update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  // 0. Chargement de l'historique du chat
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
          text: m.content
        })));
      } else {
        setChatMessages([
          { role: 'model', text: "Bienvenue dans Riverside Intelligence. Je suis prêt à analyser vos opérations stratégiques. Que souhaitez-vous examiner ?" }
        ]);
      }
    } catch (err) {
      console.error("Erreur chargement historique chat:", err);
      setChatMessages([
        { role: 'model', text: "Bienvenue dans Riverside Intelligence. (Historique non chargé)" }
      ]);
    }
  };

  const fetchPatronData = async () => {
    try {
      setLoading(true);
      fetchWaitingList(); // Fetch queue in parallel

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStr = todayStart.toISOString().split('T')[0];

      // 1. Journal & Transactions du Jour (Synchronisé avec Trésorerie)
      const { data: journalData, error: txErr } = await supabase
        .from('transactions_caisse')
        .select('*, patients(nom_complet)')
        .gte('date_transaction', todayStart.toISOString())
        .order('date_transaction', { ascending: false });
      
      if (txErr) throw txErr;
      const journalList = journalData || [];
      setJournal(journalList);

      const caToday = journalList.reduce((acc, curr) => acc + (parseFloat(curr.montant_total) || 0), 0);
      const encaisseReelle = journalList.reduce((acc, curr) => acc + (parseFloat(curr.montant_verse) || 0), 0);
      
      const soldeEstime = journalList.reduce((acc, tx) => {
        if (tx.type_flux === 'Entrée' || !tx.type_flux) {
          return acc + parseFloat(tx.montant_verse || 0);
        } else {
          return acc - parseFloat(tx.montant_total || 0);
        }
      }, 0);

      // 2. Chiffre d'Affaires du Jour (Manuel / Comptable)
      const { data: manualData } = await supabase
        .from('comptabilite_manuelle')
        .select('montant')
        .eq('date_operation', todayStr)
        .eq('flux', 'ENTREE');
      
      const caManual = manualData?.reduce((acc, curr) => acc + (curr.montant || 0), 0) || 0;

      // 2b. Dépenses en attente
      const { data: pendingExp } = await supabase
        .from('comptabilite_manuelle')
        .select('*')
        .eq('statut', 'En attente')
        .eq('flux', 'SORTIE');
      
      setPendingExpenses(pendingExp || []);

      // 2c. Historique des dépenses (Décaissements)
      const { data: expHistory } = await supabase
        .from('comptabilite_manuelle')
        .select('*')
        .eq('flux', 'SORTIE')
        .order('created_at', { ascending: false });
      
      setExpenseHistory(expHistory || []);

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
        encaisse_reelle: encaisseReelle,
        ca_manuel_jour: caManual,
        methode_dominante: "Auto",
        taux_occupation: tauxOcc,
        articles_alerte: lowStocksList.length,
        chambres_totales: totalChm,
        chambres_occupees: occChm,
        dettes_totales: totalDettes,
        solde_caisse: soldeEstime
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
  };

  const fetchWaitingList = async () => {
    setLoadingQueue(true);
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const { data, error } = await supabase
        .from('file_attente')
        .select('*, patients(*)')
        .gte('created_at', today.toISOString())
        .order('heure_arrivee', { ascending: true });
      
      if (error) {
          const { data: altData } = await supabase
            .from('sejours_actifs')
            .select('*, patients(*)')
            .gte('created_at', today.toISOString())
            .order('created_at', { ascending: true });
          setWaitingList(altData?.map(d => ({...d, heure_arrivee: d.created_at, motif: d.motif_visite, service: d.service || "Médecine Générale", urgence: d.urgence || false})) || []);
      } else {
          setWaitingList(data || []);
      }
    } catch (err) {
      console.error("Queue Fetch Error:", err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleApproveExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comptabilite_manuelle')
        .update({ statut: 'Approuvé' })
        .eq('id', id);
      
      if (error) throw error;
      toast.success("Dépense approuvée");
      fetchPatronData();
    } catch (err: any) {
      toast.error(`Erreur d'approbation: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchPatronData();
    fetchChatHistory();
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

  if (!mounted || loading) {
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 md:mb-12">
        <div className="flex items-center gap-4 md:gap-5">
           <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-red-100 border border-slate-100 group transition-all duration-500">
             <ShieldCheck size={24} className="text-riverside-red md:size-[32px]" />
           </div>
           <div>
             <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-950 uppercase leading-none">Riverside <span className="text-riverside-red">Insight</span></h1>
             <div className="flex items-center gap-4 mt-2">
                <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">DG & Stratégie</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             </div>
           </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4 w-full lg:w-auto">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Douala, Littoral</span>
            <span className="text-xs font-bold text-slate-400">SESSION AUDIT LIVE</span>
          </div>
          <Link href="/administration" className="flex-1 lg:flex-none">
            <button className="w-full lg:w-auto px-4 md:px-6 py-3 bg-white border border-slate-100 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:border-riverside-red/30 transition-all active:scale-95 flex items-center justify-center gap-2 group shadow-sm">
              <Layout size={14} className="text-slate-400 group-hover:text-riverside-red transition-colors" /> Admin
            </button>
          </Link>
          <button className="relative w-10 md:w-11 h-10 md:h-11 bg-white border border-slate-100 rounded-xl flex items-center justify-center hover:border-riverside-red/30 transition-all active:scale-95 shadow-sm">
            <Bell size={18} className="text-slate-400" />
            {alerts.length > 0 && <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-riverside-red rounded-full" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Analytics & Alerts */}
        <div className="xl:col-span-12 space-y-8">
          
          {/* KPI Cards section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <Link href="/tresorerie" className="block outline-none">
              <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-6 md:p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_0_0_rgba(15,23,42,0.05)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] hover:border-riverside-red/20 transition-all group h-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Recettes Système (Jour)</p>
                  <ArrowUpRight size={16} className="text-slate-300 group-hover:text-riverside-red transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-950">{stats.ca_jour.toLocaleString()} <span className="text-[10px] md:text-xs text-slate-400 font-bold">FCFA</span></h3>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[9px] md:text-[10px] font-black text-emerald-500 flex items-center gap-1">
                    <TrendingUp size={12} /> {stats.encaisse_reelle.toLocaleString()} encaissés
                  </span>
                  <span className="text-[8px] md:text-[9px] font-bold text-slate-300 uppercase">Audit Live</span>
                </div>
              </motion.div>
            </Link>

            <Link href="/tresorerie" className="block outline-none">
              <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }} 
                className="p-6 md:p-8 bg-slate-950 border border-slate-800 rounded-[2rem] shadow-xl text-white group h-full hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Solde de Caisse (Estimé)</p>
                  <ArrowUpRight size={16} className="text-slate-600 group-hover:text-emerald-400 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-emerald-400">{stats.solde_caisse.toLocaleString()} <span className="text-[10px] md:text-xs text-slate-500 font-bold">FCFA</span></h3>
                <div className="mt-5 flex items-center gap-2 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-emerald-500" /> Validation Synchronisée
                </div>
              </motion.div>
            </Link>

            <Link href="/tresorerie" className="block outline-none">
              <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }} 
                className="p-6 md:p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_0_0_rgba(15,23,42,0.05)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] hover:border-riverside-red/20 transition-all group h-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Dettes Total</p>
                  <ArrowUpRight size={16} className="text-slate-300 group-hover:text-riverside-red transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-riverside-red">{stats.dettes_totales.toLocaleString()} <span className="text-[10px] md:text-xs text-slate-400 font-bold">FCFA</span></h3>
                <div className="mt-5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-tight">Recouvrement nécessaire</div>
              </motion.div>
            </Link>

            <Link href="/pharmacie" className="block outline-none">
              <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 }} 
                className="p-6 md:p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_0_0_rgba(15,23,42,0.05)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] hover:border-riverside-red/20 transition-all group h-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Stocks Alertes</p>
                  <ArrowUpRight size={16} className="text-slate-300 group-hover:text-riverside-red transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-950">{stats.articles_alerte} <span className="text-[10px] md:text-xs text-slate-400 font-bold">UNITÉS</span></h3>
                <div className="mt-5 flex items-center gap-2 text-[10px] md:text-[11px] font-black text-riverside-red animate-pulse">
                  <AlertTriangle size={14} /> Seuil critique atteint
                </div>
              </motion.div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Alerts Center section */}
            <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-[0_12px_0_0_rgba(15,23,42,0.05)]">
              <h2 className="text-[10px] md:text-sm font-black text-slate-950 uppercase tracking-[0.3em] mb-6 md:mb-8 flex items-center gap-3">
                <Bell size={18} className="text-riverside-red" /> Notifications Stratégiques
              </h2>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="py-12 md:py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">Silence Ops • Aucune anomalie</div>
                ) : (
                  alerts.map((alert, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className="p-4 md:p-6 bg-slate-50 border border-slate-100 rounded-[1.25rem] md:rounded-[1.5rem] hover:border-riverside-red/30 transition-all flex gap-4 md:gap-5"
                    >
                      <div className={cn(
                        "w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        alert.type === 'CRITICAL' ? 'bg-riverside-red/10 text-riverside-red' : 
                        alert.type === 'STOCK' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                      )}>
                        <alert.icon size={20} className="md:size-[24px]" />
                      </div>
                      <div>
                        <h4 className="text-[11px] md:text-sm font-black text-slate-950 uppercase mb-1 md:mb-2">{alert.title}</h4>
                        <p className="text-[9px] md:text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-tight">{alert.desc}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* File d'attente du jour (Synchronisé Admission) */}
            <div className="bg-white rounded-[24px] md:rounded-[32px] overflow-hidden border border-slate-100 shadow-xl shadow-slate-100/50">
               <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                 <div>
                   <h2 className="text-lg font-bold text-red-600 border-b pb-2 mb-2 sm:mb-4 uppercase tracking-tighter">File d&apos;attente du jour</h2>
                   <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1" suppressHydrationWarning>File active du {new Date().toLocaleDateString()}</p>
                 </div>
                 <div className="flex items-center gap-2 md:gap-3">
                   {loadingQueue && <Loader2 className="animate-spin text-riverside-red" size={16} />}
                   <button 
                     onClick={fetchWaitingList}
                     className="p-2.5 md:p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                   >
                     <Zap size={16} className="md:size-[18px]" />
                   </button>
                   <Link href="/admission" className="flex-1 sm:flex-none">
                    <button className="w-full sm:w-auto px-4 md:px-5 py-2.5 bg-riverside-red text-white text-[9px] md:text-[10px] font-black uppercase rounded-xl hover:bg-slate-900 transition-all shadow-lg flex items-center justify-center gap-2">
                       Admission <ArrowUpRight size={14} />
                    </button>
                   </Link>
                 </div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[600px] lg:min-w-0">
                   <thead>
                     <tr className="bg-slate-50/50">
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Heure</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Motif & Service</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {waitingList.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-bold uppercase text-xs">Aucun patient en attente aujourd&apos;hui</td>
                       </tr>
                     ) : (
                       waitingList.map((entry) => (
                        <tr 
                          key={entry.id} 
                          className={cn(
                            "group hover:bg-slate-50/30 transition-all",
                            entry.urgence && "bg-red-50/30 border-l-4 border-l-riverside-red",
                            entry.statut === "Annulé" && "opacity-40 grayscale"
                          )}
                        >
                          <td className="px-8 py-6">
                             <span className="text-xs font-black text-slate-400 italic font-mono uppercase" suppressHydrationWarning>
                               {entry.heure_arrivee ? new Date(entry.heure_arrivee).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                             </span>
                          </td>
                          <td className="px-8 py-6">
                            <div>
                              <p className={cn("text-sm font-black text-slate-900 uppercase", entry.urgence && "text-riverside-red")}>{entry.patients?.nom_complet}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 {entry.urgence && entry.statut !== "Annulé" && <div className="w-2 h-2 bg-riverside-red animate-ping rounded-full" />}
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">
                                   {entry.patients?.type_assurance}
                                 </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded uppercase">
                                   {entry.orientation || "Consultation"}
                                 </span>
                                 <span className="text-[10px] font-black text-slate-900 uppercase">
                                   {entry.service}
                                 </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight line-clamp-1 italic">{entry.motif}</p>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className={cn(
                              "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                              entry.statut === "En attente" ? "bg-slate-100 text-slate-500" : 
                              entry.statut === "Annulé" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                            )}>
                              {entry.statut}
                            </span>
                          </td>
                        </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>

          {/* Journal des Ventes (Synchronisé Trésorerie) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-6 md:p-10 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">Journal des Ventes du Jour</h3>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Récapitulatif des transactions encaissées aujourd&apos;hui</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 xl:gap-4">
                <div className="flex items-center gap-6 md:gap-8">
                  <div className="text-left">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-1">Total Journalier</p>
                    <p className="text-lg md:text-xl font-black text-slate-900">{stats.ca_jour.toLocaleString()} FCFA</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-1">Encaisse Réelle</p>
                    <p className="text-lg md:text-xl font-black text-emerald-500">{stats.encaisse_reelle.toLocaleString()} FCFA</p>
                  </div>
                </div>
                <Link href="/tresorerie" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-[9px] md:text-[10px] font-black uppercase rounded-xl hover:bg-riverside-red transition-all shadow-lg flex items-center justify-center gap-2">
                    Détails Trésorerie <ArrowUpRight size={14} />
                  </button>
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-0">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Heure</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Patient</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Désignation</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Total</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Perçu</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Reste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {journal.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold uppercase text-xs">Aucune transaction enregistrée aujourd&apos;hui</td>
                    </tr>
                  ) : (
                    journal.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 text-[11px] font-mono font-bold text-slate-400">
                          {tx.date_transaction ? new Date(tx.date_transaction).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-black text-slate-800 uppercase leading-none">{tx.patients?.nom_complet || "Patient Externe"}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">ID: {tx.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-[10px] font-bold text-slate-600 line-clamp-1 max-w-xs">{tx.description}</p>
                        </td>
                        <td className="px-8 py-5 text-right text-xs font-black text-slate-900 tabular-nums">
                          {(parseFloat(tx.montant_total) || 0).toLocaleString()}
                        </td>
                        <td className="px-8 py-5 text-right text-xs font-black text-emerald-500 tabular-nums">
                          {(parseFloat(tx.montant_verse) || 0).toLocaleString()}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className={cn(
                            "text-xs font-black tabular-nums",
                            tx.reste_a_payer > 0 ? "text-riverside-red" : "text-slate-300"
                          )}>
                            {(parseFloat(tx.reste_a_payer) || 0).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Dépenses en attente d'approbation */}
          <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-[0_12px_0_0_rgba(15,23,42,0.05)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <h2 className="text-[10px] md:text-sm font-black text-slate-950 uppercase tracking-[0.3em] flex items-center gap-3">
                <CreditCard size={18} className="text-riverside-red" /> Validation Dépenses
              </h2>
              <div className="flex items-center gap-3 md:gap-4">
                <span className="text-[8px] md:text-[10px] bg-red-50 text-riverside-red px-3 py-1 rounded-full font-black uppercase">
                  {pendingExpenses.length} À VALIDER
                </span>
                <Link href="/comptabilite" className="flex-1 sm:flex-none">
                  <button className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-600 text-[8px] md:text-[9px] font-black uppercase rounded-xl hover:bg-slate-900 hover:text-white transition-all border border-slate-200 flex items-center justify-center gap-2">
                    Comptabilité <ArrowUpRight size={14} />
                  </button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingExpenses.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                  Aucune dépense en attente de validation
                </div>
              ) : (
                pendingExpenses.map((exp) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={exp.id}
                    className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-riverside-red shadow-sm">
                        <Wallet size={20} />
                      </div>
                      <span className="text-[10px] font-mono font-black text-slate-400">#{exp.id.slice(0, 6)}</span>
                    </div>
                    
                    <h4 className="text-lg font-black text-slate-950 mb-1">{exp.montant.toLocaleString()} FCFA</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4 line-clamp-1">{exp.description}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{exp.date_operation}</span>
                      <button 
                        onClick={() => handleApproveExpense(exp.id)}
                        className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-emerald-600 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                      >
                        <ShieldCheck size={14} /> Approuver
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Historique des Décaissements (Design Premium) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white border border-slate-100 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-[0_15px_30px_rgba(15,23,42,0.05)]"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 md:mb-10">
              <div>
                <h2 className="text-lg md:text-xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white"><Wallet size={20} /></div>
                  Historique Décaissements
                </h2>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest pl-14">Sorties de caisse consolidées</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                  Total Sorties: {(expenseHistory.reduce((acc, curr) => acc + (curr.montant || 0), 0)).toLocaleString()} FCFA
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {expenseHistory.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">
                  Aucun mouvement de décaissement enregistré
                </div>
              ) : (
                expenseHistory.slice(0, 6).map((exp) => (
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    key={exp.id} 
                    className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all border-l-4 border-l-slate-900 group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(exp.created_at || exp.date_operation).toLocaleDateString()}</p>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase",
                        exp.statut === 'Approuvé' || exp.statut === 'Validé' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {exp.statut}
                      </span>
                    </div>
                    <p className="text-lg font-black text-slate-900 mb-2">{(exp.montant || 0).toLocaleString()} <span className="text-[10px]">FCFA</span></p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight line-clamp-1 group-hover:line-clamp-none transition-all">{exp.description}</p>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom Column: AI Strategic Chat - Google AI Studio Style */}
        <div className="xl:col-span-12">
           <div className="bg-white border border-slate-100 rounded-[2.5rem] md:rounded-[3.5rem] h-[600px] md:h-[850px] flex flex-col shadow-[0_20px_0_0_rgba(15,23,42,0.05)] relative overflow-hidden transition-all duration-700">
              {/* Header section */}
              <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4 md:gap-5">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-riverside-red rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-red-100 animate-pulse-border">
                    <BrainCircuit size={20} className="md:size-[28px]" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-lg font-black text-slate-950 uppercase tracking-tighter">Riverside Intelligence</h3>
                    <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">Assistant Stratégique</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                   <Link href="/patron/chat">
                     <button className="px-3 md:px-5 py-2 md:py-2.5 bg-slate-900 hover:bg-riverside-red text-white rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg">
                       <Zap size={12} className="animate-pulse md:size-[14px]" /> <span className="hidden sm:inline">Mode Plein Écran</span>
                     </button>
                   </Link>
                   <div className="hidden lg:block px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">AUDIT LIVE CONNECTÉ</div>
                </div>
              </div>

              {/* Chat Viewport */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 space-y-8 md:space-y-12 scrollbar-hide max-w-5xl mx-auto w-full">
                {chatMessages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className="flex flex-col gap-4 md:gap-6"
                  >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-lg border",
                         msg.role === 'user' ? "text-slate-500 bg-slate-50 border-slate-100" : "text-riverside-red bg-red-50 border-red-100"
                       )}>
                         {msg.role === 'user' ? 'DG' : 'ANALYSTE RIVERSIDE'}
                       </div>
                    </div>
                    <div className="text-sm md:text-lg leading-[1.6] md:leading-[1.8] font-medium text-slate-800 max-w-none">
                      <div className="markdown-content">
                        <Markdown
                          components={{
                            p: ({ children }) => <p className="mb-4 md:mb-8 last:mb-0">{children}</p>,
                            h1: ({ children }) => <h1 className="text-xl md:text-2xl font-black text-slate-950 mb-4 md:mb-6 uppercase tracking-tight">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg md:text-xl font-black text-slate-950 mb-3 md:mb-5 uppercase tracking-tight">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base md:text-lg font-black text-slate-950 mb-2 md:mb-4 uppercase tracking-tight">{children}</h3>,
                            strong: ({ children }) => <strong className="font-black text-slate-950">{children}</strong>,
                            ul: ({ children }) => <ul className="space-y-2 md:space-y-4 mb-4 md:mb-8">{children}</ul>,
                            li: ({ children }) => (
                              <li className="flex gap-3 md:gap-4 items-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-riverside-red mt-[0.8em] md:mt-[1em] shrink-0" />
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
                  <div className="flex items-center gap-3 md:gap-4 p-6 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] w-fit">
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-riverside-red rounded-full animate-bounce" />
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-riverside-red rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-riverside-red rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 md:ml-4">Analyse en cours...</span>
                  </div>
                )}
              </div>

              {/* Prompt Bar section */}
              <div className="p-6 md:p-12 pt-0 flex justify-center">
                <form onSubmit={handleChat} className="relative w-full max-w-3xl">
                  <div className="relative bg-slate-50 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-inner group hover:border-riverside-red/30 transition-all p-1 md:p-2 pr-3 md:pr-4 flex items-center">
                    <input 
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Analyse financière..."
                      className="flex-1 bg-transparent px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <button 
                      type="submit"
                      disabled={chatLoading}
                      className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-full flex items-center justify-center text-white hover:bg-riverside-red transition-all shadow-lg active:scale-90 disabled:opacity-50"
                    >
                      <Send size={16} className="md:size-[18px]" />
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
