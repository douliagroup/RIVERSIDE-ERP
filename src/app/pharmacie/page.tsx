"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { 
  Pill, 
  FlaskConical, 
  Search,
  Loader2,
  CheckCircle2,
  ShoppingCart,
  ClipboardList,
  Check,
  User,
  ArrowRight,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

interface StockItem {
  id: string;
  article: string;
  categorie: string;
  quantite_actuelle: number;
  seuil_alerte: number;
  prix_vente: number;
}

interface Prescription {
  id: string;
  patient_id: string;
  medecin: string;
  contenu: string;
  statut_pharmacie: 'Non servie' | 'Partiellement servie' | 'Terminée';
  created_at: string;
  patients: { nom_complet: string };
}

export default function PharmaciePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab ] = useState<'prescriptions' | 'vente'>('prescriptions');
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Direct Sale Form State
  const [saleForm, setSaleForm] = useState({
    stockId: "",
    quantite: "1"
  });

  useEffect(() => {
    fetchPrescriptions();
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const { data, error } = await supabase
        .from('stocks_pharmacie')
        .select('*')
        .order('article', { ascending: true });
      if (error) throw error;
      setStocks(data || []);
    } catch (err: any) {
      console.error("Stocks error:", err);
    }
  };

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*, patients(nom_complet)')
        .eq('statut_pharmacie', 'Non servie')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPrescriptions(data as any || []);
    } catch (err: any) {
      toast.error("Erreur prescriptions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsServed = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ statut_pharmacie: 'Terminée' })
        .eq('id', id);
      if (error) throw error;
      toast.success("Ordonnance marquée comme terminée");
      fetchPrescriptions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.stockId || !saleForm.quantite) return;
    
    setSubmitting(true);
    try {
      const item = stocks.find(s => s.id === saleForm.stockId);
      if (!item) throw new Error("Article non trouvé");

      const qty = parseInt(saleForm.quantite);
      if (qty > item.quantite_actuelle) throw new Error("Stock insuffisant !");

      const { error } = await supabase
        .from('stocks_pharmacie')
        .update({ quantite_actuelle: item.quantite_actuelle - qty })
        .eq('id', item.id);

      if (error) throw error;

      toast.success(`Délivré: ${qty} x ${item.article}`);
      setSaleForm({ stockId: "", quantite: "1" });
      fetchStocks();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-4 uppercase">
            <div className="p-3 bg-red-100 rounded-2xl text-riverside-red shadow-inner">
              <Pill size={28} />
            </div>
            Le Comptoir Pharmacie
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service & Délivrance Riverside Medical Center</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
          <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-[10px] font-black">
            {user?.email?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-900 uppercase leading-none">Connecté</p>
            <p className="text-[9px] font-bold text-slate-400 truncate max-w-[120px]">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-8 border-b border-slate-100">
        <button 
          onClick={() => setActiveTab('prescriptions')}
          className={cn(
            "pb-4 px-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-3",
            activeTab === 'prescriptions' ? "text-riverside-red" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <ClipboardList size={16} />
          Prescriptions Médicales
          {prescriptions.length > 0 && (
            <span className="bg-riverside-red text-white text-[8px] px-2 py-0.5 rounded-full animate-pulse">
              {prescriptions.length}
            </span>
          )}
          {activeTab === 'prescriptions' && <motion.div layoutId="pharmaTab" className="absolute bottom-0 left-0 right-0 h-1 bg-riverside-red rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('vente')}
          className={cn(
            "pb-4 px-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-3",
            activeTab === 'vente' ? "text-riverside-red" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <ShoppingCart size={16} />
          Vente Directe
          {activeTab === 'vente' && <motion.div layoutId="pharmaTab" className="absolute bottom-0 left-0 right-0 h-1 bg-riverside-red rounded-t-full" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'prescriptions' ? (
          <motion.div 
            key="prescriptions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
                <Loader2 size={40} className="animate-spin text-riverside-red" />
                <p className="text-[10px] font-black uppercase tracking-widest">Récupération des ordonnances...</p>
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="py-20 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem] text-center flex flex-col items-center justify-center gap-4">
                <CheckCircle2 size={48} className="text-emerald-400" />
                <p className="text-xs font-bold text-slate-400 uppercase italic">Toutes les ordonnances ont été servies</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {prescriptions.map((p) => (
                  <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-8 hover:border-red-100 transition-all group">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-riverside-red transition-all">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Prescrit par {p.medecin}</p>
                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{p.patients?.nom_complet || 'Patient Inconnu'}</h3>
                        </div>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {p.contenu}
                      </div>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest pl-1">Prescrit le {new Date(p.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center">
                      <button 
                        onClick={() => markAsServed(p.id)}
                        className="bg-riverside-red text-white h-full px-10 py-6 md:py-0 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                        <Check size={18} /> Marquer comme Servie
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="vente"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-center py-10"
          >
            <div className="w-full max-w-xl bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-riverside-red" />
               <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-10 text-center">Délivrance de Médicaments</h2>
               
               <form onSubmit={handleDeliver} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Article en Stock</label>
                    <div className="relative">
                      <select 
                        required
                        value={saleForm.stockId}
                        onChange={e => setSaleForm({ ...saleForm, stockId: e.target.value })}
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm appearance-none pr-12"
                      >
                        <option value="">Sélectionner un médicament...</option>
                        {stocks.map(s => (
                          <option key={s.id} value={s.id} disabled={s.quantite_actuelle <= 0}>
                            {s.article} ({s.quantite_actuelle} en stock) - {s.prix_vente.toLocaleString()} FCFA
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantité à Délivrer</label>
                    <input 
                      type="number"
                      required
                      min="1"
                      value={saleForm.quantite}
                      onChange={e => setSaleForm({ ...saleForm, quantite: e.target.value })}
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-black text-lg text-center tabular-nums"
                    />
                  </div>

                  <div className="pt-4">
                    <button 
                      disabled={submitting || !saleForm.stockId}
                      className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-riverside-red transition-all flex items-center justify-center gap-4 disabled:opacity-50 group"
                    >
                      {submitting ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          Délivrer maintenant
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
               </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
