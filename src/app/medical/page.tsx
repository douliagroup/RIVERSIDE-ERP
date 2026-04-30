'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
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
  User,
  Clock,
  Mic,
  Sparkles,
  Brain,
  AlertCircle,
  Calculator,
  ChevronRight,
  History,
  Send,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

// Type definitions for SpeechRecognition
const MEDICAMENTS_PEDIATRIQUES = [
  { id: 'para', nom: 'Paracétamol', dose: 15, type: 'mg/kg/prise', indication: 'Toutes les 6h' },
  { id: 'ibu', nom: 'Ibuprofène', dose: 10, type: 'mg/kg/prise', indication: 'Toutes les 8h (Max 30mg/kg/jour)' },
  { id: 'amox', nom: 'Amoxicilline', dose: 50, type: 'mg/kg/jour', indication: 'À diviser en 2 ou 3 prises' },
  { id: 'cefp', nom: 'Cefpodoxime (Orelox)', dose: 8, type: 'mg/kg/jour', indication: 'À diviser en 2 prises' },
  { id: 'azith', nom: 'Azithromycine', dose: 20, type: 'mg/kg/jour', indication: '1 prise par jour (pendant 3 jours)' },
  { id: 'phloro', nom: 'Phloroglucinol (Spasfon)', dose: 3, type: 'mg/kg/jour', indication: 'À diviser en 3 prises' },
  { id: 'amox_clav', nom: 'Amoxicilline + Acide Clavulanique', dose: 80, type: 'mg/kg/jour', indication: 'À diviser en 3 prises' }
];

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition_Type extends EventTarget {
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
    id: string;
    nom_complet: string;
    telephone: string;
    sexe: string;
    age: number;
    quartier: string;
    alertes_medicales: string;
  };
}

