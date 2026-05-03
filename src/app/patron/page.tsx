"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Wallet, ShieldCheck, Activity, CheckCircle, 
  XCircle, Clock, AlertTriangle, Loader2, ArrowRight, FileText
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";

export default function PatronDashboard() {
  const { userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // KPIs
  const [stats, setStats] = useState({
    encaisseJour: 0,
    caJour: 0,
    dettesGlobales: 0,
    depensesJour: 0
  });

  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && userRole !== 'patron') {
      router.push('/');
    } else if (userRole === 'patron') {
      fetchDashboardData();
    }
  }, [userRole, authLoading, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Synchronisation parfaite avec la Caisse (Transactions du jour)
      const { data: txJour } = await supabase
        .from('transactions_caisse')
        .select('montant_total, montant_verse')
        .gte('date_transaction', today.toISOString());

      let encaisse = 0;
      let ca = 0;
      if (txJour) {
        txJour.forEach(tx => {
          encaisse += parseFloat(tx.montant_verse || 0);
          ca += parseFloat(tx.montant_total || 0);
        });
      }

      // 2. Dettes Globales (Reste à payer)
      const { data: dettesData } = await supabase
        .from('transactions_caisse')
        .select('reste_a_payer')
        .gt('reste_a_payer', 0);
      
      const dettesTotal = dettesData ? dettesData.reduce((acc, curr) => acc + parseFloat(curr.reste_a_payer || 0), 0) : 0;

      // 3. Dépenses Validées du jour
      const { data: depensesJourData } = await supabase
        .from('comptabilite_manuelle')
        .select('montant')
        .eq('flux', 'SORTIE')
        .eq('statut', 'Validé')
        .gte('created_at', today.toISOString());
        
      const depensesTotal = depensesJourData ? depensesJourData.reduce((acc, curr) => acc + parseFloat(curr.montant || 0), 0) : 0;

      setStats({
        encaisseJour: encaisse,
        caJour: ca,
        dettesGlobales: dettesTotal,
        depensesJour: depensesTotal
      });

      // 4. Dépenses en attente d'approbation
      const { data: pendingData } = await supabase
        .from('comptabilite_manuelle')
        .select('*')
        .eq('flux', 'SORTIE')
        .eq('statut', 'En attente')
        .order('created_at', { ascending: false });
        
      setPendingExpenses(pendingData || []);

      // 5. Activité Récente / Audits (Remplace les fausses données)
      const { data: activityData } = await supabase
        .from('transactions_caisse')
        .select('id, description, montant_total, statut_paiement, date_transaction, patients(nom_complet)')
        .order('date_transaction', { ascending: false })
        .limit(6);
        
      setRecentActivity(activityData || []);

    } catch (err: any) {
      console.error("Erreur Dashboard Patron:", err);
      toast.error("Erreur de synchronisation des données");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExpense = async (id: string, action: 'Validé' | 'Rejeté') => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('comptabilite_manuelle')
        .update({ statut: action })
        .eq('id', id);

      if (error) throw error;

      toast.success(action === 'Validé' ? "Dépense approuvée ✅" : "Dépense rejetée ❌");
      await fetchDashboardData(); // Rafraîchir les données
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-slate-900" size={48} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-8 pb-20">
      
      {/* HEADER */}
      <div className="bg-slate-950 rounded-[3rem] p-10 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center gap-4">
              <ShieldCheck className="text-emerald-400" size={36} />
              BUREAU <span className="text-slate-400">DIRECTION</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Vue Stratégique & Contrôle Financier</p>
          </div>
          <div className="bg-white/10 border border-white/20 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Temps Réel</span>
          </div>
        </div>
      </div>

      {/* KPIs (Indicateurs Clés) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Wallet size={14} /> Encaisse du Jour</p>
          <p className="text-3xl font-black text-emerald-600 tabular-nums leading-none">{stats.encaisseJour.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Cash & Mobile Money réels</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14} /> Total Facturé (CA)</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">{stats.caJour.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Facturation brute (jour)</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Créances & Dettes</p>
          <p className="text-3xl font-black text-amber-600 tabular-nums leading-none">{stats.dettesGlobales.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Reste à recouvrer (Global)</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={14} /> Dépenses du Jour</p>
          <p className="text-3xl font-black text-riverside-red tabular-nums leading-none">{stats.depensesJour.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Décaissements validés</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* MODULE: APPROBATION DES DÉPENSES */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-100 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                <Clock className="text-amber-500" />
                Approbations Requises
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dépenses en attente de validation</p>
            </div>
            <div className="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg text-xs font-black">{pendingExpenses.length}</div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {pendingExpenses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <ShieldCheck size={48} className="opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Aucune dépense en attente</p>
              </div>
            ) : (
              pendingExpenses.map(depense => (
                <div key={depense.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase">{depense.description}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Saisi le {new Date(depense.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-lg font-black text-slate-900 tabular-nums">{(parseFloat(depense.montant) || 0).toLocaleString()} <span className="text-[10px]">FCFA</span></span>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleApproveExpense(depense.id, 'Validé')}
                      disabled={processingId === depense.id}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      {processingId === depense.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Valider
                    </button>
                    <button 
                      onClick={() => handleApproveExpense(depense.id, 'Rejeté')}
                      disabled={processingId === depense.id}
                      className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-riverside-red rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-red-100"
                    >
                      {processingId === depense.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Rejeter
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MODULE: AUDIT LOGS (Données réelles) */}
        <div className="bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <FileText className="text-slate-400" />
                Dernières Transactions
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Audit de la caisse en direct</p>
            </div>
            <button onClick={fetchDashboardData} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <Activity size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {recentActivity.length === 0 ? (
               <div className="h-full flex items-center justify-center">
                  <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Aucune transaction récente</p>
               </div>
            ) : (
              recentActivity.map(activity => (
                <div key={activity.id} className="group p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white leading-none line-clamp-1">{activity.patients?.nom_complet || "Client Externe"}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {new Date(activity.date_transaction).toLocaleTimeString()} • {activity.statut_paiement}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white tabular-nums">{(parseFloat(activity.montant_total) || 0).toLocaleString()}</p>
                    <p className="text-[8px] font-black text-slate-500 uppercase">FCFA</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button onClick={() => router.push('/tresorerie')} className="w-full mt-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            Voir le journal complet <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
