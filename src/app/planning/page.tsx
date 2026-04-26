"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Plus, 
  Search, 
  CheckCircle2, 
  Circle,
  Stethoscope,
  MoreVertical,
  Loader2,
  Filter,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";

interface Appointment {
  id: string;
  patient_name: string;
  medecin_name: string;
  date_rdv: string;
  heure_rdv: string;
  statut: "Planifié" | "En salle" | "Terminé";
  motif: string;
}

const physicians = ["Dr TONYE", "Dr NDEDI", "Dr KAMGA", "Dr EBELLE"];

export default function PlanningPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New RDV Form
  const [form, setForm] = useState({
    patient_name: "",
    medecin_name: physicians[0],
    date_rdv: new Date().toISOString().split('T')[0],
    heure_rdv: "08:00",
    motif: ""
  });

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rendez_vous')
        .select('*')
        .order('date_rdv', { ascending: true })
        .order('heure_rdv', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error("Error fetching RDV:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('rendez_vous')
        .insert([{
          ...form,
          statut: "Planifié"
        }]);

      if (error) throw error;
      setShowModal(false);
      setForm({
        patient_name: "",
        medecin_name: physicians[0],
        date_rdv: new Date().toISOString().split('T')[0],
        heure_rdv: "08:00",
        motif: ""
      });
      fetchAppointments();
    } catch (err) {
      console.error("Error creating RDV:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: Appointment['statut']) => {
    try {
      await supabase
        .from('rendez_vous')
        .update({ statut: newStatus })
        .eq('id', id);
      fetchAppointments();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Calendar className="text-riverside-red" size={32} />
            Planning & RDV
          </h1>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mt-1">Gestion des consultations et flux patients</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-riverside-red text-white p-4 rounded-2xl shadow-xl shadow-red-100 font-bold flex items-center gap-2 hover:scale-105 transition-all"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Nouveau RDV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Timeline View */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-2xl">
                <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Aujourd&apos;hui</button>
                <button className="px-4 py-2 text-slate-400 hover:text-slate-900 transition-colors text-[10px] font-black uppercase">Demain</button>
             </div>
             <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-300" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tous les médecins</span>
             </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-[10px] font-black uppercase">Initialisation du planning...</p>
              </div>
            ) : appointments.length === 0 ? (
               <div className="p-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                    <Calendar size={24} className="text-slate-200" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Aucun rendez-vous planifié</p>
               </div>
            ) : (
              appointments.map((rdv) => (
                <motion.div 
                  layout
                  key={rdv.id}
                  className="bg-white border border-slate-100 p-6 rounded-3xl group hover:shadow-xl hover:shadow-slate-100 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[60px]">
                      <p className="text-lg font-black text-slate-950">{rdv.heure_rdv}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{rdv.date_rdv}</p>
                    </div>
                    <div className="w-[1px] h-10 bg-slate-100" />
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">{rdv.patient_name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                         <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                           <Stethoscope size={10} className="text-riverside-red" />
                           {rdv.medecin_name}
                         </span>
                         <span className="w-1 h-1 bg-slate-200 rounded-full" />
                         <span className="text-[10px] font-bold text-slate-400 italic">&quot;{rdv.motif}&quot;</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2",
                      rdv.statut === "Planifié" ? "bg-blue-50 text-blue-600" :
                      rdv.statut === "En salle" ? "bg-orange-50 text-orange-600" :
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      {rdv.statut === "Planifié" && <Circle size={8} className="fill-current" />}
                      {rdv.statut === "En salle" && <span className="flex h-1.5 w-1.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span></span>}
                      {rdv.statut === "Terminé" && <CheckCircle2 size={8} />}
                      {rdv.statut}
                    </div>

                    <div className="relative group/actions">
                      <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <MoreVertical size={16} className="text-slate-400" />
                      </button>
                      
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl opacity-0 group-hover/actions:opacity-100 pointer-events-none group-hover/actions:pointer-events-auto transition-all z-20 overflow-hidden">
                         <button onClick={() => updateStatus(rdv.id, "En salle")} className="w-full p-4 text-left text-[10px] font-black uppercase hover:bg-slate-50 text-orange-600 border-b border-slate-50">Lancer Consultation</button>
                         <button onClick={() => updateStatus(rdv.id, "Terminé")} className="w-full p-4 text-left text-[10px] font-black uppercase hover:bg-slate-50 text-emerald-600 border-b border-slate-50">Marquer Terminé</button>
                         <button className="w-full p-4 text-left text-[10px] font-black uppercase hover:bg-slate-50 text-slate-400">Annuler RDV</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Calendar Widget (Static Mock for UI feel) */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100 space-y-8">
           <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest">Avril 2026</span>
              <div className="flex gap-2">
                 <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 tracking-tighter">&lt;</button>
                 <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 tracking-tighter">&gt;</button>
              </div>
           </div>
           
           <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-[10px] font-black text-slate-300">{d}</span>)}
              {Array.from({length: 30}).map((_, i) => (
                <button 
                  key={i} 
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all",
                    i + 1 === 26 ? "bg-riverside-red text-white shadow-lg shadow-red-100" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {i + 1}
                </button>
              ))}
           </div>

           <div className="pt-8 border-t border-slate-50 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={12} />
                Disponibilité Médecins
              </h4>
              <div className="space-y-4">
                 {physicians.map(doc => (
                   <div key={doc} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                         <span className="text-[11px] font-bold text-slate-700">{doc}</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase">En ligne</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* New RDV Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowModal(false)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
             >
                <div className="mb-8">
                   <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Planifier un RDV</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase mt-1">Saisie rapide d&apos;agenda</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nom du Patient</label>
                      <input 
                        required
                        type="text"
                        value={form.patient_name}
                        onChange={e => setForm({...form, patient_name: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm"
                        placeholder="ex: Jean Dupont"
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Médecin</label>
                        <select 
                          value={form.medecin_name}
                          onChange={e => setForm({...form, medecin_name: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm appearance-none"
                        >
                           {physicians.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Heure</label>
                        <input 
                          required
                          type="time"
                          value={form.heure_rdv}
                          onChange={e => setForm({...form, heure_rdv: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Motif</label>
                      <input 
                        required
                        type="text"
                        value={form.motif}
                        onChange={e => setForm({...form, motif: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm"
                        placeholder="ex: Consultation de suivi"
                      />
                   </div>

                   <div className="pt-4 flex gap-3">
                      <button 
                        type="button" 
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
                      >
                        Annuler
                      </button>
                      <button 
                        disabled={submitting}
                        type="submit"
                        className="flex-[2] bg-riverside-red text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-red-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {submitting ? "Traitement..." : "Enregistrer le RDV"}
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
