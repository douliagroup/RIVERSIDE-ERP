"use client";

import React, { useState, useEffect } from "react";
import { 
  Pill, 
  FlaskConical, 
  AlertTriangle, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search,
  Package,
  Loader2,
  CheckCircle2,
  History,
  TrendingDown,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";

interface StockItem {
  id: string;
  nom_article: string;
  categorie: 'médicament' | 'intrant';
  quantite_stock: number;
  seuil_alerte: number;
  unite: string;
  prix_unitaire_vente: number;
}

export default function PharmaciePage() {
  const [activeTab, setActiveTab] = useState<'médicament' | 'intrant'>('médicament');
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    nom: "",
    categorie: "médicament" as StockItem['categorie'],
    quantite: "",
    seuil_alerte: "10",
    unite: "Boîte",
    prix_unitaire: ""
  });

  const fetchStocks = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stocks_pharmacie')
        .select('*')
        .eq('categorie', activeTab)
        .order('nom_article');

      if (error) throw error;
      setStocks(data || []);
    } catch (err) {
      console.error("Error fetching stocks:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Nettoyage et validation des données (Pattern Administration)
      const insertData = {
        nom_article: form.nom,
        categorie: form.categorie,
        quantite_stock: parseInt(form.quantite) || 0,
        seuil_alerte: parseInt(form.seuil_alerte) || 0,
        unite: form.unite,
        prix_unitaire_vente: parseFloat(form.prix_unitaire) || 0
      };

      console.log("Flux Pharmacie - Tentative d'insertion:", insertData);

      const { data, error } = await supabase
        .from('stocks_pharmacie')
        .insert([insertData])
        .select();

      if (error) {
        console.error("ERREUR CRITIQUE PHARMACIE:", error.message, "| Détails:", error.details, "| Hint:", error.hint);
        throw error;
      }

      console.log("Flux Pharmacie - Succès:", data);
      setShowAddModal(false);
      setForm({
        nom: "",
        categorie: activeTab,
        quantite: "",
        seuil_alerte: "10",
        unite: "Boîte",
        prix_unitaire: ""
      });
      fetchStocks();
    } catch (err: any) {
      console.error("Erreur globale lors de l'ajout stock pharmacie:", err);
      alert(`Erreur d'enregistrement : ${err.message || "Vérifiez la console pour plus de détails"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const updateQuantity = async (id: string, current: number, delta: number) => {
    try {
      await supabase
        .from('stocks_pharmacie')
        .update({ quantite_stock: current + delta })
        .eq('id', id);
      fetchStocks();
    } catch (err) {
      console.error("Error updating quantity:", err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4 uppercase">
            <Pill className="text-riverside-red" size={24} />
            Pharmacie & Logistique
          </h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Gestion Centrale des Stocks Stratégiques</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-lg flex items-center gap-3">
              <TrendingDown size={14} className="text-riverside-red" />
              <span className="text-sm font-black text-riverside-red tabular-nums">{stocks.filter(s => s.quantite <= s.seuil_alerte).length} ALERTES</span>
           </div>
           <button 
             onClick={() => {
               setForm(prev => ({...prev, categorie: activeTab}));
               setShowAddModal(true);
             }}
             className="bg-riverside-red text-white px-6 py-2.5 rounded-lg shadow-lg shadow-red-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] transition-all active:scale-95"
           >
              <Plus size={16} />
              Nouvel Article
           </button>
        </div>
      </div>

      {/* Tabs section */}
      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-fit">
        <button 
          onClick={() => setActiveTab('médicament')}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'médicament' ? "bg-white text-riverside-red shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Médicaments
        </button>
        <button 
          onClick={() => setActiveTab('intrant')}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'intrant' ? "bg-white text-riverside-red shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Intrants Labo
        </button>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full p-20 flex flex-col items-center justify-center gap-4">
             <Loader2 size={32} className="animate-spin text-riverside-red" />
             <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Inventaire en cours...</p>
          </div>
        ) : stocks.length === 0 ? (
          <div className="col-span-full p-20 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem] text-center flex flex-col items-center justify-center gap-4">
              <Package size={40} className="text-slate-200" />
              <p className="text-xs font-bold text-slate-400 uppercase italic">Aucun stock répertorié dans cette catégorie</p>
          </div>
        ) : (
          stocks.map((item) => (
             <motion.div 
               layout
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               key={item.id}
               className={cn(
                 "bg-white p-6 rounded-2xl border transition-all hover:shadow-xl hover:border-slate-200 group relative overflow-hidden",
                 item.quantite_stock <= item.seuil_alerte ? "border-red-100 bg-red-50/5" : "border-slate-100"
               )}
             >
               {item.quantite_stock <= item.seuil_alerte && (
                 <div className="absolute top-4 right-4 text-riverside-red">
                    <AlertTriangle size={14} className="animate-pulse" />
                 </div>
               )}
               
               <div className="space-y-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-red-50 transition-colors">
                    {activeTab === 'médicament' ? <Pill size={18} className="text-riverside-red" /> : <FlaskConical size={18} className="text-blue-500" />}
                  </div>
                  
                  <div>
                     <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase truncate leading-none">{item.nom_article}</h3>
                     <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{item.unite} • {item.prix_unitaire_vente.toLocaleString()} FCFA</p>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-50 pt-4">
                     <div>
                        <p className={cn(
                          "text-xl font-black tracking-tighter tabular-nums",
                          item.quantite_stock <= item.seuil_alerte ? "text-riverside-red" : "text-slate-900"
                        )}>{item.quantite_stock}</p>
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">En Stock</p>
                     </div>
                     <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100 shadow-inner">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantite_stock, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:text-riverside-red transition-all shadow-sm border border-transparent hover:border-slate-100"
                        >
                          <ArrowDownRight size={12} />
                        </button>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantite_stock, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:text-emerald-500 transition-all shadow-sm border border-transparent hover:border-slate-100"
                        >
                          <Plus size={12} />
                        </button>
                     </div>
                  </div>

                 {item.quantite_stock <= item.seuil_alerte && (
                   <div className="pt-2">
                      <div className="w-full bg-red-100 h-1 rounded-full overflow-hidden">
                         <div className="bg-riverside-red h-full" style={{ width: `${(item.quantite_stock / item.seuil_alerte) * 50}%` }} />
                      </div>
                      <p className="text-[7px] font-black text-riverside-red uppercase mt-1 tracking-tighter italic">Stock Critique : Réapprovisionner Immédiatement</p>
                   </div>
                 )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modern Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowAddModal(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden shadow-riverside-red/10"
             >
                <div className="p-10 space-y-8">
                   <div className="flex items-center justify-between">
                     <div>
                       <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{activeTab === 'médicament' ? "Référencer Médicament" : "Ajouter Intrant"}</h2>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Catalogue Logistique Riverside</p>
                     </div>
                     <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center text-riverside-red">
                        <Package size={32} />
                     </div>
                   </div>

                   <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Désignation de l&apos;Article</label>
                         <input 
                           required
                           type="text"
                           value={form.nom}
                           onChange={e => setForm({...form, nom: e.target.value})}
                           className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm tracking-tight"
                           placeholder="ex: Paracétamol 500mg"
                         />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantité Initiale</label>
                           <input 
                             required
                             type="number"
                             value={form.quantite}
                             onChange={e => setForm({...form, quantite: e.target.value})}
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm"
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prix Unitaire (FCFA)</label>
                           <input 
                             required
                             type="number"
                             value={form.prix_unitaire}
                             onChange={e => setForm({...form, prix_unitaire: e.target.value})}
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm"
                           />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unité</label>
                           <select 
                             value={form.unite}
                             onChange={e => setForm({...form, unite: e.target.value})}
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm appearance-none"
                           >
                              <option>Boîte</option>
                              <option>Flacon</option>
                              <option>Unité</option>
                              <option>Poche</option>
                              <option>Kit</option>
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seuil Alerte</label>
                           <input 
                             required
                             type="number"
                             value={form.seuil_alerte}
                             onChange={e => setForm({...form, seuil_alerte: e.target.value})}
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm text-riverside-red"
                           />
                        </div>
                      </div>

                      <div className="pt-6 flex gap-4">
                         <button 
                           type="button" 
                           onClick={() => setShowAddModal(false)}
                           className="flex-1 py-5 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                         >
                           Fermer
                         </button>
                         <button 
                           disabled={submitting}
                           type="submit"
                           className="flex-[2] bg-riverside-red text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl shadow-red-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                         >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                            {submitting ? "Intégration..." : "Ajouter aux Stocks"}
                         </button>
                      </div>
                   </form>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