export default function MedicalPage() {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<PatientWaiting | null>(null);
  const [activeTab, setActiveTab] = useState<'CONSULTATION' | 'HISTORIQUE' | 'OUTILS' | 'IA_INSIGHT'>('CONSULTATION');
  
  // States for list
  const [waitingPatients, setWaitingPatients] = useState<PatientWaiting[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Form states
  const [diagnostic, setDiagnostic] = useState('');
  const [ordonnance, setOrdonnance] = useState('');
  const [tension, setTension] = useState('');
  const [temperature, setTemperature] = useState('');
  const [poids, setPoids] = useState('');
  
  // History state
  const [historique, setHistorique] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // AI & Voice State
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition_Type | null>(null);

  // Chat AI State
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: 'Bonjour Docteur. Je suis DOULIA Insight. Comment puis-je vous assister aujourd\'hui ?' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setChatMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (err: any) {
      console.error("Chat Error:", err);
      toast.error("Erreur de communication avec DOULIA Insight.");
      setChatMessages(prev => [...prev, { role: 'ai', content: "Désolé, j'ai rencontré une difficulté technique. Veuillez réessayer." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Tools State
  const [bmiInput, setBmiInput] = useState({ weight: "", height: "" });
  const [pediaInput, setPediaInput] = useState({ weight: "", medicineId: "para" });

  const fetchWaitingPatients = useCallback(async () => {
    setLoadingPatients(true);
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
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    fetchWaitingPatients();
  }, [fetchWaitingPatients]);

  const chargerHistorique = async (patientId: string) => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement de l'historique");
    } else {
      setHistorique(data || []);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (selectedPatient && activeTab === 'HISTORIQUE') {
      chargerHistorique(selectedPatient.patient_id);
    }
  }, [selectedPatient, activeTab]);

  // Speech recognition init
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      toast.error("Votre navigateur ne supporte pas la reconnaissance vocale.");
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
      setDiagnostic(data.diagnostic_suggere || diagnostic);
      setOrdonnance(data.ordonnance_proposee || ordonnance);
    } catch (err: any) {
      console.error("AI Analysis Failed", err);
      toast.error("Échec de la connexion à l'IA. Vérifiez votre configuration.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveConsultation = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Veuillez d'abord sélectionner un patient.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('consultations')
        .insert([
          {
            patient_id: selectedPatient.patient_id,
            sejour_id: selectedPatient.id,
            diagnostic: diagnostic,
            ordonnance: ordonnance,
            tension,
            temperature,
            poids,
          }
        ]);

      if (error) throw error;

      // Update sejour status
      await supabase
        .from('sejours_actifs')
        .update({ statut: 'En caisse' })
        .eq('id', selectedPatient.id);

      toast.success("Consultation enregistrée avec succès !");
      
      // Reset
      setDiagnostic('');
      setOrdonnance('');
      setTension('');
      setTemperature('');
      setPoids('');
      setAiAnalysis(null);
      setTranscription("");
      setSelectedPatient(null);
      fetchWaitingPatients();
    } catch (error: any) {
      toast.error(`Erreur d'enregistrement : ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDU UI ---
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <Stethoscope className="text-red-600" size={24} />
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
        {/* Sidebar: Patients en attente */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Users size={12} className="text-red-600" />
                Liste d&apos;Attente
              </h2>
              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[9px] font-black">{waitingPatients.length} PV</span>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto p-3 space-y-2">
              {loadingPatients ? (
                <div className="p-10 flex flex-col items-center justify-center gap-3 opacity-30">
                  <Loader2 className="animate-spin text-red-600" size={20} />
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
                    onClick={() => {
                      setSelectedPatient(p);
                      setActiveTab('CONSULTATION');
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-all border flex flex-col gap-2 group active:scale-[0.98]",
                      selectedPatient?.id === p.id 
                        ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100" 
                        : "bg-white border-transparent hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-black tracking-tight">{p.patients.nom_complet}</span>
                       <Clock size={12} className={selectedPatient?.id === p.id ? "text-white/50" : "text-slate-300"} />
                    </div>
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest w-fit",
                      selectedPatient?.id === p.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {p.motif_visite}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!selectedPatient ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
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
                key={selectedPatient.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/20"
              >
                {/* Workspace Header */}
                <div className="p-8 border-b border-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                        <User size={32} className="text-slate-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900">{selectedPatient.patients.nom_complet}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{selectedPatient.patients.age} ans • {selectedPatient.patients.sexe}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{selectedPatient.patients.telephone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                      {[
                        { id: 'CONSULTATION', icon: Stethoscope, label: 'Consul.' },
                        { id: 'HISTORIQUE', icon: History, label: 'Hist.' },
                        { id: 'OUTILS', icon: Calculator, label: 'Outils' },
                        { id: 'IA_INSIGHT', icon: Brain, label: 'IA Insight' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id as any)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === t.id ? "bg-white text-red-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <t.icon size={13} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedPatient.patients.alertes_medicales && (
                    <div className="mt-6 bg-red-50 border border-red-100 px-4 py-2 rounded-xl flex items-center gap-3">
                      <AlertCircle className="text-red-600 animate-pulse" size={16} />
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter">ALERTE: {selectedPatient.patients.alertes_medicales}</span>
                    </div>
                  )}
                </div>

                <div className="p-8">
                  {activeTab === 'CONSULTATION' && (
                    <div className="space-y-8">
                      {/* AI Copilot Panel */}
                      <div className="bg-slate-900 p-6 rounded-3xl shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                          <div className="flex items-center gap-3">
                            <Brain className="text-red-400 animate-pulse" size={20} />
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Assistant Riverside IA</h4>
                          </div>
                          
                          <button
                            type="button"
                            onClick={toggleListening}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                              isListening 
                                ? "bg-red-600 text-white animate-pulse" 
                                : "bg-white/10 text-slate-300 hover:bg-white/20"
                            )}
                          >
                            <Mic size={14} />
                            {isListening ? "ARRÊTER L'ÉCOUTE" : "SAISIE VOCALE"}
                          </button>
                        </div>

                        {(transcription || isAnalyzing || aiAnalysis) && (
                          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3 relative z-10">
                            {isListening && (
                              <p className="text-emerald-400 text-[11px] font-mono italic">
                                Transcription: &quot;{transcription || "J'écoute..."}&quot;
                              </p>
                            )}
                            {isAnalyzing && (
                              <div className="flex items-center gap-2">
                                <Loader2 size={12} className="animate-spin text-red-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase">Analyse en cours...</span>
                              </div>
                            )}
                            {aiAnalysis && (
                              <div className="space-y-2 border-t border-white/5 pt-2">
                                <p className="text-[10px] font-black text-red-400 uppercase">Aide au Diagnostic:</p>
                                <p className="text-xs text-white/90 leading-relaxed font-bold italic">&quot;{aiAnalysis.diagnostic_suggere}&quot;</p>
                              </div>
                            )}
                          </div>
                        )}

                        {!transcription && !isListening && !isAnalyzing && !aiAnalysis && (
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center py-2">
                            Cliquez sur Saisie Vocale pour décrire les symptômes oralement
                          </p>
                        )}
                      </div>

                      {/* Main Form */}
                      <form onSubmit={handleSaveConsultation} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Constantes */}
                        <div className="md:col-span-12 grid grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <Activity size={12} /> Tension (mmHg)
                            </label>
                            <input 
                              type="text" 
                              placeholder="ex: 12/8" 
                              value={tension} 
                              onChange={e => setTension(e.target.value)} 
                              className="w-full bg-white border border-slate-100 p-4 rounded-xl font-black text-sm outline-none focus:border-red-600 transition-all shadow-sm" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <Thermometer size={12} /> Temp. (°C)
                            </label>
                            <input 
                              type="text" 
                              placeholder="ex: 37.5" 
                              value={temperature} 
                              onChange={e => setTemperature(e.target.value)} 
                              className="w-full bg-white border border-slate-100 p-4 rounded-xl font-black text-sm outline-none focus:border-red-600 transition-all shadow-sm" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <Weight size={12} /> Poids (kg)
                            </label>
                            <input 
                              type="text" 
                              placeholder="ex: 75" 
                              value={poids} 
                              onChange={e => setPoids(e.target.value)} 
                              className="w-full bg-white border border-slate-100 p-4 rounded-xl font-black text-sm outline-none focus:border-red-600 transition-all shadow-sm" 
                            />
                          </div>
                        </div>

                        {/* Textareas */}
                        <div className="md:col-span-6 space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <Sparkles size={14} className="text-amber-500" /> Diagnostic Établi
                          </label>
                          <textarea 
                            value={diagnostic} 
                            onChange={e => setDiagnostic(e.target.value)} 
                            className="w-full border border-slate-100 p-6 rounded-3xl h-60 text-sm font-bold resize-y bg-slate-50 focus:bg-white focus:border-red-600 outline-none transition-all shadow-inner" 
                            required 
                            placeholder="Saisissez le diagnostic final..." 
                          />
                        </div>

                        <div className="md:col-span-6 space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <Pill size={14} className="text-emerald-500" /> Ordonnance Riverside
                          </label>
                          <textarea 
                            value={ordonnance} 
                            onChange={e => setOrdonnance(e.target.value)} 
                            className="w-full border border-slate-100 p-6 rounded-3xl h-60 text-sm font-bold font-mono resize-y bg-emerald-50/20 focus:bg-white focus:border-emerald-600 outline-none transition-all shadow-inner text-emerald-800" 
                            required 
                            placeholder="Prescription médicamenteuse détaillée..." 
                          />
                        </div>

                        <div className="md:col-span-12">
                          <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-100 hover:scale-[1.01] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 text-sm uppercase tracking-widest"
                          >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                            {isLoading ? 'ENREGISTREMENT...' : 'Valider la Consultation'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {activeTab === 'HISTORIQUE' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Dossier Historique</h4>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Parcours de soins complet du patient</p>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {historique.length} Consultations
                        </div>
                      </div>

                      {loadingHistory ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                          <Loader2 className="animate-spin text-red-600" size={24} />
                          <p className="text-[10px] font-black uppercase tracking-widest italic">Interrogation du dossier...</p>
                        </div>
                      ) : historique.length === 0 ? (
                        <div className="bg-slate-50 text-center py-20 rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-300">
                          <FileText className="mx-auto mb-4" size={40} />
                          <p className="text-[10px] font-black uppercase tracking-widest">AUCUN ANTÉCÉDENT TROUVÉ</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {historique.map((consult, index) => (
                            <div key={index} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 group">
                              <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-50">
                                <div className="flex items-center gap-4">
                                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <Clock size={16} className="text-slate-400" />
                                  </div>
                                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Le {new Date(consult.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div className="flex gap-2">
                                  <span className="px-3 py-1 bg-slate-50 rounded-lg text-[9px] font-black text-slate-500 border border-slate-100">TA: {consult.tension || 'N/A'}</span>
                                  <span className="px-3 py-1 bg-slate-50 rounded-lg text-[9px] font-black text-slate-500 border border-slate-100">T°: {consult.temperature || 'N/A'}°C</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-2"><Sparkles size={12}/> Diagnostic</p>
                                  <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-100/50">
                                    <p className="text-sm font-bold text-slate-800 uppercase leading-relaxed">{consult.diagnostic}</p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-2"><Pill size={12}/> Ordonnance</p>
                                  <div className="bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100">
                                    <p className="text-xs text-emerald-900 font-mono font-bold whitespace-pre-line leading-relaxed">{consult.ordonnance}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'OUTILS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* BMI Calculator */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 flex flex-col justify-between hover:shadow-xl transition-all group">
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
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

                      {/* Pediatric Dosage Calculator */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 flex flex-col justify-between hover:shadow-xl transition-all group">
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all">
                              <Pill size={24} />
                            </div>
                            <div>
                               <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Calculateur de Dose</h4>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pédiatrie (mg/kg)</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Médicament</label>
                              <select 
                                value={pediaInput.medicineId}
                                onChange={(e) => setPediaInput({ ...pediaInput, medicineId: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 shadow-inner focus:bg-white transition-all appearance-none cursor-pointer"
                              >
                                {MEDICAMENTS_PEDIATRIQUES.map(m => (
                                  <option key={m.id} value={m.id}>{m.nom}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Poids de l&apos;enfant (kg)</label>
                              <div className="relative group/input">
                                <Weight className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-emerald-500 transition-colors" size={16} />
                                <input 
                                  type="number" 
                                  value={pediaInput.weight}
                                  onChange={(e) => setPediaInput({ ...pediaInput, weight: e.target.value })}
                                  placeholder="Ex: 10"
                                  className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 shadow-inner focus:bg-white transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {pediaInput.weight ? (() => {
                          const med = MEDICAMENTS_PEDIATRIQUES.find(m => m.id === pediaInput.medicineId);
                          if (!med) return null;
                          const result = Number(pediaInput.weight) * med.dose;
                          return (
                            <div className="p-8 bg-emerald-900 rounded-[2rem] text-center space-y-3 shadow-2xl relative overflow-hidden border-b-4 border-emerald-700">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                              <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-[0.3em] relative z-10">{med.nom}</p>
                              <div className="text-4xl font-black text-emerald-400 tracking-tighter relative z-10">
                                {result} <span className="text-lg">MG</span>
                              </div>
                              <div className="space-y-1 relative z-10">
                                <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">{med.type}</p>
                                <p className="text-[9px] font-bold text-emerald-300/80 italic">{med.indication}</p>
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entrez le poids du patient</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'IA_INSIGHT' && (
                    <div className="flex flex-col h-[600px]">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">DOULIA Insight</h4>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Assistant d&apos;aide à la décision clinique</p>
                        </div>
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 border border-red-100">
                          <Brain size={24} />
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-50/50 rounded-3xl border border-slate-100 mb-6 flex flex-col scrollbar-hide">
                        {chatMessages.map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed",
                              msg.role === 'user' 
                                ? "bg-slate-900 text-white self-end rounded-tr-none" 
                                : "bg-white text-slate-800 self-start rounded-tl-none shadow-sm border border-slate-100"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {msg.role === 'ai' && (
                                <div className="mt-1">
                                  <Stethoscope size={14} className="text-red-600" />
                                </div>
                              )}
                              <p>{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="bg-white text-slate-800 self-start p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex items-center gap-2">
                             <div className="flex gap-1">
                               <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                               <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                               <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce" />
                             </div>
                             <span className="text-[10px] font-black text-slate-400 uppercase ml-2">DOULIA réfléchit...</span>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleSendMessage} className="relative">
                        <input 
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Posez une question clinique (ex: posologie amoxicilline enfant 20kg)..."
                          className="w-full bg-white border border-slate-100 p-6 rounded-3xl text-sm font-bold shadow-xl shadow-slate-200/50 focus:border-red-600 outline-none transition-all pr-20"
                          disabled={isChatLoading}
                        />
                        <button 
                          type="submit"
                          disabled={!chatInput.trim() || isChatLoading}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-200"
                        >
                          <Send size={18} />
                        </button>
                      </form>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-4 italic">
                        DOULIA Insight est une aide ; la responsabilité clinique finale incombe au médecin.
                      </p>
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
