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
  Users,
  Globe,
  Bell,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";

interface Appointment {
  id: string;
  patient_name: string;
  medecin_name: string;
  date_rdv: string;
  heure_rdv: string;
  statut: "Planifié" | "Confirmé" | "En salle" | "Terminé" | "Annulé";
  motif: string;
  source?: string;
}

interface Announcement {
  id: string;
  auteur: string;
  message: string;
  created_at: string;
}

const physicians = ["Dr TONYE", "Dr NDEDI", "Dr KAMGA", "Dr EBELLE"];

export default function PlanningPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'liste' | 'grille'>('grille');
  const [newAnnouncement, setNewAnnouncement] = useState("");

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date()); // Used for month navigation

  const formattedSelectedDate = selectedDate.toISOString().split('T')[0];

  // New RDV Form
  const [form, setForm] = useState({
    patient_name: "",
    medecin_name: physicians[0],
    date_rdv: formattedSelectedDate,
    heure_rdv: "08:00",
    motif: ""
  });

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const { data, error } = await supabase
        .from('annonces_equipe')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setAnnouncements(data || []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const publishAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    try {
      const { error } = await supabase
        .from('annonces_equipe')
        .insert([{
          auteur: "Direction",
          message: newAnnouncement
        }]);
      if (error) throw error;
      setNewAnnouncement("");
      fetchAnnouncements();
      toast.success("Annonce publiée");
    } catch (err) {
      toast.error("Erreur de publication");
    }
  };

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rendez_vous')
        .select('*')
        .eq('date_rdv', formattedSelectedDate)
        .order('heure_rdv', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error("Error fetching RDV:", err);
    } finally {
      setLoading(false);
    }
  }, [formattedSelectedDate]);

  useEffect(() => {
    fetchAppointments();
    fetchAnnouncements();
  }, [fetchAppointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('rendez_vous')
        .insert([{
          ...form,
          statut: "En attente"
        }]);

      if (error) {
        toast.error(`Erreur de planification: ${error.message}`);
        throw error;
      }
      
      toast.success("Rendez-vous planifié avec succès");
      setShowModal(false);
      setForm({
        patient_name: "",
        medecin_name: physicians[0],
        date_rdv: formattedSelectedDate,
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
      const { error } = await supabase
        .from('rendez_vous')
        .update({ statut: newStatus })
        .eq('id', id);
      
      if (error) {
        toast.error(`Erreur: ${error.message}`);
        throw error;
      }
      toast.success(`RDV ${newStatus.toLowerCase()}`);
      setShowDetailModal(false);
      fetchAppointments();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const hours = Array.from({ length: 11 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

  const getRdvForSlot = (hour: string, physician: string) => {
    return appointments.find(a => {
      const rdvHour = a.heure_rdv.split(':')[0] + ':00';
      return rdvHour === hour && a.medecin_name === physician;
    });
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
                <button 
                  onClick={() => setViewMode('grille')}
                  className={cn("px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", 
                    viewMode === 'grille' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-900"
                  )}
                >
                  Grille
                </button>
                <button 
                  onClick={() => setViewMode('liste')}
                  className={cn("px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", 
                    viewMode === 'liste' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-900"
                  )}
                >
                  Liste
                </button>
             </div>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm">
                   <button onClick={() => {
                     const d = new Date(selectedDate);
                     d.setDate(d.getDate() - 1);
                     setSelectedDate(d);
                   }} className="p-1 hover:bg-slate-50 rounded"><ChevronLeft size={14}/></button>
                   <span className="text-[10px] font-black text-slate-900 uppercase min-w-[120px] text-center">
                     {selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                   </span>
                   <button onClick={() => {
                     const d = new Date(selectedDate);
                     d.setDate(d.getDate() + 1);
                     setSelectedDate(d);
                   }} className="p-1 hover:bg-slate-50 rounded"><ChevronRight size={14}/></button>
                </div>
             </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                <Loader2 className="animate-spin text-riverside-red" size={24} />
                <p className="text-[9px] font-black uppercase tracking-widest">Sync des agendas...</p>
              </div>
            ) : viewMode === 'grille' ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-4 border-r border-slate-100 w-24"></th>
                      {physicians.map(doc => (
                        <th key={doc} className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[150px]">
                          {doc}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map(hour => (
                      <tr key={hour} className="border-b border-slate-50 last:border-0 h-28">
                        <td className="p-4 border-r border-slate-100 text-center align-top">
                          <span className="text-[10px] font-black text-slate-900 tracking-tighter">{hour}</span>
                        </td>
                        {physicians.map(doc => {
                          const rdv = getRdvForSlot(hour, doc);
                          return (
                            <td key={`${hour}-${doc}`} className="p-2 relative group-hover:bg-slate-50/30 transition-colors">
                              {rdv ? (
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    setSelectedRdv(rdv);
                                    setShowDetailModal(true);
                                  }}
                                  className={cn(
                                    "w-full h-full p-3 rounded-2xl border flex flex-col text-left transition-all relative overflow-hidden",
                                    rdv.statut === "Planifié" ? "bg-blue-50/50 border-blue-100 shadow-sm" :
                                    rdv.statut === "Confirmé" ? "bg-emerald-50/50 border-emerald-100 shadow-sm" :
                                    rdv.statut === "En salle" ? "bg-amber-50/50 border-amber-100 shadow-md ring-2 ring-amber-400/20" :
                                    "bg-slate-50 border-slate-200"
                                  )}
                                >
                                  {rdv.source === 'Site Web' && (
                                    <div className="absolute top-0 right-0 px-2 py-1 bg-riverside-red text-white text-[7px] font-black rounded-bl-lg flex items-center gap-1 uppercase tracking-widest z-10">
                                      <Globe size={8} /> Web
                                    </div>
                                  )}
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight mb-1 truncate">{rdv.patient_name}</p>
                                  <p className="text-[9px] font-bold text-slate-500 line-clamp-2 leading-tight uppercase italic">{rdv.motif}</p>
                                  <div className="mt-auto flex items-center justify-between">
                                    <span className={cn(
                                      "text-[7px] font-black uppercase px-2 py-0.5 rounded-full",
                                      rdv.statut === "En salle" ? "bg-amber-500 text-white" : "text-slate-400"
                                    )}>
                                      {rdv.statut}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-300">{rdv.heure_rdv}</span>
                                  </div>
                                </motion.button>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setForm({ ...form, medecin_name: doc, heure_rdv: hour });
                                    setShowModal(true);
                                  }}
                                  className="w-full h-full rounded-2xl border-2 border-dashed border-slate-50 hover:border-slate-200 transition-all flex items-center justify-center group"
                                >
                                  <Plus size={14} className="text-slate-100 group-hover:text-slate-200" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                Agenda {viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex gap-1.5">
                 <button 
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 rounded border border-slate-100 text-[10px] transition-colors"
                 >
                   &lt;
                 </button>
                 <button 
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 rounded border border-slate-100 text-[10px] transition-colors"
                 >
                   &gt;
                 </button>
              </div>
           </div>
           
           <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{d}</span>)}
              
              {/* Empty slots for starting day */}
              {Array.from({ length: (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() || 7) - 1 }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                const day = i + 1;
                const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();
                const isSelected = selectedDate.toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();

                return (
                  <button 
                    key={day} 
                    onClick={() => {
                      const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                      setSelectedDate(newDate);
                      setForm(prev => ({ ...prev, date_rdv: newDate.toISOString().split('T')[0] }));
                    }}
                    className={cn(
                      "w-full aspect-square rounded-lg text-[10px] font-black flex items-center justify-center transition-all",
                      isSelected ? "bg-riverside-red text-white shadow-lg shadow-red-100" : 
                      isToday ? "bg-red-50 text-riverside-red border border-red-100" :
                      "text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-100"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
           </div>

           <div className="pt-8 border-t border-slate-50 space-y-4">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={12} className="text-riverside-red" />
                Médecins Riverside
              </h4>
              <div className="space-y-3">
                 {physicians.map(doc => (
                   <div key={doc} className="flex items-center justify-between group bg-slate-50/50 p-3 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                         <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight group-hover:text-riverside-red transition-colors">{doc}</span>
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest border bg-white px-1.5 py-0.5 rounded shadow-sm">Actif</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* Announcement Panel */}
           <div className="pt-8 border-t border-slate-50 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Bell size={14} className="text-riverside-red" />
                  Notes de Service
                </h4>
                {loadingAnnouncements && <Loader2 size={12} className="animate-spin text-slate-300" />}
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {announcements.map(note => (
                  <div key={note.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 relative group hover:bg-white transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-riverside-red uppercase tracking-widest">{note.auteur}</p>
                      <p className="text-[7px] font-bold text-slate-400">{new Date(note.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase">{note.message}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center py-4 italic">Aucune note active</p>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Publier une note (Admin)</p>
                <div className="relative">
                  <textarea 
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="Message à l'équipe..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-[10px] outline-none focus:border-riverside-red focus:bg-white transition-all resize-none h-20"
                  />
                  <button 
                    onClick={publishAnnouncement}
                    className="absolute bottom-3 right-3 w-8 h-8 bg-riverside-red text-white rounded-xl shadow-lg shadow-red-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* New RDV Modal section */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date RDV</label>
                        <input 
                          required
                          type="date"
                          value={form.date_rdv}
                          onChange={e => setForm({...form, date_rdv: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-riverside-red font-black text-xs transition-all"
                        />
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
      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRdv && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowDetailModal(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
             >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                   <div>
                     <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Fiche Rendez-vous</h3>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Détails de la programmation</p>
                   </div>
                   <button onClick={() => setShowDetailModal(false)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-riverside-red transition-all shadow-sm"><X size={20}/></button>
                </div>

                <div className="p-8 space-y-6">
                   <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-riverside-red shadow-inner"><User size={24}/></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</p>
                        <p className="text-xs font-black text-slate-900 uppercase">{selectedRdv.patient_name}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                         <p className="text-[10px] font-black text-slate-800">{selectedRdv.date_rdv}</p>
                      </div>
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Heure</p>
                         <p className="text-[10px] font-black text-slate-800">{selectedRdv.heure_rdv}</p>
                      </div>
                   </div>

                   <div className="space-y-4 pt-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Actions & Statut</p>
                      <div className="grid grid-cols-1 gap-3">
                         <button onClick={() => updateStatus(selectedRdv.id, "Confirmé")} className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all">
                            <CheckCircle2 size={14} /> Confirmer la présence
                         </button>
                         <button onClick={() => updateStatus(selectedRdv.id, "En salle")} className="w-full py-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-100 transition-all">
                            <Activity size={14} /> Lancer Consultation
                         </button>
                         <button onClick={() => updateStatus(selectedRdv.id, "Annulé")} className="w-full py-3 bg-red-50 text-red-600 rounded-xl border border-red-100 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                            <Trash2 size={14} /> Annuler le RDV
                         </button>
                      </div>
                   </div>

                   <div className="pt-6 flex justify-center">
                      <button onClick={() => setShowDetailModal(false)} className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors">Retour au planning</button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
