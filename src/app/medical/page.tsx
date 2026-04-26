"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Stethoscope, 
  Thermometer, 
  Activity, 
  Weight, 
  FileText, 
  Pill, 
  CheckCircle,
  Loader2,
  Search,
  User,
  Clock,
  Mic,
  Sparkles,
  Brain,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";

// Type definitions for SpeechRecognition
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface AIAnalysis {
  constantes: string;
  notes_cliniques: string;
  diagnostic_suggere: string;
  examens_recommandes: string;
  ordonnance_proposee: string;
}

interface PatientWaiting {
  id: string;
  patient_id: string;
  motif_visite: string;
  created_at: string;
  patients: {
    nom_complet: string;
    telephone: string;
    alertes_medicales: string;
  };
}

export default function MedicalPage() {
  const { userRole } = useAuth();
  const [waitingPatients, setWaitingPatients] = useState<PatientWaiting[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWaiting | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // AI & Voice State
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    tension: "",
    temperature: "",
    poids: "",
    notes_cliniques: "",
    diagnostic: "",
    ordonnance: "",
  });

  // Init Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "fr-FR";

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscription = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setTranscription(prev => prev + event.results[i][0].transcript + " ");
          } else {
            interimTranscription += event.results[i][0].transcript;
          }
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech Recognition Error", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      analyzeWithAI();
    } else {
      setTranscription("");
      setAiAnalysis(null);
      recognition.start();
      setIsListening(true);
    }
  };

  const analyzeWithAI = async () => {
    if (!transcription.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAiAnalysis(data);
      
      // Auto-fill form
      setFormData(prev => ({
        ...prev,
        notes_cliniques: data.notes_cliniques || prev.notes_cliniques,
        diagnostic: data.diagnostic_suggere || prev.diagnostic,
        ordonnance: data.ordonnance_proposee || prev.ordonnance,
      }));

    } catch (err) {
      console.error("AI Analysis Failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchWaitingPatients = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sejours_actifs')
        .select(`
          id,
          patient_id,
          motif_visite,
          created_at,
          patients (
            nom_complet,
            telephone,
            alertes_medicales
          )
        `)
        .eq('statut', 'En attente')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWaitingPatients(data as any || []);
    } catch (err) {
      console.error("Error fetching waiting patients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaitingPatients();
  }, [fetchWaitingPatients]);

  const handleConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSubmitting(true);

    try {
      // 1. Save Consultation
      const { data: consultData, error: consultError } = await supabase
        .from('consultations')
        .insert([{
          sejour_id: selectedPatient.id,
          patient_id: selectedPatient.patient_id,
          tension: formData.tension,
          temperature: formData.temperature,
          poids: formData.poids,
          notes: formData.notes_cliniques,
          diagnostic: formData.diagnostic,
          ordonnance: formData.ordonnance,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (consultError) throw consultError;

      // 1b. Générer la transaction en attente à la caisse
      const { error: caisseError } = await supabase
        .from('transactions_caisse')
        .insert([{
          patient_id: selectedPatient.patient_id,
          type_flux: 'Revenu - Patient',
          montant_total: 10000, // Prix standard consultation (à dynamiser plus tard)
          montant_verse: 0,
          reste_a_payer: 10000,
          description: `Consultation: ${selectedPatient.motif_visite}. Patient: ${selectedPatient.patients.nom_complet}`,
          statut_paiement: 'En attente',
          created_at: new Date().toISOString()
        }]);

      if (caisseError) console.error("Erreur création transaction caisse:", caisseError);

      // 2. Update status to 'Terminé'
      const { error: updateError } = await supabase
        .from('sejours_actifs')
        .update({ statut: 'Terminé' })
        .eq('id', selectedPatient.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedPatient(null);
        setFormData({
          tension: "",
          temperature: "",
          poids: "",
          notes_cliniques: "",
          diagnostic: "",
          ordonnance: "",
        });
        fetchWaitingPatients();
      }, 2000);

    } catch (err) {
      console.error("Error saving consultation:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase">
            <Stethoscope className="text-riverside-red" size={28} />
            Espace Médical
          </h1>
          <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">Dossiers & Consultations en temps réel</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl flex items-center gap-3">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Médecin Connecté</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Patient List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-fit">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-riverside-red" />
                File d&apos;Attente
              </h2>
              <span className="bg-red-50 text-riverside-red px-2 py-0.5 rounded-full text-[10px] font-black">{waitingPatients.length} Patients</span>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="p-10 flex flex-col items-center justify-center gap-3 opacity-30">
                  <Loader2 className="animate-spin" size={24} />
                  <p className="text-[10px] font-black uppercase">Chargement...</p>
                </div>
              ) : waitingPatients.length === 0 ? (
                <div className="p-10 text-center opacity-30">
                   <Users className="mx-auto mb-3" size={32} />
                   <p className="text-xs font-bold font-mono">AUCUN PATIENT EN ATTENTE</p>
                </div>
              ) : (
                waitingPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl transition-all border flex flex-col gap-2 group",
                      selectedPatient?.id === p.id 
                        ? "bg-riverside-red border-riverside-red text-white shadow-lg shadow-red-100" 
                        : "bg-white border-transparent hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                       <span className={cn(
                         "text-sm font-black tracking-tight",
                         selectedPatient?.id === p.id ? "text-white" : "text-slate-900"
                       )}>{p.patients.nom_complet}</span>
                       <Clock size={12} className={selectedPatient?.id === p.id ? "text-white/50" : "text-slate-300"} />
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={cn(
                         "text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase",
                         selectedPatient?.id === p.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                       )}>
                         {p.motif_visite}
                       </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Consultation Board */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!selectedPatient ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                key="empty"
                className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center space-y-4 h-[600px]"
              >
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm">
                  <Stethoscope size={32} className="text-slate-200" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-300 uppercase italic">Prêt pour Consultation</h3>
                  <p className="text-slate-400 text-sm font-medium mt-1">Sélectionnez un patient dans la file d&apos;attente pour commencer</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key="form"
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100 overflow-hidden"
              >
                {/* Board Header */}
                <div className="p-8 bg-slate-950 text-white flex items-center justify-between relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-riverside-red/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                         <User size={28} className="text-white" />
                      </div>
                      <div>
                         <h3 className="text-xl font-black tracking-tighter uppercase">{selectedPatient.patients.nom_complet}</h3>
                         <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">{selectedPatient.patients.telephone}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4 relative z-10">
                      {/* AI Copilot Microphone */}
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={toggleListening}
                          className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center transition-all relative group",
                            isListening ? "bg-riverside-red" : "bg-white/10 hover:bg-white/20"
                          )}
                        >
                          {isListening && (
                            <motion.div 
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute inset-0 bg-riverside-red rounded-full"
                            />
                          )}
                          <Mic size={24} className={cn("relative z-10", isListening ? "text-white" : "text-white/70")} />
                        </button>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/50">Assistant Vocal</span>
                      </div>

                      {selectedPatient.patients.alertes_medicales && (
                        <div className="bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-2xl flex items-center gap-3">
                           <Activity className="text-red-400" size={14} />
                           <span className="text-[10px] font-black text-red-200 uppercase">{selectedPatient.patients.alertes_medicales}</span>
                        </div>
                      )}
                   </div>
                </div>

                {/* Transcription Status */}
                <AnimatePresence>
                  {(isListening || transcription) && !aiAnalysis && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-slate-900 border-t border-white/5 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-riverside-red rounded-full animate-pulse" />
                           <span className="text-[10px] font-black text-white uppercase tracking-widest">{isListening ? "Écoute en cours..." : "Transcription terminée"}</span>
                        </div>
                        <p className="text-white/40 text-[11px] font-medium flex-1 italic truncate">
                          &quot;{transcription || "Commencez à parler..."}&quot;
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 xl:grid-cols-12">
                  <div className={cn(
                    "p-8 space-y-8 transition-all duration-500",
                    aiAnalysis ? "xl:col-span-8 border-r border-slate-50" : "xl:col-span-12"
                  )}>
                    <form onSubmit={handleConsultation} className="space-y-8">
                      {/* Vitals */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2">
                              <Activity size={10} /> Tension (mmHg)
                           </label>
                           <input 
                             required
                             type="text"
                             value={formData.tension}
                             onChange={e => setFormData({...formData, tension: e.target.value})}
                             placeholder="ex: 12/8"
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none font-bold text-sm"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2">
                              <Thermometer size={10} /> Température (°C)
                           </label>
                           <input 
                             required
                             type="text"
                             value={formData.temperature}
                             onChange={e => setFormData({...formData, temperature: e.target.value})}
                             placeholder="ex: 37"
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none font-bold text-sm"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2">
                              <Weight size={10} /> Poids (kg)
                           </label>
                           <input 
                             required
                             type="text"
                             value={formData.poids}
                             onChange={e => setFormData({...formData, poids: e.target.value})}
                             placeholder="ex: 75"
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none font-bold text-sm"
                           />
                        </div>
                      </div>

                      {/* Clinical Data */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2">
                              <FileText size={10} /> Notes Cliniques & Diagnostic
                           </label>
                           <textarea 
                             required
                             rows={4}
                             value={formData.notes_cliniques}
                             onChange={e => setFormData({...formData, notes_cliniques: e.target.value})}
                             placeholder="Saisissez les observations cliniques..."
                             className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl focus:border-riverside-red outline-none font-bold text-sm resize-none transition-all"
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2">
                              <Pill size={10} /> Ordonnance Numérique
                           </label>
                           <textarea 
                             required
                             rows={4}
                             value={formData.ordonnance}
                             onChange={e => setFormData({...formData, ordonnance: e.target.value})}
                             placeholder="Médicaments, posologie..."
                             className="w-full p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl focus:border-emerald-500 outline-none font-bold text-sm font-mono resize-none text-emerald-800 transition-all"
                           />
                        </div>
                      </div>

                      {/* Action */}
                      <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                         <button 
                           type="button"
                           onClick={() => setSelectedPatient(null)}
                           className="text-xs font-black text-slate-400 uppercase hover:text-slate-600 transition-colors"
                         >
                           Annuler la session
                         </button>
                         
                         <button 
                           disabled={submitting}
                           className="px-10 py-5 bg-riverside-red text-white rounded-2xl font-black uppercase tracking-tighter text-sm shadow-xl shadow-red-200 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                         >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : success ? <CheckCircle size={18} /> : <FileText size={18} />}
                            {success ? "ENREGISTRÉ !" : "VALIDER LA CONSULTATION"}
                         </button>
                      </div>
                    </form>
                  </div>

                  {/* AI Copilot Panel */}
                  <AnimatePresence>
                    {(aiAnalysis || isAnalyzing) && (
                      <motion.div 
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        className="xl:col-span-4 bg-slate-50 p-8 border-l border-slate-100 space-y-8"
                      >
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-riverside-red/10 rounded-xl flex items-center justify-center">
                                 <Brain size={20} className="text-riverside-red" />
                              </div>
                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Assistant IA</h4>
                           </div>
                           {isAnalyzing && <Loader2 size={16} className="animate-spin text-riverside-red" />}
                        </div>

                        {isAnalyzing ? (
                          <div className="space-y-4 py-10 text-center">
                             <div className="relative inline-block">
                                <Sparkles className="text-riverside-red animate-bounce" size={32} />
                                <div className="absolute inset-0 bg-riverside-red/20 blur-xl rounded-full" />
                             </div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analyse clinique en cours...</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                             <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <AlertCircle size={10} /> Diagnostic Suggéré
                                </label>
                                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                   <p className="text-xs font-bold text-slate-900 leading-relaxed italic">&quot;{aiAnalysis?.diagnostic_suggere}&quot;</p>
                                </div>
                             </div>

                             <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Activity size={10} /> Examens Recommandés
                                </label>
                                <div className="p-4 bg-slate-900 rounded-2xl">
                                   <p className="text-xs font-mono font-bold text-emerald-400 leading-relaxed uppercase">{aiAnalysis?.examens_recommandes}</p>
                                </div>
                             </div>

                             <div className="pt-4 border-t border-slate-200">
                                <p className="text-[7px] font-black text-slate-400 uppercase leading-relaxed">
                                   L&apos;IA a pré-rempli vos champs Notes et Ordonnance. Vérifiez ces informations avant de valider.
                                </p>
                             </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
