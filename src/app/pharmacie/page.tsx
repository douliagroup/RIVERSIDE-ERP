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

import { toast } from "sonner";

interface StockItem {
  id: string;
  nom_article: string;
  categorie: 'médicament' | 'intrant';
  quantite_stock: number;
  seuil_alerte: number;
  unite: string;
  prix_unitaire_vente: number;
  date_peremption?: string;
}

interface CatalogueItem {
  id: string;
  designation: string;
  prix_unitaire: number;
  categorie: string;
}

export default function PharmaciePage() {
  const [activeTab, setActiveTab] = useState<'médicament' | 'intrant'>('médicament');
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Movement Form State
  const [movementForm, setMovementForm] = useState({
    type: 'Entrée' as 'Entrée' | 'Sortie',
    quantite: "",
    motif: ""
  });

  // Form State
  const [form, setForm] = useState({
    nom: "",
    categorie: "médicament" as StockItem['categorie'],
    quantite: "",
    seuil_alerte: "10",
    unite: "Boîte",
    prix_unitaire: "",
    date_peremption: ""
  });

  const fetchCatalogue = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogue_tarifs')
        .select('*')
        .in('categorie', ['Pharmacie', 'Laboratoire', 'médicament', 'intrant']);
      if (!error) setCatalogue(data || []);
    } catch (err) {
      console.error("Error fetching catalogue:", err);
    }
  };

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
    fetchCatalogue();
  }, [fetchStocks]);

  const handleCatalogueSelect = (itemName: string) => {
    const item = catalogue.find(c => c.designation === itemName);
    if (item) {
      setForm({
        ...form,
        nom: item.designation,
        prix_unitaire: item.prix_unitaire.toString()
      });
    } else {
      setForm({ ...form, nom: itemName });
    }
  };

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
        prix_unitaire_vente: parseFloat(form.prix_unitaire) || 0,
        date_peremption: form.date_peremption
      };

      console.log("Flux Pharmacie - Tentative d'insertion:", insertData);

      const { data, error } = await supabase
        .from('stocks_pharmacie')
        .insert([insertData])
        .select();

      if (error) {
        toast.error(`Erreur d'enregistrement : ${error.message}`);
        console.error("ERREUR CRITIQUE PHARMACIE:", error);
        throw error;
      }

      toast.success("L'article a été ajouté au stock avec succès.");
      console.log("Flux Pharmacie - Succès:", data);
      setShowAddModal(false);
      setForm({
        nom: "",
        categorie: activeTab,
        quantite: "",
        seuil_alerte: "10",
        unite: "Boîte",
        prix_unitaire: "",
        date_peremption: ""
      });
      fetchStocks();
    } catch (err: any) {
      console.error("Erreur globale lors de l'ajout stock pharmacie:", err);
      // Le toast est déjà affiché dans le if(error) mais on en remet un au cas où c'est une exception js
      if (!err.message?.includes("Erreur d'enregistrement")) {
        toast.error(`Erreur critique : ${err.message || "Vérifiez la console"}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const qtyDelta = movementForm.type === 'Entrée' ? parseInt(movementForm.quantite) : -parseInt(movementForm.quantite);
      const newQty = selectedItem.quantite_stock + qtyDelta;

      if (newQty < 0) {
        toast.error("Stock insuffisant pour cette sortie");
        setSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('stocks_pharmacie')
        .update({ quantite_stock: newQty })
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      // Log movement history
      await supabase.from('mouvements_stock').insert([{
        article_id: selectedItem.id,
        nom_article: selectedItem.nom_article,
        type_mouvement: movementForm.type,
        quantite: Math.abs(qtyDelta),
        motif: movementForm.motif,
        personnel: "Pharmacien Riverside" // To be replaced by actual user
      }]);

      toast.success("Mouvement de stock enregistré");
      setShowMovementModal(false);
      setMovementForm({ type: 'Entrée', quantite: "", motif: "" });
      fetchStocks();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isExpiredSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
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
                 item.quantite_stock <= item.seuil_alerte || isExpiredSoon(item.date_peremption) ? "border-red-100 bg-red-50/5" : "border-slate-100"
               )}
             >
               {(item.quantite_stock <= item.seuil_alerte || isExpiredSoon(item.date_peremption)) && (
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
                     <div className="flex flex-col gap-1 mt-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.unite} • {item.prix_unitaire_vente.toLocaleString()} FCFA</p>
                        {item.date_peremption && (
                          <p className={cn(
                            "text-[8px] font-black uppercase tracking-tighter",
                            isExpiredSoon(item.date_peremption) ? "text-red-500 animate-pulse" : "text-slate-400"
                          )}>
                             Péremption: {new Date(item.date_peremption).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                     </div>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-50 pt-4">
                     <div>
                        <p className={cn(
                          "text-xl font-black tracking-tighter tabular-nums",
                          item.quantite_stock <= item.seuil_alerte ? "text-riverside-red" : "text-slate-900"
                        )}>{item.quantite_stock}</p>
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">En Stock</p>
                     </div>
                     <button 
                        onClick={() => {
                          setSelectedItem(item);
                          setShowMovementModal(true);
                        }}
                        className="px-4 py-2 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-600 rounded-xl border border-slate-100 hover:bg-riverside-red hover:text-white hover:border-riverside-red transition-all shadow-sm"
                     >
                        Gérer le stock
                     </button>
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
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sélectionner un Article (Catalogue Officiel)</label>
                         <div className="relative">
                            <select 
                              required
                              value={form.nom}
                              onChange={e => handleCatalogueSelect(e.target.value)}
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm tracking-tight appearance-none"
                            >
                               <option value="">-- Choisir dans le catalogue --</option>
                               {catalogue.length > 0 ? (
                                 catalogue.map(cat => (
                                   <option key={cat.id} value={cat.designation}>{cat.designation} ({cat.prix_unitaire} FCFA)</option>
                                 ))
                               ) : (
                                 <option disabled>Chargement du catalogue...</option>
                               )}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                               <ChevronRight size={16} className="rotate-90" />
                            </div>
                         </div>
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
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prix Unitaire (Auto)</label>
                           <input 
                             readOnly
                             value={form.prix_unitaire}
                             className="w-full p-4 bg-slate-100 border border-slate-100 rounded-2xl outline-none font-black text-sm text-slate-500 cursor-not-allowed"
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
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de Péremption</label>
                           <input 
                             required
                             type="date"
                             value={form.date_peremption}
                             onChange={e => setForm({...form, date_peremption: e.target.value})}
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm"
                           />
                        </div>
                      </div>

                      <div className="grid grid-cols-1">
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

        {showMovementModal && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowMovementModal(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
             >
                <div className="p-8 space-y-6">
                   <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-riverside-red">
                         <History size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Mouvement de Stock</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedItem.nom_article}</p>
                      </div>
                   </div>

                   <form onSubmit={handleMovement} className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                         <button 
                           type="button"
                           onClick={() => setMovementForm({...movementForm, type: 'Entrée'})}
                           className={cn(
                             "py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                             movementForm.type === 'Entrée' ? "bg-white text-emerald-600 shadow-sm border border-emerald-100" : "text-slate-400"
                           )}
                         >
                            Entrée
                         </button>
                         <button 
                           type="button"
                           onClick={() => setMovementForm({...movementForm, type: 'Sortie'})}
                           className={cn(
                             "py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                             movementForm.type === 'Sortie' ? "bg-white text-riverside-red shadow-sm border border-red-100" : "text-slate-400"
                           )}
                         >
                            Sortie
                         </button>
                      </div>

                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantité</label>
                         <input 
                           required
                           type="number"
                           value={movementForm.quantite}
                           onChange={e => setMovementForm({...movementForm, quantite: e.target.value})}
                           className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm"
                           placeholder="0"
                         />
                      </div>

                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motif / Justification</label>
                         <textarea 
                           required
                           value={movementForm.motif}
                           onChange={e => setMovementForm({...movementForm, motif: e.target.value})}
                           className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm min-h-[100px] resize-none"
                           placeholder="Livraison fournisseur, casse, ajustement inventaire..."
                         />
                      </div>

                      <div className="pt-4 flex gap-4">
                         <button 
                           type="submit"
                           disabled={submitting}
                           className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                         >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Valider le mouvement
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
