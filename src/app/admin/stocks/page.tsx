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
  Info,
  ChevronDown,
  BarChart3
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface StockItem {
  id: string;
  article: string;
  categorie: string;
  quantite_actuelle: number;
  seuil_alerte: number;
  prix_vente: number;
  unite?: string;
}

export default function AdminStocksPage() {
  const { user, userRole } = useAuth();
  const router = useRouter();

  // Guard for admin/major
  useEffect(() => {
    if (userRole && userRole !== 'patron' && userRole !== 'major') {
      router.push('/');
    }
  }, [userRole, router]);

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResupplyModal, setShowResupplyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [resupplyQty, setResupplyQty] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stocks_pharmacie')
        .select('*')
        .order('article', { ascending: true });
      
      if (error) throw error;
      setStocks(data || []);
    } catch (err: any) {
      toast.error("Erreur stocks: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !resupplyQty) return;
    
    setSubmitting(true);
    try {
      const qty = parseInt(resupplyQty);
      const newQty = selectedItem.quantite_actuelle + qty;

      const { error } = await supabase
        .from('stocks_pharmacie')
        .update({ quantite_actuelle: newQty })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success(`${selectedItem.article} réapprovisionné (+${qty})`);
      setShowResupplyModal(false);
      setResupplyQty("");
      fetchData();
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStocks = stocks.filter(item => 
    item.article.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: stocks.length,
    alerte: stocks.filter(s => s.quantite_actuelle <= s.seuil_alerte).length,
    valeur: stocks.reduce((acc, curr) => acc + (curr.quantite_actuelle * curr.prix_vente), 0)
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-20 p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-slate-200">
            <Package size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">
              Le Magasin <span className="text-riverside-red">Général</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Gestion des Stocks & Inventaire Pharmacie</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black uppercase text-slate-500">Flux Synchronisé</p>
           </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
           <div className="flex justify-between items-start mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Articles Référencés</p>
              <Package className="text-slate-200 group-hover:text-slate-900 transition-colors" size={20} />
           </div>
           <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stats.total}</h3>
           <p className="text-[10px] font-bold text-slate-400 mt-2">Unités de Gestion</p>
        </div>

        <div className={cn(
          "p-8 rounded-[2.5rem] border shadow-sm relative overflow-hidden group",
          stats.alerte > 0 ? "bg-red-50 border-red-100" : "bg-white border-slate-100"
        )}>
           <div className="flex justify-between items-start mb-6">
              <p className={cn("text-[10px] font-black uppercase tracking-widest", stats.alerte > 0 ? "text-red-500" : "text-slate-400")}>Seuils Critiques</p>
              <AlertTriangle className={cn(stats.alerte > 0 ? "text-red-500 animate-pulse" : "text-slate-200")} size={20} />
           </div>
           <h3 className={cn("text-4xl font-black tracking-tighter", stats.alerte > 0 ? "text-red-600" : "text-slate-900")}>{stats.alerte}</h3>
           <p className={cn("text-[10px] font-bold mt-2", stats.alerte > 0 ? "text-red-400" : "text-slate-400")}>Points de commande atteints</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
           <div className="flex justify-between items-start mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur Marchande</p>
              <BarChart3 className="text-slate-600" size={20} />
           </div>
           <h3 className="text-3xl font-black text-white tracking-tighter">{stats.valeur.toLocaleString()} <span className="text-xs text-slate-600">FCFA</span></h3>
           <p className="text-[10px] font-bold text-slate-500 mt-2">Projection des ventes stock</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="relative w-full max-w-lg">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Chercher un médicament ou article..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red transition-all font-medium text-sm"
              />
           </div>
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                 <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                 <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Critique</span>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full">
              <thead>
                 <tr className="bg-slate-50/50">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Articles</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantité</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Seuil Alerte</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Prix Unitaire</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {loading ? (
                    <tr>
                       <td colSpan={6} className="py-20 text-center">
                          <Loader2 className="animate-spin mx-auto text-riverside-red mb-4" size={32} />
                          <p className="text-[10px] font-black uppercase text-slate-300">Récupération de l&apos;inventaire...</p>
                       </td>
                    </tr>
                 ) : filteredStocks.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="py-20 text-center italic text-slate-300 text-xs font-bold uppercase">
                          Aucun article trouvé dans le magasin
                       </td>
                    </tr>
                 ) : (
                    filteredStocks.map((item) => (
                       <tr 
                         key={item.id} 
                         className={cn(
                           "transition-colors group",
                           item.quantite_actuelle <= item.seuil_alerte ? "bg-red-50/50" : "hover:bg-slate-50/50"
                         )}
                       >
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-all",
                                  item.quantite_actuelle <= item.seuil_alerte ? "bg-red-500" : "bg-slate-200 text-slate-500 group-hover:bg-slate-900 group-hover:text-white"
                                )}>
                                   <Package size={18} />
                                </div>
                                <div>
                                   <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.article}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase">Ref: {item.id.slice(0, 8)}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                {item.categorie}
                             </span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex justify-center">
                                <span className={cn(
                                  "px-4 py-2 rounded-xl text-xs font-black tabular-nums border min-w-[60px] text-center",
                                  item.quantite_actuelle <= item.seuil_alerte 
                                  ? "bg-red-100 border-red-200 text-red-700 animate-pulse" 
                                  : "bg-emerald-50 border-emerald-100 text-emerald-600"
                                )}>
                                   {item.quantite_actuelle} {item.unite || 'u'}
                                </span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-center text-[11px] font-black text-slate-400 tabular-nums">
                             {item.seuil_alerte}
                          </td>
                          <td className="px-8 py-6 text-right font-black text-slate-900 text-sm">
                             {item.prix_vente.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">FCFA</span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex justify-center">
                                <button 
                                  onClick={() => { setSelectedItem(item); setShowResupplyModal(true); }}
                                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-riverside-red shadow-lg transition-all"
                                >
                                   Réapprovisionner
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* Resupply Modal */}
      <AnimatePresence>
         {showResupplyModal && selectedItem && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 relative overflow-hidden"
              >
                  <div className="absolute top-0 left-0 w-full h-2 bg-slate-900" />
                  <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-2">Révision du Stock</h2>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-8">{selectedItem.article}</p>

                  <form onSubmit={handleResupply} className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantité reçue</label>
                        <input 
                          type="number"
                          required
                          min="1"
                          autoFocus
                          value={resupplyQty}
                          onChange={e => setResupplyQty(e.target.value)}
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-black text-lg text-center tabular-nums"
                          placeholder="Entrez le nombre d'unités..."
                        />
                     </div>

                     <div className="flex gap-4 pt-4">
                        <button 
                          type="button" 
                          onClick={() => setShowResupplyModal(false)}
                          className="flex-1 py-5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Annuler
                        </button>
                        <button 
                          disabled={submitting}
                          className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-riverside-red transition-all flex items-center justify-center gap-3"
                        >
                           {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                           Valider la réception
                        </button>
                     </div>
                  </form>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

    </div>
  );
}
