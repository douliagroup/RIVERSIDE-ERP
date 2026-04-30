"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Shield, 
  Loader2,
  Calendar,
  Filter,
  Eye,
  Pencil,
  Activity,
  CheckCircle2,
  X,
  Plus,
  Stethoscope,
  DollarSign,
  AlertCircle,
  FileText,
  Save,
  ArrowRight,
  TrendingDown,
  User,
  Heart,
  MoreHorizontal
} from "lucide-react";
import NewPatientModal from "@/src/components/NewPatientModal";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface Patient {
  id: string;
  nom_complet: string;
  telephone: string;
  type_assurance: string;
  sexe: string;
  date_naissance: string;
  age?: number;
  profession?: string;
  societe?: string;
  numero_assurance?: string;
  alertes_medicales?: string;
  groupe_sanguin?: string;
  allergies?: string;
  antecedents?: string;
  created_at: string;
}

interface Consultation {
  id: string;
  created_at: string;
  motif_visite: string;
  diagnostic?: string;
  traitement?: string;
}

interface Facture {
  id: string;
  created_at: string;
  montant_total: number;
  reste_a_payer: number;
  statut_paiement: string;
}

export default function PatientsEMRPage() {
  const router = useRouter();
  
  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab ] = useState<"medical" | "finance">("medical");
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  const handleCreateSuccess = (patientId: string) => {
    fetchPatients();
    // Optionally select the new patient
    supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedPatient(data);
          fetchPatientDetails(data);
        }
      });
  };

  // Related data for selected patient
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Edit mode for medical info
  const [medicalForm, setMedicalForm] = useState({
    groupe_sanguin: "",
    allergies: "",
    antecedents: ""
  });
  const [savingMedical, setSavingMedical] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('nom_complet', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error("Error loading patients:", err);
      toast.error("Échec du chargement des patients");
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const fetchPatientDetails = async (patient: Patient) => {
    setLoadingDetails(true);
    setActiveTab("medical");
    setMedicalForm({
      groupe_sanguin: patient.groupe_sanguin || "",
      allergies: patient.allergies || "",
      antecedents: patient.antecedents || ""
    });

    try {
      // 1. Consultations
      const { data: consultData } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      setConsultations(consultData || []);

      // 2. Factures
      const { data: factData } = await supabase
        .from('factures')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      
      if (factData) {
        setFactures(factData);
      } else {
        // Fallback to transactions_caisse if factures table is missing or empty
        const { data: txData } = await supabase
          .from('transactions_caisse')
          .select('*')
          .eq('patient_id', patient.id);
        
        // Map transactions to a format similar to factures
        const mapped: Facture[] = (txData || []).map(tx => ({
          id: tx.id,
          created_at: tx.date_transaction || tx.created_at,
          montant_total: tx.montant_total || 0,
          reste_a_payer: tx.reste_a_payer || 0,
          statut_paiement: tx.statut_paiement || "Réglé"
        }));
        setFactures(mapped);
      }
    } catch (err) {
      console.error("Error loading patient details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateMedical = async () => {
    if (!selectedPatient) return;
    setSavingMedical(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update(medicalForm)
        .eq('id', selectedPatient.id);
      
      if (error) throw error;
      
      toast.success("Dossier médical mis à jour");
      // Update local state
      setSelectedPatient({ ...selectedPatient, ...medicalForm });
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, ...medicalForm } : p));
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    } finally {
      setSavingMedical(false);
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.nom_complet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.telephone?.includes(searchTerm)
    );
  }, [patients, searchTerm]);

  const totalSpent = factures.reduce((acc, curr) => acc + curr.montant_total, 0);
  const totalDebt = factures.reduce((acc, curr) => acc + curr.reste_a_payer, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-white -m-4 md:-m-10">
      
      {/* HEADER SECTION */}
      <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-riverside-red rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-100">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">Dossier Patient Électronique</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Vue 360° & Traçabilité Médicale</p>
          </div>
        </div>

        <button 
          onClick={() => setIsPatientModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-riverside-red transition-all shadow-md active:scale-95"
        >
          <UserPlus size={16} /> Nouveau Patient
        </button>
      </div>

      <NewPatientModal 
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT LIST (30%) */}
        <div className="w-full md:w-[30%] border-r border-slate-100 flex flex-col bg-slate-50/50">
          <div className="p-6 border-b border-slate-100 bg-white">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-riverside-red transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="RECHERCHER PAR NOM OU TEL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-riverside-red font-bold text-[10px] uppercase tracking-widest transition-all focus:bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-3">
                <Loader2 className="animate-spin text-slate-200" size={32} />
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Base de données...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-10 text-center text-[10px] font-bold text-slate-300 uppercase italic">Aucun patient trouvé</div>
            ) : (
              filteredPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPatient(p);
                    fetchPatientDetails(p);
                  }}
                  className={cn(
                    "w-full p-4 rounded-2xl flex items-center gap-4 transition-all border",
                    selectedPatient?.id === p.id 
                      ? "bg-white border-riverside-red shadow-lg shadow-red-50 -translate-y-1" 
                      : "bg-white border-slate-100 hover:border-slate-200 opacity-80 hover:opacity-100"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase shadow-inner",
                    selectedPatient?.id === p.id ? "bg-riverside-red text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    {p.nom_complet.substring(0, 2)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-none mb-1">{p.nom_complet}</p>
                    <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                      <Phone size={10} className="text-slate-300" /> {p.telephone || "N/A"}
                    </p>
                  </div>
                  {selectedPatient?.id === p.id && (
                     <div className="w-1.5 h-1.5 bg-riverside-red rounded-full" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT CONTENT (70%) */}
        <div className="hidden md:flex flex-1 flex-col overflow-hidden bg-white">
          {!selectedPatient ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-300">
               <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6"
               >
                 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                   <User size={48} className="opacity-10" />
                 </div>
                 <div className="text-center">
                   <p className="text-sm font-black uppercase tracking-widest mb-1">Dossier Médical Sécurisé</p>
                   <p className="text-[10px] font-bold opacity-60 uppercase">Sélectionnez un patient dans la liste de gauche pour voir son dossier complet</p>
                 </div>
               </motion.div>
            </div>
          ) : (
            <motion.div 
              key={selectedPatient.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* PATIENT HEADER INFO */}
              <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-white relative">
                 <div className="flex gap-6 items-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-slate-200">
                      {selectedPatient.nom_complet.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{selectedPatient.nom_complet}</h2>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                          selectedPatient.type_assurance === "Cash" ? "bg-amber-100 text-amber-600" : "bg-blue-600 text-white"
                        )}>
                          {selectedPatient.type_assurance}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><User size={12} className="text-riverside-red" /> {selectedPatient.sexe === 'M' ? 'MASCULIN' : 'FÉMININ'}</span>
                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-riverside-red" /> {selectedPatient.date_naissance ? calculateAge(selectedPatient.date_naissance) : (selectedPatient.age || "??")} ANS</span>
                        <span className="flex items-center gap-1.5"><Phone size={12} className="text-riverside-red" /> {selectedPatient.telephone || "NON RENSEIGNÉ"}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-4">
                        {selectedPatient.allergies && (
                          <div className="bg-red-50 text-riverside-red border border-red-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 animate-pulse">
                            <AlertCircle size={10} /> ALLERGIES: {selectedPatient.allergies}
                          </div>
                        )}
                        {selectedPatient.antecedents && (
                          <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2">
                             <Activity size={10} className="text-riverside-red" /> ANTECÉDENTS: {selectedPatient.antecedents}
                          </div>
                        )}
                      </div>
                    </div>
                 </div>

                 <div className="flex flex-col gap-2">
                   <button className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl transition-all border border-slate-100"><MoreHorizontal /></button>
                 </div>
              </div>

              {/* TABS NAVIGATION */}
              <div className="px-8 border-b border-slate-100 flex gap-10 bg-white">
                <button 
                  onClick={() => setActiveTab("medical")}
                  className={cn(
                    "py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                    activeTab === "medical" ? "text-riverside-red" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Dossier Médical
                  {activeTab === "medical" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-riverside-red rounded-t-full" />}
                </button>
                <button 
                  onClick={() => setActiveTab("finance")}
                  className={cn(
                    "py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                    activeTab === "finance" ? "text-riverside-red" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Finances & Factures
                  {activeTab === "finance" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-riverside-red rounded-t-full" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                <AnimatePresence mode="wait">
                  {activeTab === "medical" ? (
                    <motion.div 
                      key="medical"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-10"
                    >
                      {/* MEDICAL BASIC INFO EDIT */}
                      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                           <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest flex items-center gap-3">
                             <Stethoscope size={20} className="text-riverside-red" /> Informations Vitales
                           </h3>
                           <button 
                            onClick={handleUpdateMedical}
                            disabled={savingMedical}
                            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-riverside-red transition-all flex items-center gap-2 group disabled:opacity-50"
                           >
                             {savingMedical ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} className="group-hover:scale-110 transition-transform" /> }
                             Enregistrer les modifications
                           </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Groupe Sanguin</label>
                             <select 
                               value={medicalForm.groupe_sanguin}
                               onChange={(e) => setMedicalForm({...medicalForm, groupe_sanguin: e.target.value})}
                               className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-riverside-red outline-none focus:bg-white focus:border-riverside-red transition-all"
                             >
                                <option value="">Inconnu</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                             </select>
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Allergies connues</label>
                             <input 
                               value={medicalForm.allergies}
                               onChange={(e) => setMedicalForm({...medicalForm, allergies: e.target.value})}
                               placeholder="Ex: Pénicilline, Arachides..."
                               className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-riverside-red transition-all"
                             />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Antécédents Majeurs</label>
                             <input 
                               value={medicalForm.antecedents}
                               onChange={(e) => setMedicalForm({...medicalForm, antecedents: e.target.value})}
                               placeholder="Ex: Diabète, Hypertension..."
                               className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-riverside-red transition-all"
                             />
                           </div>
                        </div>
                      </div>

                      {/* CONSULTATION HISTORY */}
                      <div className="space-y-6">
                        <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest flex items-center gap-3 ml-2">
                          <Activity size={20} className="text-riverside-red" /> Chronologie des Consultations
                        </h3>

                        {loadingDetails ? (
                           <div className="py-20 flex justify-center">
                             <Loader2 size={32} className="animate-spin text-slate-200" />
                           </div>
                        ) : consultations.length === 0 ? (
                          <div className="bg-white p-16 rounded-[3rem] border border-slate-100 text-center flex flex-col items-center gap-4">
                             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                               <FileText size={24} className="text-slate-200" />
                             </div>
                             <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">Aucun historique de consultation trouvé</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {consultations.map((consult, idx) => (
                              <div key={consult.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-riverside-red/30 transition-all">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:bg-red-50 transition-colors" />
                                
                                <div className="flex items-center justify-between mb-6 relative z-10">
                                  <div className="flex items-center gap-4">
                                    <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black">
                                      {consultations.length - idx}
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                        {new Date(consult.created_at).toLocaleDateString()} • {new Date(consult.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                      <p className="text-xs font-black text-slate-900 uppercase">Consultation Générale</p>
                                    </div>
                                  </div>
                                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-full">Clôturé</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Motif / Plaintes</p>
                                    <p className="text-xs font-bold text-slate-800 leading-relaxed italic">{consult.motif_visite}</p>
                                  </div>
                                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Diagnostic & Plan</p>
                                    <p className="text-xs font-bold text-slate-800 leading-relaxed">{consult.diagnostic || "En attente de saisie..."}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="finance"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-10"
                    >
                      {/* FINANCE KPI CARDS */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
                           <div className="flex items-center justify-between mb-4">
                             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm"><DollarSign size={20} /></div>
                             <TrendingDown size={20} className="opacity-40" />
                           </div>
                           <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Volume Total Dépensé</p>
                           <h3 className="text-3xl font-black tabular-nums mt-1">{totalSpent.toLocaleString()} <span className="text-xs opacity-50 font-medium">FCFA</span></h3>
                        </div>
                        <div className={cn(
                          "p-8 rounded-[2.5rem] shadow-xl transition-all",
                          totalDebt > 0 ? "bg-red-600 text-white shadow-red-100 scale-105 border-4 border-white" : "bg-white text-slate-900 border border-slate-100"
                        )}>
                           <div className="flex items-center justify-between mb-4">
                             <div className={cn(
                               "w-10 h-10 rounded-xl flex items-center justify-center",
                               totalDebt > 0 ? "bg-white/20 backdrop-blur-sm" : "bg-red-50 text-red-500"
                             )}><AlertCircle size={20} /></div>
                             {totalDebt > 0 && <span className="text-[8px] font-black uppercase bg-white text-red-600 px-2 py-0.5 rounded-full animate-pulse">Action Requise</span>}
                           </div>
                           <p className={cn("text-[9px] font-black uppercase tracking-widest", totalDebt > 0 ? "opacity-60" : "text-slate-400")}>Reste à Payer (Dette)</p>
                           <h3 className="text-3xl font-black tabular-nums mt-1">{totalDebt.toLocaleString()} <span className="text-xs opacity-50 font-medium">FCFA</span></h3>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-end">
                           <div className="flex items-center gap-3 mb-6">
                             <div className="w-2 h-2 rounded-full bg-blue-500" />
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activité Financière</p>
                           </div>
                           <p className="text-2xl font-black text-slate-900 tabular-nums">{factures.length} <span className="text-[10px] text-slate-300 font-bold uppercase ml-2">Factures enregistrées</span></p>
                        </div>
                      </div>

                      {/* INVOICES LIST */}
                      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm min-h-[400px]">
                        <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest mb-8 flex items-center gap-3">
                           <FileText size={20} className="text-emerald-600" /> Historique de Facturation
                        </h3>

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-50">
                                <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Réf</th>
                                <th className="text-right py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                <th className="text-right py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reste à payer</th>
                                <th className="text-right py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {factures.map(f => (
                                <tr key={f.id} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="py-4">
                                    <p className="text-xs font-bold text-slate-800">{new Date(f.created_at).toLocaleDateString()}</p>
                                    <p className="text-[8px] font-black text-slate-300 uppercase italic">#FAC-{f.id.substring(0, 8)}</p>
                                  </td>
                                  <td className="py-4 text-right">
                                    <p className="text-xs font-black text-slate-900 tabular-nums">{f.montant_total.toLocaleString()} FCFA</p>
                                  </td>
                                  <td className="py-4 text-right">
                                    <p className={cn(
                                      "text-xs font-black tabular-nums",
                                      f.reste_a_payer > 0 ? "text-red-600" : "text-slate-400"
                                    )}>{f.reste_a_payer.toLocaleString()} FCFA</p>
                                  </td>
                                  <td className="py-4 text-right">
                                    <span className={cn(
                                      "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                      f.reste_a_payer === 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                    )}>
                                      {f.reste_a_payer === 0 ? "SOLDÉ" : "IMPAYÉ"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {factures.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-20 text-center text-[10px] font-bold text-slate-300 uppercase italic">Aucune donnée de facturation pour ce patient</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}
