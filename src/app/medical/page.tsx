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
  AlertCircle,
  Shield,
  FlaskConical,
  Calculator,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";
import { toast } from "sonner";

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
    sexe: string;
    age: number;
    quartier: string;
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
  const [activeSubTab, setActiveSubTab] = useState<'consultation' | 'history' | 'tools' | 'lab'>('consultation');
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
      
      if (!res.ok) throw new Error("Erreur de réponse du serveur AI");
      
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

    } catch (err: any) {
      console.error("AI Analysis Failed", err);
      // Éviter le spinner infini en assurant que isAnalyzing est false
      setIsAnalyzing(false); 
      toast.error("Échec de la connexion à l'IA. Vérifiez la clé API ou votre connexion.");
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
            id,
            nom_complet,
            telephone,
            sexe,
            age,
            quartier,
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
      
      const { data: personnelData, error: personnelError } = await supabase
          .from('personnel')
          .select('id')
          .eq('email', user.email)
          .single();
      
      if (personnelError) {
        console.warn("Utilisateur non trouvé dans la table personnel, utilisation de l'ID par défaut.");
      }
      
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

      if (consultError) throw consultError;

      // 2. Mise à jour du statut du séjour
      const { error: updateError } = await supabase
        .from('sejours_actifs')
        .update({ statut: 'En caisse' }) 
        .eq('id', selectedPatient.id);

      if (updateError) throw updateError;

      toast.success("Consultation enregistrée avec succès !");
      setSuccess(true);
      
      // Reset after delay
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          tension: "",
          temperature: "",
          poids: "",
          notes_cliniques: "",
          diagnostic: "",
          ordonnance: "",
        });
        setAiAnalysis(null);
        setTranscription("");
        setSelectedPatient(null);
        setActiveSubTab('consultation');
        fetchWaitingPatients();
      }, 1500);

    } catch (err: any) {
      console.error("Flux Médical - ERREUR:", err);
      toast.error(err.message || "Erreur lors de l'enregistrement.");
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
                className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/20"
              >
                {/* Board Header section */}
                <div className="p-8 bg-white border-b border-slate-100 text-slate-900 flex flex-col gap-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-riverside-red/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                   
                   <div className="flex items-center justify-between relative z-10 w-full">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner">
                           <User size={32} className="text-slate-400" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900">{selectedPatient.patients.nom_complet}</h3>
                           <div className="flex items-center gap-4 mt-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Tél:</span>
                                <span className="text-slate-900 text-[10px] font-black tracking-tight">{selectedPatient.patients.telephone}</span>
                              </div>
                              <span className="w-1 h-1 bg-slate-200 rounded-full" />
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Sexe:</span>
                                <span className="text-slate-900 text-[10px] font-black tracking-tight">{selectedPatient.patients.sexe === 'M' ? 'Homme' : 'Femme'}</span>
                              </div>
                              <span className="w-1 h-1 bg-slate-200 rounded-full" />
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Âge:</span>
                                <span className="text-slate-900 text-[10px] font-black tracking-tight">{selectedPatient.patients.age} ans</span>
                              </div>
                              <span className="w-1 h-1 bg-slate-200 rounded-full" />
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Quartier:</span>
                                <span className="text-slate-900 text-[10px] font-black tracking-tight uppercase">{selectedPatient.patients.quartier}</span>
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Sub-tabs Navigation */}
                        <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-100 flex gap-1">
                          {[
                            { id: 'consultation', label: 'CONSUL.', icon: Stethoscope },
                            { id: 'history', label: 'HIST.', icon: FileText },
                            { id: 'lab', label: 'LABO', icon: FlaskConical },
                            { id: 'tools', label: 'OUTILS', icon: Calculator }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActiveSubTab(tab.id as any)}
                              className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeSubTab === tab.id 
                                  ? "bg-white text-riverside-red shadow-lg shadow-slate-200/50 border border-slate-100" 
                                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                              )}
                            >
                              <tab.icon size={13} />
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                   </div>

                   {/* Alerts and Motif row */}
                   <div className="flex flex-wrap items-center gap-4 relative z-10 pt-2 border-t border-slate-50">
                     <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl flex items-center gap-3">
                        <Clock className="text-slate-400" size={14} />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">En attente depuis: {new Date(selectedPatient.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>

                     {selectedPatient.patients.alertes_medicales && (
                        <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl flex items-center gap-3">
                           <AlertCircle className="text-riverside-red animate-pulse" size={16} />
                           <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter">ALERTE: {selectedPatient.patients.alertes_medicales}</span>
                        </div>
                     )}
                   </div>
                </div>

                {/* Transcription Status (moved below header) */}
                <AnimatePresence>
                  {(isListening || transcription) && !aiAnalysis && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-slate-900 p-4 shadow-inner"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                           <div className="w-2 h-2 bg-riverside-red rounded-full animate-pulse" />
                           <span className="text-[10px] font-black text-white uppercase tracking-widest">{isListening ? "Transcription Directe" : "Texte Capturé"}</span>
                        </div>
                        <p className="text-emerald-400 text-[11px] font-mono font-bold flex-1 italic truncate">
                          &quot;{transcription || "Captation vocale active..."}&quot;
                        </p>
                      </div>
                    </motion.div>
                  )} 
                </AnimatePresence>

                <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[600px]">
                  {activeSubTab === 'consultation' ? (
                    <>
                      <div className={cn(
                        "p-8 space-y-10 transition-all duration-500",
                        aiAnalysis ? "xl:col-span-8 border-r border-slate-50" : "xl:col-span-12"
                      )}>
                        <form onSubmit={handleConsultation} className="space-y-10">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                              <div className="w-2 h-8 bg-riverside-red rounded-full" />
                              Nouvelle Consultation
                            </h4>
                            
                            <button 
                              type="button"
                              onClick={toggleListening}
                              className={cn(
                                "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                                isListening ? "bg-riverside-red text-white shadow-xl shadow-red-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              )}
                            >
                              {isListening ? <Mic size={14} className="animate-pulse" /> : <Mic size={14} />}
                              {isListening ? "ARRÊTER L'ÉCOUTE" : "SAISIE IA VOCALE"}
                            </button>
                          </div>

                          {/* 1. Motif de Consultation */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                  <FileText size={14} className="text-riverside-red" /> Motif de Consultation (Saisie IA ou Micro)
                               </label>
                            </div>
                            <textarea 
                              id="motif_visite_textarea"
                              required
                              rows={3}
                              value={formData.notes_cliniques}
                              onChange={e => setFormData({...formData, notes_cliniques: e.target.value})}
                              placeholder="Détaillez le motif de la visite et les premières observations..."
                              className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:border-riverside-red outline-none font-bold text-sm resize-y min-h-[120px] transition-all shadow-inner placeholder:text-slate-300"
                            />
                          </div>
 
                          {/* 2. Constantes */}
                          <div className="space-y-4 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2 mb-2">
                                <Activity size={14} className="text-riverside-red" /> Constantes Vitales
                             </label>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                 <p className="text-[9px] font-black text-slate-400 uppercase ml-1">Tension (mmHg)</p>
                                 <input 
                                   id="tension_input"
                                   required
                                   type="text"
                                   value={formData.tension}
                                   onChange={e => setFormData({...formData, tension: e.target.value})}
                                   placeholder="ex: 12/8"
                                   className="w-full p-4 bg-white border border-slate-100 rounded-xl focus:border-riverside-red outline-none font-black text-sm shadow-sm"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[9px] font-black text-slate-400 uppercase ml-1">Température (°C)</p>
                                 <input 
                                   id="temp_input"
                                   required
                                   type="text"
                                   value={formData.temperature}
                                   onChange={e => setFormData({...formData, temperature: e.target.value})}
                                   placeholder="ex: 37"
                                   className="w-full p-4 bg-white border border-slate-100 rounded-xl focus:border-riverside-red outline-none font-black text-sm shadow-sm"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[9px] font-black text-slate-400 uppercase ml-1">Poids (kg)</p>
                                 <input 
                                   id="poids_input"
                                   required
                                   type="text"
                                   value={formData.poids}
                                   onChange={e => setFormData({...formData, poids: e.target.value})}
                                   placeholder="ex: 75"
                                   className="w-full p-4 bg-white border border-slate-100 rounded-xl focus:border-riverside-red outline-none font-black text-sm shadow-sm"
                                 />
                              </div>
                            </div>
                          </div>
 
                          {/* 3. Diagnostic & Ordonnance */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                  <Sparkles size={14} className="text-amber-500" /> Diagnostic Établi
                               </label>
                               <textarea 
                                 id="diagnostic_textarea"
                                 required
                                 rows={4}
                                 value={formData.diagnostic}
                                 onChange={e => setFormData({...formData, diagnostic: e.target.value})}
                                 placeholder="Saisissez le diagnostic final..."
                                 className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl focus:border-riverside-red outline-none font-bold text-sm resize-y min-h-[180px] transition-all shadow-inner"
                               />
                            </div>
 
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                  <Pill size={14} className="text-emerald-500" /> Ordonnance Riverside
                               </label>
                               <textarea 
                                 id="ordonnance_textarea"
                                 required
                                 rows={4}
                                 value={formData.ordonnance}
                                 onChange={e => setFormData({...formData, ordonnance: e.target.value})}
                                 placeholder="Prescription médicamenteuse..."
                                 className="w-full p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl focus:border-emerald-500 outline-none font-bold text-sm font-mono resize-y min-h-[180px] text-emerald-800 transition-all shadow-sm"
                               />
                            </div>
                          </div>
 
                          {/* Action */}
                          <div className="pt-10 border-t border-slate-100 flex items-center justify-between">
                             <button 
                               id="abandon_session_btn"
                               type="button"
                               onClick={() => setSelectedPatient(null)}
                               className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                             >
                               Abandonner la session
                             </button>
                             
                             <button 
                               id="valider_consultation_btn"
                               disabled={submitting}
                               className="px-12 py-5 bg-riverside-red text-white rounded-2xl font-black uppercase tracking-tighter text-sm shadow-2xl shadow-red-200 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-4"
                             >
                                {submitting ? <Loader2 size={20} className="animate-spin" /> : success ? <CheckCircle size={20} /> : <FileText size={20} />}
                                {success ? "ENREGISTRÉ AVEC SUCCÈS" : "Valider la Consultation"}
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
                    <div className="xl:col-span-12 p-8 space-y-8 overflow-y-auto max-h-[700px] bg-slate-50/20">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Dossier Historique</h4>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Parcours de soins complet du patient</p>
                        </div>
                        <div className="px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {history.length} Actes Enregistrés
                        </div>
                      </div>
                      
                      {loadingHistory ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                          <Loader2 className="animate-spin text-riverside-red" size={24} />
                          <p className="text-[10px] font-black uppercase tracking-widest italic">Interrogation du dossier...</p>
                        </div>
                      ) : history.length === 0 ? (
                        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={24} className="text-slate-200" />
                          </div>
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Aucun antécédent dans la base</p>
                        </div>
                      ) : (
                        <div className="relative space-y-12 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-100">
                          {history.map((h, idx) => (
                            <div key={h.id} className="relative pl-12 group">
                              <div className={cn(
                                "absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md z-10 transition-transform group-hover:scale-110",
                                idx === 0 ? "bg-riverside-red text-white" : "bg-slate-100 text-slate-400"
                              )}>
                                <Activity size={12} />
                              </div>
                              
                              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:border-riverside-red/20 transition-all duration-300">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-50">
                                  <div className="flex items-center gap-4">
                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                      <Clock size={16} className="text-slate-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Consultation du {new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Praticien: Dr. {h.personnel?.nom_complet || 'Médicin Riverside'}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-end">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Constantes</p>
                                      <div className="flex items-center gap-2">
                                        <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 border border-slate-100">
                                          T°: {h.constantes?.temperature}°C
                                        </div>
                                        <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 border border-slate-100">
                                          TA: {h.constantes?.tension}
                                        </div>
                                        <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 border border-slate-100">
                                          Poids: {h.constantes?.poids}kg
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-50">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <FileText size={12} className="text-riverside-red" /> Motif & Observations
                                      </p>
                                      <p className="text-xs font-bold text-slate-700 leading-relaxed italic">{h.notes_cliniques || "Non renseigné"}</p>
                                    </div>
                                    <div className="bg-amber-50/30 p-6 rounded-2xl border border-amber-100/50">
                                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Sparkles size={12} /> Diagnostic Établi
                                      </p>
                                      <p className="text-xs font-black text-slate-800 leading-relaxed uppercase">{h.diagnostic || "Analyse en cours"}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-emerald-50/20 p-8 rounded-[2rem] border border-emerald-100 flex flex-col h-full">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <Pill size={14} /> Ordonnance Riverside
                                    </p>
                                    <p className="text-xs font-mono font-bold text-emerald-800 leading-[1.8] whitespace-pre-line flex-1">
                                      {h.ordonnance}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : activeSubTab === 'lab' ? (
                    <div className="xl:col-span-12 p-10 space-y-8 h-[600px] overflow-y-auto">
                       <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Examens & Laboratoire</h4>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Résultats techniques et imagerie</p>
                          </div>
                          <div className="flex gap-4">
                             <div className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                               Tous les tests payés
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[
                            { test: "NFS (HÉMOGRAMME)", status: "COMPLÉTÉ", date: "28/04/2026", result: "Paramètres normaux", doctor: "Biochimiste" },
                            { test: "GLYCÉMIE À JEUN", status: "EN ATTENTE", date: "En cours", result: "---", doctor: "Laboratoire" },
                            { test: "TEST PALU (TDR)", status: "COMPLÉTÉ", date: "28/04/2026", result: "NÉGATIF", doctor: "Infirmerie" },
                            { test: "CRP", status: "EN ATTENTE", date: "Prélèvement fait", result: "---", doctor: "Laboratoire" }
                          ].map((lab, i) => (
                            <div key={i} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between hover:border-riverside-red/30 transition-all group">
                               <div className="flex items-center gap-5">
                                  <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner",
                                    lab.status === "COMPLÉTÉ" ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                                  )}>
                                     <FlaskConical size={20} />
                                  </div>
                                  <div>
                                     <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{lab.test}</p>
                                     <div className="flex items-center gap-3 mt-1.5">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DR. {lab.doctor}</p>
                                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                        <p className="text-[9px] font-bold text-slate-400">{lab.date}</p>
                                     </div>
                                  </div>
                               </div>
                               <div className="flex flex-col items-end gap-2">
                                  <span className={cn(
                                    "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                    lab.status === "COMPLÉTÉ" ? "bg-emerald-100/50 text-emerald-600" : "bg-amber-100/50 text-amber-600"
                                  )}>
                                    {lab.status}
                                  </span>
                                  {lab.status === "COMPLÉTÉ" && (
                                    <p className="text-[10px] font-black text-slate-900 group-hover:text-riverside-red transition-colors">{lab.result}</p>
                                  )}
                               </div>
                            </div>
                          ))}
                       </div>
                       
                       <div className="mt-10 p-10 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center gap-4">
                          <Brain className="text-slate-200" size={32} />
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Connectez un automate de laboratoire Riverside<br/>pour la synchronisation directe des résultats.</p>
                       </div>
                    </div>
                  ) : (
                    <div className="xl:col-span-12 p-8 space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* BMI Calculator */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 flex flex-col justify-between hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
                          <div className="space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner group-hover:bg-blue-500 group-hover:text-white transition-all">
                                <Activity size={24} />
                              </div>
                              <div>
                                 <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Calculateur d&apos;IMC</h4>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Indice de Masse Corporelle</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Poids (kg)</label>
                                <input 
                                  type="number" 
                                  value={bmiInput.weight}
                                  onChange={(e) => setBmiInput({ ...bmiInput, weight: e.target.value })}
                                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-blue-500 shadow-inner focus:bg-white transition-all"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Taille (cm)</label>
                                <input 
                                  type="number" 
                                  value={bmiInput.height}
                                  onChange={(e) => setBmiInput({ ...bmiInput, height: e.target.value })}
                                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-blue-500 shadow-inner focus:bg-white transition-all"
                                />
                              </div>
                            </div>
                          </div>

                          {bmiInput.weight && bmiInput.height ? (
                            <div className="p-8 bg-slate-900 rounded-[2rem] text-center space-y-3 shadow-2xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] relative z-10">Résultat IMC</p>
                              <div className="text-4xl font-black text-white tracking-tighter relative z-10">
                                {(Number(bmiInput.weight) / ((Number(bmiInput.height)/100) ** 2)).toFixed(1)}
                              </div>
                              <div className={cn(
                                "px-4 py-2 rounded-xl inline-block text-[10px] font-black uppercase tracking-widest relative z-10 border",
                                (() => {
                                  const imc = Number(bmiInput.weight) / ((Number(bmiInput.height)/100) ** 2);
                                  if (imc < 18.5) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
                                  if (imc < 25) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                  if (imc < 30) return "bg-orange-500/10 text-orange-400 border-orange-500/20";
                                  return "bg-red-500/10 text-red-400 border-red-500/20";
                                })()
                              )}>
                                {(() => {
                                  const imc = Number(bmiInput.weight) / ((Number(bmiInput.height)/100) ** 2);
                                  if (imc < 18.5) return "Maigreur";
                                  if (imc < 25) return "Normal";
                                  if (imc < 30) return "Surpoids";
                                  return "Obésité";
                                })()}
                              </div>
                            </div>
                          ) : (
                            <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">En attente de paramètres</p>
                            </div>
                          )}
                        </div>

                        {/* Paracetamol Calculator */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 flex flex-col justify-between hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
                          <div className="space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                <Pill size={24} />
                              </div>
                              <div>
                                 <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Dose Paracétamol</h4>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pédiatrie (15mg/kg/prise)</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Poids de l&apos;enfant (kg)</label>
                              <div className="relative group">
                                <Weight className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                <input 
                                  type="number" 
                                  value={paraInput.weight}
                                  onChange={(e) => setParaInput({ weight: e.target.value })}
                                  placeholder="Ex: 10"
                                  className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 shadow-inner focus:bg-white transition-all"
                                />
                              </div>
                            </div>
                          </div>

                          {paraInput.weight ? (
                            <div className="p-8 bg-emerald-950 rounded-[2rem] text-center space-y-3 shadow-2xl border-b-8 border-emerald-900 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                              <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-[0.3em] relative z-10">Dose Recommandée</p>
                              <div className="text-4xl font-black text-emerald-400 tracking-tighter relative z-10">
                                {Number(paraInput.weight) * 15} <span className="text-lg">MG</span>
                              </div>
                              <div className="bg-emerald-500/10 px-4 py-2 rounded-xl inline-block text-[10px] font-black text-emerald-200 uppercase tracking-widest relative z-10 italic">
                                Max 4 fois par jour
                              </div>
                            </div>
                          ) : (
                            <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entrez le poids du patient</p>
                            </div>
                          )}
                        </div>

                        {/* Protocol Guide */}
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6 flex flex-col justify-between relative overflow-hidden group">
                           <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-riverside-red/10 rounded-full blur-3xl group-hover:scale-150 transition-transform" />
                           <div className="space-y-4 relative z-10">
                              <Shield size={24} className="text-riverside-red" />
                              <h4 className="text-sm font-black text-white uppercase tracking-tighter">Protocole Riverside</h4>
                              <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-tight">Vérifiez toujours le stock de médicaments dans la section Pharmacie avant de valider une prescription complexe.</p>
                           </div>
                           <button type="button" className="relative z-10 w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">Consulter les Guides</button>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
