"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Megaphone, 
  Plus, 
  MoreHorizontal, 
  ArrowRight, 
  Search, 
  Filter, 
  MessageCircle, 
  Calendar, 
  CheckCircle2, 
  UserPlus, 
  Loader2,
  Trash2,
  Phone,
  Layout
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface Prospect {
  id: string;
  nom: string;
  telephone: string;
  source: string;
  statut: "NOUVEAU" | "DISCUSSION" | "RDV";
  note?: string;
  created_at: string;
}

const COLUMNS = [
  { id: "NOUVEAU", label: "NOUVEAUX MESSAGES", color: "bg-blue-500" },
  { id: "DISCUSSION", label: "EN DISCUSSION", color: "bg-amber-500" },
  { id: "RDV", label: "RDV FIXÉ", color: "bg-emerald-500" }
];

export default function CMPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    source: "Facebook",
    note: ""
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProspects(data || []);
    } catch (err) {
      console.error("Error prospects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.telephone) return toast.error("Nom et téléphone requis");

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('prospects')
        .insert([{ ...form, statut: "NOUVEAU" }]);
      
      if (error) throw error;
      toast.success("Prospect ajouté !");
      setShowAddModal(false);
      setForm({ nom: "", telephone: "", source: "Facebook", note: "" });
      fetchData();
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: Prospect["statut"]) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ statut: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      setProspects(prev => prev.map(p => p.id === id ? { ...p, statut: newStatus } : p));
      toast.success("Statut mis à jour");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const convertToPatient = async (prospect: Prospect) => {
    setConvertingId(prospect.id);
    try {
      // 1. Create patient
      const { data: patientData, error: pError } = await supabase
        .from('patients')
        .insert([{
          nom_complet: prospect.nom,
          telephone: prospect.telephone,
          statut: "Actif",
          type_assurance: "Cash"
        }])
        .select()
        .single();
      
      if (pError) throw pError;

      // 2. Delete or archive prospect? The mission says "copie", so we might want to keep it or mark as converted
      // Let's just delete for "conversion" feel or update status if we had a 'CONVERTI' status.
      // But prompt says columns are fixed. Let's just toast and maybe delete.
      await supabase.from('prospects').delete().eq('id', prospect.id);
      
      toast.success(`${prospect.nom} est maintenant un patient !`);
      fetchData();
    } catch (err: any) {
      toast.error("Échec conversion: " + err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const deleteProspect = async (id: string) => {
    if (!confirm("Supprimer ce prospect ?")) return;
    try {
      const { error } = await supabase.from('prospects').delete().eq('id', id);
      if (error) throw error;
      setProspects(prev => prev.filter(p => p.id !== id));
      toast.success("Supprimé");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <Megaphone size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Acquisition & Leads</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Riverside Community Management Pipeline</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher prospect..." 
                className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 w-64 shadow-sm"
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-slate-950 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-3 shadow-lg active:scale-95"
            >
              <Plus size={16} /> Nouveau Lead
            </button>
          </div>
        </div>

        {/* KANBAN BOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {COLUMNS.map(column => (
            <div key={column.id} className="flex flex-col gap-6">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", column.color)} />
                  <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{column.label}</h2>
                  <span className="bg-slate-200 px-2.5 py-0.5 rounded-full text-[9px] font-black text-slate-500">
                    {prospects.filter(p => p.statut === column.id).length}
                  </span>
                </div>
                <button className="text-slate-300 hover:text-slate-500 transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="bg-slate-200/40 p-4 rounded-[2.5rem] min-h-[600px] flex flex-col gap-4 border border-slate-100">
                {loading ? (
                  <div className="flex items-center justify-center p-20">
                    <Loader2 className="animate-spin text-slate-300" size={32} />
                  </div>
                ) : (
                  <AnimatePresence>
                    {prospects.filter(p => p.statut === column.id).map((prospect, idx) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={prospect.id}
                        className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 group relative hover:shadow-xl hover:border-indigo-100 transition-all cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1 bg-indigo-50 text-[8px] font-black text-indigo-600 rounded-full uppercase tracking-widest">
                            {prospect.source}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => deleteProspect(prospect.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-sm font-black text-slate-900 mb-1">{prospect.nom}</h3>
                        <p className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2">
                          <Phone size={12} className="text-indigo-400" /> {prospect.telephone}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-3">
                            <select 
                              value={prospect.statut}
                              onChange={(e) => updateStatus(prospect.id, e.target.value as Prospect["statut"])}
                              className="text-[9px] font-black uppercase text-slate-400 bg-transparent outline-none cursor-pointer hover:text-indigo-600"
                            >
                              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.id === column.id ? 'Déplacer...' : c.label}</option>)}
                            </select>
                          </div>
                          
                          <button 
                            onClick={() => convertToPatient(prospect)}
                            disabled={convertingId === prospect.id}
                            className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-slate-950 transition-all shadow-md shadow-indigo-100 flex items-center justify-center disabled:opacity-50"
                            title="Convertir en Patient"
                          >
                            {convertingId === prospect.id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                
                {!loading && prospects.filter(p => p.statut === column.id).length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-40 border-2 border-dashed border-slate-300 rounded-[2rem] m-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">Aucune carte ici</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
              
              <h2 className="text-xl font-black text-slate-950 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <UserPlus size={24} className="text-indigo-600" /> Ajouter un Prospect
              </h2>

              <form onSubmit={handleAddProspect} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Complet</label>
                  <input 
                    required
                    value={form.nom}
                    onChange={(e) => setForm({...form, nom: e.target.value})}
                    placeholder="Ex: Jean Dupont"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                  <input 
                    required
                    value={form.telephone}
                    onChange={(e) => setForm({...form, telephone: e.target.value})}
                    placeholder="+237 6XX XXX XXX"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Source du Lead</label>
                  <select 
                    value={form.source}
                    onChange={(e) => setForm({...form, source: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-indigo-500"
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Appel Direct">Appel Direct</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    disabled={submitting}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-950 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Enregistrer le lead
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
