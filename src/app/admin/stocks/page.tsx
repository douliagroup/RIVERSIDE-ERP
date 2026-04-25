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

interface StockItem {
  id: string;
  designation: string;
  categorie: string;
  quantite_actuelle: number;
  seuil_alerte: number;
  unite: string;
  prix_unitaire: number;
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("Tous");

  const categories = ["Tous", "Pharmacie", "Laboratoire", "Consommables", "Maintenance"];

  const fetchStocks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .order('designation', { ascending: true });
    
    if (error) console.error("Erreur stocks:", error);
    else setStocks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const filteredStocks = stocks.filter(item => {
    const matchesSearch = item.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "Tous" || item.categorie === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: stocks.length,
    alerte: stocks.filter(s => s.quantite_actuelle <= s.seuil_alerte).length,
    valeur: stocks.reduce((acc, curr) => acc + (curr.quantite_actuelle * (curr.prix_unitaire || 0)), 0)
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Package size={28} />
            </div>
            Inventaire & <span className="text-riverside-red">Logistique</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Pharmacie, Labo & Consommables Médicaux</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-1">
             {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setFilter(cat)}
                 className={cn(
                   "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                   filter === cat ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
                 )}
               >
                 {cat}
               </button>
             ))}
           </div>
           <button className="px-6 py-4 bg-riverside-red text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:scale-105 transition-all flex items-center gap-2">
             <Plus size={16} /> Nouvel Article
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
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantité actuelle</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Seuil Alerte</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Prix Unitaire</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStocks.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div>
                      <p className="text-sm font-black text-slate-900 group-hover:text-riverside-red transition-colors">{item.designation}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Ref: {item.id.slice(0,8)}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase">
                      {item.categorie}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <div className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black tabular-nums border",
                        item.quantite_actuelle <= item.seuil_alerte 
                        ? "bg-red-50 border-red-100 text-red-600" 
                        : "bg-emerald-50 border-emerald-100 text-emerald-600"
                      )}>
                        {item.quantite_actuelle} {item.unite || 'u'}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-xs font-bold text-slate-400 tabular-nums">{item.seuil_alerte}</span>
                  </td>
                  <td className="px-8 py-6 text-right font-mono font-black text-xs text-slate-900">
                    {(item.prix_unitaire || 0).toLocaleString()} <span className="text-[9px] text-slate-400">FCFA</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                        <History size={14} />
                      </button>
                      <button className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-riverside-red hover:text-white transition-all">
                        <Plus size={14} />
                      </button>
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
    </div>
  );
}
