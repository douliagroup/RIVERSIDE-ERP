"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";

interface Entry {
  id: string;
  date_operation: string;
  libelle: string;
  montant: number;
  flux: "ENTREE" | "SORTIE";
  created_at: string;
}

const CATEGORIES = [
  "Prestations Espèces", 
  "Consultations Externes",
  "Assurances (Recettes)",
  "ENEO (Électricité)", 
  "CAMWATER (Eau)", 
  "Intrants Laboratoire", 
  "Médicaments & Pharmacie",
  "Salaires Personnel", 
  "Loyer Bâtiment",
  "Maintenance & Réparations",
  "Impôts & Taxes",
  "Marketing & CM",
  "Divers Opérationnel"
];

export default function AccountingPage() {
  const { userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userRole !== 'patron' && userRole !== 'comptable') {
      router.push('/');
    }
  }, [userRole, router]);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [systemTotalToday, setSystemTotalToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date_operation: new Date().toISOString().split('T')[0],
    libelle: "",
    categorie: "Prestations Espèces",
    montant: "",
    flux: "ENTREE" as "ENTREE" | "SORTIE"
  });

  const summary = entries.reduce((acc, curr) => {
    if (curr.flux === "ENTREE") acc.entrees += curr.montant;
    else acc.sorties += curr.montant;
    acc.solde = acc.entrees - acc.sorties;
    return acc;
  }, { entrees: 0, sorties: 0, solde: 0 });

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // Fetch manual entries
    const { data, error } = await supabase
      .from('comptabilite_manuelle')
      .select('*')
      .order('date_operation', { ascending: false });
    
    if (error) console.error("Erreur fetch comptabilité:", error);
    else setEntries(data || []);

    // Fetch theoretical CA for today from transactions
    const { data: systemData } = await supabase
      .from('transactions_caisse')
      .select('montant_total')
      .gte('date_transaction', `${today}T00:00:00Z`)
      .lte('date_transaction', `${today}T23:59:59Z`);
    
    const sysTotal = systemData?.reduce((acc, curr) => acc + (curr.montant_total || 0), 0) || 0;
    setSystemTotalToday(sysTotal);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comptabilite_manuelle')
        .insert([{
          ...form,
          montant: parseFloat(form.montant)
        }]);
      
      if (error) throw error;
      setForm({
        date_operation: new Date().toISOString().split('T')[0],
        libelle: "",
        categorie: "Prestations Espèces",
        montant: "",
        flux: "ENTREE"
      });
      fetchData();
    } catch (err) {
      console.error("Erreur insertion:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <DollarSign className="text-riverside-red" />
              Saisie Comptable
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Registre Manuel • Riverside</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="bg-white p-3 px-5 rounded-2xl border border-slate-100 flex flex-col items-end shadow-sm">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audit Théorique (Sys)</span>
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                 <span className="text-sm font-black text-slate-900">{systemTotalToday.toLocaleString()} FCFA</span>
               </div>
            </div>
            <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex flex-col items-end">
              <span className="text-[9px] font-black text-emerald-500 uppercase">Entrées</span>
              <span className="text-sm font-black text-emerald-700">{summary.entrees.toLocaleString()} FCFA</span>
            </div>
            <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100 flex flex-col items-end">
              <span className="text-[9px] font-black text-red-500 uppercase">Sorties</span>
              <span className="text-sm font-black text-red-700">{summary.sorties.toLocaleString()} FCFA</span>
            </div>
            <div className="bg-slate-900 px-4 py-2 rounded-2xl flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase">Solde</span>
              <span className="text-sm font-black text-white">{summary.solde.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Form Side */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 sticky top-8">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Écriture Rapide</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Date</label>
                    <input 
                      type="date"
                      required
                      value={form.date_operation}
                      onChange={e => setForm({...form, date_operation: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-riverside-red transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Flux</label>
                    <select 
                      value={form.flux}
                      onChange={e => setForm({...form, flux: e.target.value as "ENTREE" | "SORTIE"})}
                      className={cn(
                        "w-full p-3 border rounded-xl text-xs font-black uppercase outline-none transition-all",
                        form.flux === "ENTREE" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
                      )}
                    >
                      <option value="ENTREE">ENTRÉE (+)</option>
                      <option value="SORTIE">SORTIE (-)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Désignation</label>
                  <input 
                    required
                    placeholder="Libellé de l'opération..."
                    value={form.libelle}
                    onChange={e => setForm({...form, libelle: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-riverside-red transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Catégorie</label>
                  <select 
                    required
                    value={form.categorie}
                    onChange={e => setForm({...form, categorie: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-riverside-red transition-all"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Montant (FCFA)</label>
                  <input 
                    type="number"
                    required
                    placeholder="0"
                    value={form.montant}
                    onChange={e => setForm({...form, montant: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-riverside-red transition-all font-mono font-black"
                  />
                </div>

                <button 
                  disabled={submitting}
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-4"
                >
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : (
                    <>
                      <Plus size={14} /> Enregistrer la ligne
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* List Side */}
          <div className="lg:col-span-3">
            <div className="bg-white p-2 rounded-[32px] shadow-sm border border-slate-100 min-h-[600px] flex flex-col">
              <div className="p-6 pb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Journal de Caisse</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Flux journaliers enregistrés</p>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black text-slate-400 uppercase">Live Update</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 pb-8 mt-4 space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="animate-spin text-slate-200" size={32} />
                  </div>
                ) : (
                  entries.map((item) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={item.id} 
                      className="group flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                          item.flux === "ENTREE" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                          {item.flux === "ENTREE" ? <Plus size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(item.date_operation).toLocaleDateString()}</p>
                            <span className="text-[7px] font-black text-slate-400 bg-slate-100 px-1 py-0.2 rounded uppercase">{item.categorie}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700">{item.libelle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-black",
                          item.flux === "ENTREE" ? "text-emerald-600" : "text-red-600"
                        )}>
                          {item.flux === "ENTREE" ? "+" : "-"} {item.montant.toLocaleString()}
                        </p>
                        <p className="text-[7px] font-black text-slate-300 uppercase italic">FCFA</p>
                      </div>
                    </motion.div>
                  ))
                )}
                {entries.length === 0 && !loading && (
                   <div className="h-60 flex flex-col items-center justify-center text-slate-300 italic text-sm">
                     <FileText className="mb-4 opacity-20" size={48} />
                     Aucune écriture enregistrée.
                   </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
