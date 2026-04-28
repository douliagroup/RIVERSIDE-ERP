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
  const { user, userRole } = useAuth();
  const [waitingPatients, setWaitingPatients] = useState<PatientWaiting[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWaiting | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'consultation' | 'history' | 'tools'>('consultation');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Tools State
  const [bmiInput, setBmiInput] = useState({ weight: "", height: "" });
  const [paraInput, setParaInput] = useState({ weight: "" });

  const fetchPatientHistory = async (patientId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          personnel (nom_complet)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedPatient && activeSubTab === 'history') {
      fetchPatientHistory(selectedPatient.patient_id);
    }
  }, [selectedPatient, activeSubTab]);

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
    
    // CRITICAL: Ensure we have a valid stay ID
    if (!selectedPatient.id) {
      console.error("ERREUR FATALE: ID du séjour manquant.");
      alert("Impossible de valider la consultation : le lien avec le séjour actif est rompu.");
      return;
    }

    setSubmitting(true);

    try {
      if (!user) throw new Error("Authentification requise pour cette opération.");

      // 1. Sauvegarde de la Consultation
      console.log("Flux Médical - 1. Enregistrement Consultation...");
      
      const { data: personnelData } = await supabase
        .from('personnel')
        .select('id')
        .eq('email', user.email)
        .single();
      
      const realMedecinId = personnelData?.id || null;

      const { data: consultData, error: consultError } = await supabase
        .from('consultations')
        .insert([{
          sejour_id: selectedPatient.id,
          patient_id: selectedPatient.patient_id, 
          medecin_id: realMedecinId,
          constantes: {
            tension: formData.tension,
            temperature: formData.temperature,
            poids: formData.poids
          },
          notes_cliniques: formData.notes_cliniques,
          diagnostic: formData.diagnostic,
          ordonnance: formData.ordonnance
        }])
        .select()
        .single();

      if (consultError) {
        console.error("Erreur Médical (Consultation):", consultError.message, consultError.details);
        throw new Error(`Échec enregistrement consultation: ${consultError.message}`);
      }

      console.log("Flux Médical - 2. Consultation sauvegardée, création transaction...");
      
      // 2. Création de la Transaction en Caisse
      // Amélioration de la description pour la Trésorerie
      const detailDescription = `CONSULTATION MÉDICALE (${selectedPatient.motif_visite}) + ÉTABLISSEMENT ORDONNANCE`;
      const montantConsultation = 10000; 

      const { error: caisseError } = await supabase
        .from('transactions_caisse')
        .insert([{
          patient_id: selectedPatient.patient_id,
          montant_total: montantConsultation,
          statut_paiement: 'En attente',
          type_flux: 'Entrée',
          description: detailDescription
        }]);

      if (caisseError) {
        console.error("Erreur Médical (Caisse):", caisseError.message, caisseError.details);
        // On ne bloque pas tout si la caisse échoue mais on alerte
        alert("Attention : Consultation enregistrée, mais échec de transmission à la caisse.");
      }

      // 3. Mise à jour du statut du séjour
      const { error: updateError } = await supabase
        .from('sejours_actifs')
        .update({ statut: 'En caisse' }) 
        .eq('id', selectedPatient.id);

      if (updateError) {
        console.error("Erreur Médical (Statut Séjour):", updateError.message);
      }

      console.log("Flux Médical - Opération terminée avec succès.");
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

    } catch (err: any) {
      console.error("Flux Médical - ERREUR GLOBALE:", err);
      alert(err.message || "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <Stethoscope className="text-riverside-red" size={24} />
            Espace Médical
          </h1>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[9px] tracking-[0.2em]">Dossiers & Consultations Stratégiques</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Opérationnel</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-fit">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Users size={12} className="text-riverside-red" />
                Liste d&apos;Attente
              </h2>
              <span className="bg-red-50 text-riverside-red px-2 py-0.5 rounded text-[9px] font-black">{waitingPatients.length} PV</span>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="p-10 flex flex-col items-center justify-center gap-3 opacity-30">
                  <Loader2 className="animate-spin text-riverside-red" size={20} />
                  <p className="text-[9px] font-black uppercase text-slate-400">Sync...</p>
                </div>
              ) : waitingPatients.length === 0 ? (
                <div className="p-10 text-center py-20">
                   <Users className="mx-auto mb-3 text-slate-100" size={40} />
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">File vide</p>
                </div>
              ) : (
                waitingPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-all border flex flex-col gap-2 group active:scale-[0.98]",
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
                         "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key="form"
                className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden"
              >
                {/* Board Header section */}
                <div className="p-10 bg-white border-b border-slate-100 text-slate-900 flex items-center justify-between relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-riverside-red/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                   <div className="flex items-center gap-6 relative z-10">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-105 transition-transform shadow-inner">
                         <User size={32} className="text-slate-400" />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900">{selectedPatient.patients.nom_complet}</h3>
                         <div className="flex items-center gap-3 mt-1">
                            <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{selectedPatient.patients.telephone}</span>
                            <span className="w-1 h-1 bg-slate-100 rounded-full" />
                            <span className="text-riverside-red text-[9px] font-black uppercase tracking-widest">Dossier Actif</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4 relative z-10">
                      {/* Sub-tabs Navigation */}
                      <div className="hidden xl:flex bg-slate-50 p-1 rounded-xl border border-slate-200 mr-4">
                         {[
                           { id: 'consultation', label: 'Consul.', icon: Stethoscope },
                           { id: 'history', label: 'Hist.', icon: FileText },
                           { id: 'tools', label: 'Outils', icon: Activity }
                         ].map(tab => (
                           <button
                             key={tab.id}
                             type="button"
                             onClick={() => setActiveSubTab(tab.id as any)}
                             className={cn(
                               "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                               activeSubTab === tab.id 
                                 ? "bg-white text-slate-900 shadow-md border border-slate-100" 
                                 : "text-slate-400 hover:text-slate-900"
                             )}
                           >
                             <tab.icon size={11} />
                             {tab.label}
                           </button>
                         ))}
                      </div>

                      <div className="flex items-center gap-6">
                         {/* AI Copilot Microphone section */}
                      <div className="flex flex-col items-center gap-2">
                        <button 
                          onClick={toggleListening}
                          className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center transition-all relative group shadow-2xl active:scale-90",
                            isListening ? "bg-riverside-red shadow-red-500/50" : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                          )}
                        >
                          {isListening && (
                            <motion.div 
                              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="absolute inset-0 bg-riverside-red rounded-full"
                            />
                          )}
                          <Mic size={24} className={cn("relative z-10", isListening ? "text-white" : "text-slate-400 group-hover:text-slate-600 transition-colors")} />
                        </button>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Copilot AI</span>
                      </div>

                      {selectedPatient.patients.alertes_medicales && (
                        <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl flex items-center gap-3">
                           <AlertCircle className="text-riverside-red animate-pulse" size={16} />
                           <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter">{selectedPatient.patients.alertes_medicales}</span>
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
                      className="bg-slate-50 border-t border-slate-100 p-4 shadow-inner"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-riverside-red rounded-full animate-pulse" />
                           <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{isListening ? "Écoute en cours..." : "Transcription terminée"}</span>
                        </div>
                        <p className="text-slate-400 text-[11px] font-medium flex-1 italic truncate">
                          &quot;{transcription || "Commencez à parler..."}&quot;
                        </p>
                      </div>
                    </motion.div>
                  )}                <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[600px]">
                  {activeSubTab === 'consultation' ? (
                    <>
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
                                  <div className="w-10 h-10 bg-riverside-red/10 rounded-xl flex items-center justify-center animate-pulse-border">
                                     <Brain size={20} className="text-riverside-red" />
                                  </div>
                                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Riverside Copilot</h4>
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
                             <div className="space-y-4">
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                     <AlertCircle size={11} className="text-riverside-red" /> Diagnostic Suggéré
                                   </label>
                                   <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                      <p className="text-xs font-bold text-slate-800 leading-relaxed italic">&quot;{aiAnalysis?.diagnostic_suggere}&quot;</p>
                                   </div>
                                </div>

                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                     <Activity size={11} className="text-riverside-red" /> Examens Préconisés
                                   </label>
                                   <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                      <p className="text-[10px] font-mono font-bold text-emerald-400 leading-relaxed uppercase">{aiAnalysis?.examens_recommandes}</p>
                                   </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200">
                                   <p className="text-[8px] font-black text-slate-400 uppercase leading-[1.6] tracking-tight">
                                      L&apos;IA Copilot a analysé la transcription et pré-rempli vos champs Notes et Ordonnance. Vérifiez ces informations avant de valider pour garantir l&apos;exactitude médicale.
                                   </p>
                                </div>
                             </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : activeSubTab === 'history' ? (
                    <div className="xl:col-span-12 p-8 space-y-6 overflow-y-auto max-h-[700px]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Historique du Patient</h4>
                        <span className="text-[10px] font-bold text-slate-400">{history.length} consultations passées</span>
                      </div>
                      
                      {loadingHistory ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                          <Loader2 className="animate-spin text-riverside-red" size={24} />
                          <p className="text-[10px] font-black uppercase tracking-widest">Chargement de l&apos;historique...</p>
                        </div>
                      ) : history.length === 0 ? (
                        <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                          <p className="text-sm font-black text-slate-300 uppercase">Aucun antécédent trouvé</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {history.map((h) => (
                            <div key={h.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="bg-slate-50 p-2 rounded-lg">
                                    <Clock size={14} className="text-slate-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-slate-900">{new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dr. {h.personnel?.nom_complet || 'Inconnu'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-1 bg-slate-50 rounded text-[9px] font-black text-slate-500 uppercase">
                                    T°: {h.constantes?.temperature}°C
                                  </div>
                                  <div className="px-2 py-1 bg-slate-50 rounded text-[9px] font-black text-slate-500 uppercase">
                                    TA: {h.constantes?.tension}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-riverside-red uppercase tracking-widest">Diagnostic & Notes</p>
                                  <p className="text-xs font-bold text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-xl">{h.diagnostic || h.notes_cliniques}</p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Ordonnance</p>
                                  <p className="text-xs font-medium text-slate-600 leading-relaxed italic bg-emerald-50/20 p-4 rounded-xl border border-emerald-50">{h.ordonnance}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="xl:col-span-12 p-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Calculateur IMC */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                              <Activity className="text-blue-500" size={20} />
                            </div>
                            <div>
                               <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Calculateur d&apos;IMC</h4>
                               <p className="text-[10px] font-bold text-slate-400">Indice de Masse Corporelle</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Poids (kg)</label>
                              <input 
                                type="number" 
                                value={bmiInput.weight}
                                onChange={(e) => setBmiInput({ ...bmiInput, weight: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-sm outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taille (cm)</label>
                              <input 
                                type="number" 
                                value={bmiInput.height}
                                onChange={(e) => setBmiInput({ ...bmiInput, height: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-sm outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {bmiInput.weight && bmiInput.height && (
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center space-y-2 shadow-inner">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Résultat IMC</p>
                              <div className="text-3xl font-black text-slate-900">
                                {(Number(bmiInput.weight) / ((Number(bmiInput.height)/100) ** 2)).toFixed(1)}
                              </div>
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                {(() => {
                                  const imc = Number(bmiInput.weight) / ((Number(bmiInput.height)/100) ** 2);
                                  if (imc < 18.5) return "Insuffisance pondérale";
                                  if (imc < 25) return "Poids normal";
                                  if (imc < 30) return "Surpoids";
                                  return "Obésité";
                                })()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Calculateur Paracétamol Enfant */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                              <Pill className="text-emerald-500" size={20} />
                            </div>
                            <div>
                               <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Dose Pédiatrique</h4>
                               <p className="text-[10px] font-bold text-slate-400">Paracétamol (15mg/kg)</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Poids de l&apos;enfant (kg)</label>
                            <input 
                              type="number" 
                              value={paraInput.weight}
                              onChange={(e) => setParaInput({ weight: e.target.value })}
                              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-sm outline-none focus:border-emerald-500"
                            />
                          </div>

                          {paraInput.weight && (
                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl text-center space-y-2">
                              <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Dose par prise recommandée</p>
                              <div className="text-3xl font-black text-emerald-600">
                                {Math.round(Number(paraInput.weight) * 15)} mg
                              </div>
                              <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-tighter">
                                Ne pas dépasser 4 prises par 24h (intervalle de 6h)
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
                        <AlertCircle className="text-blue-500 mt-1" size={18} />
                        <div className="space-y-1">
                          <p className="text-xs font-black text-blue-900 uppercase tracking-widest text-[9px]">Avertissement Médical</p>
                          <p className="text-[10px] font-medium text-blue-800 leading-relaxed uppercase">
                             Ces calculateurs sont des outils d&apos;aide à la décision clinique. La responsabilité finale de la prescription incombe au médecin praticien. Vérifiez toujours vos calculs manuellement pour les cas critiques.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
