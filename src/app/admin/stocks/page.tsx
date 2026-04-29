"use client";

import React, { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  ArrowRight, 
  History,
  TrendingDown,
  Loader2,
  CheckCircle2,
  Info
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface StockItem {
  id: string;
  designation: string;
  categorie: string;
  quantite_actuelle: number;
  seuil_alerte: number;
  unite: string;
  prix_unitaire: number;
  prix_achat_unitaire?: number;
  fournisseur_id?: string;
  date_peremption?: string;
  fournisseurs?: {
    id: string;
    nom: string;
  };
}

interface Fournisseur {
  id: string;
  nom: string;
}

export default function StocksPage() {
  const { userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userRole !== 'patron' && userRole !== 'major') {
      router.push('/');
    }
  }, [userRole, router]);

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [showAddModal, setShowAddModal] = useState(false);

  const [newArticle, setNewArticle] = useState({
    designation: "",
    categorie: "Pharmacie",
    quantite_actuelle: 0,
    seuil_alerte: 10,
    prix_achat_unitaire: 0,
    unite: "unité",
    fournisseur_id: "",
    date_peremption: ""
  });

  const categories = ["Tous", "Pharmacie", "Laboratoire", "Consommables", "Maintenance"];

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Stocks with Fournisseurs join
      const { data: stockData, error: stockError } = await supabase
        .from('stocks')
        .select('*, fournisseurs(id, nom)')
        .order('designation', { ascending: true });
      
      if (stockError) console.error("Erreur stocks:", stockError);
      else setStocks(stockData || []);

      // Fetch Fournisseurs
      const { data: fournisData, error: fournisError } = await supabase
        .from('fournisseurs')
        .select('*')
        .order('nom', { ascending: true });
      
      if (fournisError) {
        console.warn("Erreur fournisseurs table (might not exist):", fournisError);
        // Fallback for demo/missing table
        setFournisseurs([{ id: "1", nom: "Dénis & Fils" }, { id: "2", nom: "Labo-Camer" }]);
      } else {
        setFournisseurs(fournisData || []);
      }
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('stocks')
        .insert([newArticle]);
      
      if (error) throw error;
      
      toast.success("Référence ajoutée avec succès !");
      await fetchData();
      setShowAddModal(false);
      setNewArticle({
        designation: "",
        categorie: "Pharmacie",
        quantite_actuelle: 0,
        seuil_alerte: 10,
        prix_achat_unitaire: 0,
        unite: "unité",
        fournisseur_id: "",
        date_peremption: ""
      });
    } catch (err: any) {
      toast.error("Erreur lors de l'ajout: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStocks = stocks.filter(item => {
    const matchesSearch = item.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "Tous" || item.categorie === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: stocks.length,
    alerte: stocks.filter(s => s.quantite_actuelle <= s.seuil_alerte).length,
    valeur: stocks.reduce((acc, curr) => acc + (curr.quantite_actuelle * (curr.prix_achat_unitaire || curr.prix_unitaire || 0)), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-riverside-red" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-[20px] flex items-center justify-center text-white shadow-xl flex-shrink-0">
            <Package size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-950 tracking-tight leading-tight">
              Inventaire <span className="hidden sm:inline text-slate-300 mx-2">|</span> <span className="text-riverside-red">Logistique</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 opacity-70">Centre de contrôle des flux & consommables</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
           <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
             {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setFilter(cat)}
                 className={cn(
                   "px-4 py-2 rounded-[12px] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                   filter === cat ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
                 )}
               >
                 {cat}
               </button>
             ))}
           </div>
           <button 
            onClick={() => setShowAddModal(true)}
            className="px-8 py-4 bg-riverside-red text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
           >
             <Plus size={18} /> Nouvel Article
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Références</p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-black text-slate-900">{stats.total}</h3>
            <span className="text-[10px] font-bold text-slate-400 mb-1">SKUs actifs</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[32px] border border-red-50 shadow-sm">
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4">Seuils Critiques</p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-black text-red-600">{stats.alerte}</h3>
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-bold text-red-500 animate-pulse">Rupture imminente</span>
               <AlertTriangle size={18} className="text-red-500 mt-1" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-xl shadow-slate-100">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Valeur du Stock</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-white">{stats.valeur.toLocaleString()} <span className="text-xs text-slate-600 uppercase">FCFA</span></h3>
            <TrendingDown size={24} className="text-slate-700 mb-1" />
          </div>
        </motion.div>
      </div>

      {/* Main Inventory List */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par désignation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:border-riverside-red transition-all"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Stock OK</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Alerte</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fournisseur</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantité actuelle</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Péremption</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Prix Achat</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStocks.map((item) => (
                <tr 
                  key={item.id} 
                  className={cn(
                    "hover:bg-slate-50/30 transition-colors group",
                    item.quantite_actuelle <= item.seuil_alerte && "bg-red-50/30"
                  )}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      {item.quantite_actuelle <= item.seuil_alerte && (
                        <AlertTriangle size={14} className="text-red-500 animate-pulse flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-riverside-red transition-colors">{item.designation}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Ref: {item.id.slice(0,8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase">
                      {item.categorie}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-[10px] font-bold text-slate-600">
                    {item.fournisseurs?.nom || "—"}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <div className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black tabular-nums border",
                        item.quantite_actuelle <= item.seuil_alerte 
                        ? "bg-red-100 border-red-200 text-red-700" 
                        : "bg-emerald-50 border-emerald-100 text-emerald-600"
                      )}>
                        {item.quantite_actuelle} {item.unite || 'u'}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center text-[10px] font-bold text-slate-500">
                    {item.date_peremption ? new Date(item.date_peremption).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-8 py-6 text-right font-mono font-black text-xs text-slate-900">
                    {(item.prix_achat_unitaire || item.prix_unitaire || 0).toLocaleString()} <span className="text-[9px] text-slate-400">FCFA</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2">
                       <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                       >
                         <History size={16} />
                       </motion.button>
                       <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-riverside-red hover:text-white transition-all shadow-sm"
                       >
                         <Plus size={16} />
                       </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStocks.length === 0 && (
            <div className="py-20 text-center text-slate-300 italic text-sm">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              Aucun article trouvé.
            </div>
          )}
        </div>
      </div>

      {/* Add Article Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowAddModal(false)} 
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[1001]" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} 
              animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }} 
              exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} 
              className="fixed top-1/2 left-1/2 w-[95%] max-w-2xl bg-white rounded-[40px] z-[1002] p-10 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide"
            >
              <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight leading-none mb-2">Ajouter au Catalogue</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enregistrement d&apos;une nouvelle référence stock</p>
                </div>
                <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center text-riverside-red">
                  <Package size={28} />
                </div>
              </div>

              <form onSubmit={handleAddArticle} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Désignation de l&apos;article</label>
                    <input 
                      required 
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-riverside-red transition-all"
                      placeholder="ex: Paracétamol 500mg, Gants de chirurgie..."
                      value={newArticle.designation}
                      onChange={e => setNewArticle({...newArticle, designation: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Catégorie</label>
                    <select 
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:border-riverside-red transition-all"
                      value={newArticle.categorie}
                      onChange={e => setNewArticle({...newArticle, categorie: e.target.value})}
                    >
                      {categories.filter(c => c !== "Tous").map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fournisseur</label>
                    <select 
                      required
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:border-riverside-red transition-all"
                      value={newArticle.fournisseur_id}
                      onChange={e => setNewArticle({...newArticle, fournisseur_id: e.target.value})}
                    >
                      <option value="">-- Choisir Fournisseur --</option>
                      {fournisseurs.map(f => (
                        <option key={f.id} value={f.id}>{f.nom}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantité Initiale</label>
                    <input 
                      type="number"
                      required 
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-riverside-red transition-all"
                      value={newArticle.quantite_actuelle}
                      onChange={e => setNewArticle({...newArticle, quantite_actuelle: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Seuil d&apos;alerte</label>
                    <input 
                      type="number"
                      required 
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-riverside-red transition-all"
                      value={newArticle.seuil_alerte}
                      onChange={e => setNewArticle({...newArticle, seuil_alerte: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix d&apos;Achat (FCFA)</label>
                    <input 
                      type="number"
                      required 
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-riverside-red transition-all"
                      value={newArticle.prix_achat_unitaire}
                      onChange={e => setNewArticle({...newArticle, prix_achat_unitaire: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date de Péremption</label>
                    <input 
                      type="date"
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-riverside-red transition-all"
                      value={newArticle.date_peremption}
                      onChange={e => setNewArticle({...newArticle, date_peremption: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] py-5 bg-slate-950 text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Enregistrer la référence
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
