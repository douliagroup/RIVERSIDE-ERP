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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <Calendar className="text-riverside-red" size={24} />
            Planning Strategique
          </h1>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[9px] tracking-[0.2em]">Gestion de l&apos;Agenda Clinique</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-riverside-red text-white px-6 py-2.5 rounded-lg shadow-lg shadow-red-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] transition-all active:scale-95"
        >
          <Plus size={16} />
          Nouveau Rendez-vous
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Timeline View section */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
                <button className="px-5 py-1.5 bg-white text-slate-900 shadow-sm border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Jour</button>
                <button className="px-5 py-1.5 text-slate-400 hover:text-slate-900 transition-colors text-[9px] font-black uppercase tracking-widest">Semaine</button>
             </div>
             <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Médecins Riverside</span>
             </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                <Loader2 className="animate-spin text-riverside-red" size={24} />
                <p className="text-[9px] font-black uppercase tracking-widest">Sync des agendas...</p>
              </div>
            ) : appointments.length === 0 ? (
               <div className="p-20 bg-white rounded-2xl border border-dashed border-slate-100 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-100">
                    <Calendar size={24} />
                  </div>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Aucun RDV</p>
               </div>
            ) : (
              appointments.map((rdv) => (
                <motion.div 
                  layout
                  key={rdv.id}
                  className="bg-white border border-slate-50 p-5 rounded-2xl group hover:shadow-md hover:border-slate-100 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[70px]">
                      <p className="text-xl font-black text-slate-900 tracking-tighter">{rdv.heure_rdv}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{rdv.date_rdv}</p>
                    </div>
                    <div className="w-[1px] h-10 bg-slate-50" />
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">{rdv.patient_name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                         <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tight">
                           <Stethoscope size={11} className="text-riverside-red" />
                           {rdv.medecin_name}
                         </span>
                         <span className="w-0.5 h-0.5 bg-slate-200 rounded-full" />
                         <span className="text-[10px] font-bold text-slate-400 italic">“{rdv.motif}”</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                      rdv.statut === "Planifié" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                      rdv.statut === "En salle" ? "bg-orange-50 text-orange-600 border border-orange-100" :
                      "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    )}>
                      {rdv.statut === "Planifié" && <Circle size={6} className="fill-current" />}
                      {rdv.statut === "En salle" && <span className="flex h-1.5 w-1.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span></span>}
                      {rdv.statut === "Terminé" && <CheckCircle2 size={10} />}
                      {rdv.statut}
                    </div>

                    <div className="relative group/actions">
                      <button className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                        <MoreVertical size={14} className="text-slate-400" />
                      </button>
                      
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 group-hover/actions:opacity-100 pointer-events-none group-hover/actions:pointer-events-auto transition-all z-20 overflow-hidden scale-95 group-hover/actions:scale-100 origin-top-right">
                         <button onClick={() => updateStatus(rdv.id, "En salle")} className="w-full px-5 py-3.5 text-left text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 text-orange-600 border-b border-slate-50 transition-colors">Lancer Consultation</button>
                         <button onClick={() => updateStatus(rdv.id, "Terminé")} className="w-full px-5 py-3.5 text-left text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 text-emerald-600 border-b border-slate-50 transition-colors">Terminer Séance</button>
                         <button className="w-full px-5 py-3.5 text-left text-[9px] font-black uppercase tracking-widest hover:bg-red-50 text-red-500 transition-colors">Annuler</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Calendar Widget section */}
        <div className="lg:col-span-4 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Agenda Avril</span>
              <div className="flex gap-1.5">
                 <button className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 rounded border border-slate-100 text-[10px] items-center justify-center transition-colors">&lt;</button>
                 <button className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 rounded border border-slate-100 text-[10px] items-center justify-center transition-colors">&gt;</button>
              </div>
           </div>
           
           <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{d}</span>)}
              {Array.from({length: 30}).map((_, i) => (
                <button 
                  key={i} 
                  className={cn(
                    "w-full aspect-square rounded-lg text-[10px] font-black flex items-center justify-center transition-all",
                    i + 1 === 26 ? "bg-riverside-red text-white shadow-lg shadow-red-100" : "text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-100"
                  )}
                >
                  {i + 1}
                </button>
              ))}
           </div>

           <div className="pt-8 border-t border-slate-50 space-y-4">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={12} className="text-riverside-red" />
                Médecins Riverside
              </h4>
              <div className="space-y-4">
                 {physicians.map(doc => (
                   <div key={doc} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                         <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight group-hover:text-riverside-red transition-colors">{doc}</span>
                      </div>
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest border border-slate-50 px-1.5 py-0.5 rounded">Actif</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* New RDV Modal section */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowModal(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.98, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.98, y: 10 }}
               className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8 border border-slate-100"
             >
                <div className="mb-8">
                   <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Programmation RDV</h2>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Interface de Planification</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Identité Patient</label>
                      <input 
                        required
                        type="text"
                        value={form.patient_name}
                        onChange={e => setForm({...form, patient_name: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-riverside-red font-black text-xs uppercase tracking-tight transition-all"
                        placeholder="ENTREZ LE NOM COMPLET"
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Praticien</label>
                        <select 
                          value={form.medecin_name}
                          onChange={e => setForm({...form, medecin_name: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-riverside-red font-black text-xs uppercase tracking-tight appearance-none transition-all"
                        >
                           {physicians.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Horaire</label>
                        <input 
                          required
                          type="time"
                          value={form.heure_rdv}
                          onChange={e => setForm({...form, heure_rdv: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-riverside-red font-black text-xs transition-all"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Objectif Séance</label>
                      <input 
                        required
                        type="text"
                        value={form.motif}
                        onChange={e => setForm({...form, motif: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-riverside-red font-black text-xs uppercase tracking-tight transition-all"
                        placeholder="EX: CONSULTATION GÉNÉRALE"
                      />
                   </div>

                   <div className="pt-6 flex gap-3">
                      <button 
                        type="button" 
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-3 px-4 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50"
                      >
                        Fermer
                      </button>
                      <button 
                        disabled={submitting}
                        type="submit"
                        className="flex-[2] bg-riverside-red text-white py-3 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Valider rdv"}
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
