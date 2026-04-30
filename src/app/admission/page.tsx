"use client";

import React, { useState, useEffect, Suspense } from "react";
import { 
  User, 
  Phone, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Loader2,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Search,
  UserPlus,
  Stethoscope,
  Clock,
  Printer,
  ChevronRight,
  Activity,
  Thermometer,
  Scale,
  Zap,
  X,
  MoreVertical,
  Edit2,
  Eye,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/src/lib/supabase";
import NewPatientModal from "@/src/components/NewPatientModal";
import { cn } from "@/src/lib/utils";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Patient {
  id: string;
  nom_complet: string;
  telephone: string;
  sexe: string;
  date_naissance?: string;
  age?: number;
  profession?: string;
  societe?: string;
  quartier?: string;
  accompagnateur?: string;
  type_assurance: string;
  numero_assurance?: string;
}

interface QueueEntry {
  id: string;
  patient_id: string;
  spo2?: string;
  pouls?: string;
  personne_confiance?: string;
  heure_arrivee: string;
  motif: string;
  orientation?: string;
  service: string;
  tension?: string;
  temperature?: string;
  poids?: string;
  urgence: boolean;
  statut: string;
  patients?: Patient;
}

function AdmissionDashboard() {
  const router = useRouter();
  
  // Search & Selection
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundPatients, setFoundPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Registry Modals state
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [initialNameForModal, setInitialNameForModal] = useState("");
  const [isEditPatientMode, setIsEditPatientMode] = useState(false);
  const [editingPatientData, setEditingPatientData] = useState<Patient | null>(null);

  // Triage state
  const [isEditTriageMode, setIsEditTriageMode] = useState(false);
  const [editingQueueEntry, setEditingQueueEntry] = useState<QueueEntry | null>(null);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleCreateSuccess = (patientId: string) => {
    fetchWaitingList();
    if (isEditPatientMode) {
      setIsEditPatientMode(false);
      setEditingPatientData(null);
      handleSearch(searchTerm);
      return;
    }
    // Refresh patient data or select it
    supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedPatient(data);
          setShowTriageModal(true);
        }
      });
  };

  const handleEditPatient = (p: Patient) => {
    setEditingPatientData(p);
    setIsEditPatientMode(true);
    setIsPatientModalOpen(true);
    setActiveDropdown(null);
  };

  const handleCancelVisit = async (entry: QueueEntry) => {
    if (!confirm(`Voulez-vous annuler l'attente de ${entry.patients?.nom_complet} ?`)) return;
    
    try {
      const { error } = await supabase
        .from('file_attente')
        .update({ statut: 'Annulé' })
        .eq('id', entry.id);
      
      if (error) throw error;
      toast.success("Visite annulée 🗑️");
      fetchWaitingList();
    } catch (err: any) {
      toast.error("Erreur annulation: " + err.message);
    }
    setActiveDropdown(null);
  };

  const handleEditTriage = (entry: QueueEntry) => {
    setEditingQueueEntry(entry);
    setIsEditTriageMode(true);
    setSelectedPatient(entry.patients || null);
    setTriageData({
      motif: entry.motif || "",
      orientation: entry.orientation || "Consultation",
      service: entry.service || "Médecine Générale",
      urgence: entry.urgence ? "Urgence Vitale" : "Normale",
      personne_confiance: entry.personne_confiance || "",
      tension: entry.tension || "",
      temperature: entry.temperature || "",
      poids: entry.poids || "",
      pouls: entry.pouls || "",
      spo2: entry.spo2 || ""
    });
    setShowTriageModal(true);
    setActiveDropdown(null);
  };

  // Queue Data
  const [waitingList, setWaitingList] = useState<QueueEntry[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  // Triage Modal
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [triageData, setTriageData] = useState({
    motif: "",
    orientation: "Consultation",
    service: "Médecine Générale",
    urgence: "Normale",
    personne_confiance: "",
    tension: "",
    temperature: "",
    poids: "",
    pouls: "",
    spo2: ""
  });

  const services = ["Médecine Générale", "Pédiatrie", "Gynécologie", "Infirmerie/Soins", "Laboratoire", "Chirurgie"];

  useEffect(() => {
    // Check for query params
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === 'true') {
      setIsPatientModalOpen(true);
    }

    fetchWaitingList();
    // Realtime subscription
    const subscription = supabase
      .channel('file_attente_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'file_attente' }, () => {
        fetchWaitingList();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchWaitingList = async () => {
    setLoadingQueue(true);
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const { data, error } = await supabase
        .from('file_attente')
        .select('*, patients(*)')
        .gte('created_at', today.toISOString())
        .order('heure_arrivee', { ascending: true });
      
      if (error) {
          // Fallback sejours_actifs
          const { data: altData } = await supabase
            .from('sejours_actifs')
            .select('*, patients(*)')
            .gte('created_at', today.toISOString())
            .order('created_at', { ascending: true });
          setWaitingList(altData?.map(d => ({...d, heure_arrivee: d.created_at, motif: d.motif_visite, service: d.service || "Médecine Générale", urgence: d.urgence || false})) || []);
      } else {
          setWaitingList(data || []);
      }
    } catch (err) {
      console.error("Queue Fetch Error:", err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    if (val.length < 2) {
      setFoundPatients([]);
      return;
    }

    setSearching(true);
    try {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .ilike('nom_complet', `%${val}%`)
        .limit(5);
      setFoundPatients(data || []);
    } catch (err) {
      console.error("Search Error:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!selectedPatient) return;
    
    // Validation
    if (!triageData.motif) return toast.error("Le motif est obligatoire");
    if (!triageData.service) return toast.error("Le service est obligatoire");

    setSearching(true);
    
    const payload = {
        patient_id: selectedPatient.id,
        motif: triageData.motif,
        orientation: triageData.orientation,
        service: triageData.service,
        tension: triageData.tension,
        temperature: triageData.temperature,
        poids: triageData.poids,
        urgence: triageData.urgence === "Urgence Vitale", 
        heure_arrivee: isEditTriageMode ? editingQueueEntry?.heure_arrivee : new Date().toISOString(),
        statut: isEditTriageMode ? editingQueueEntry?.statut : "En attente",
        pouls: triageData.pouls,
        spo2: triageData.spo2,
        personne_confiance: triageData.personne_confiance
    };

    try {
      if (isEditTriageMode && editingQueueEntry) {
         const { error } = await supabase
          .from('file_attente')
          .update(payload)
          .eq('id', editingQueueEntry.id);
         if (error) throw error;
         toast.success("Triage mis à jour ! 🔄");
      } else {
        // On tente file_attente
        const { error } = await supabase.from('file_attente').insert([payload]);
        
        if (error) {
            console.error("file_attente_error", error);
            // Fallback sejours_actifs
            const { error: altError } = await supabase.from('sejours_actifs').insert([{
              patient_id: selectedPatient.id,
              motif_visite: triageData.motif,
              statut: "En attente",
              urgence: triageData.urgence === "Urgence Vitale"
            }]);
            if (altError) throw altError;
        }
        toast.success(`${selectedPatient.nom_complet} ajouté à la file d'attente ! ✨`);
      }
      
      setShowTriageModal(false);
      setSelectedPatient(null);
      setSearchTerm("");
      setFoundPatients([]);
      setIsEditTriageMode(false);
      setEditingQueueEntry(null);
      // Reset triage data
      setTriageData({
        motif: "",
        orientation: "Consultation",
        service: "Médecine Générale",
        urgence: "Normale",
        personne_confiance: "",
        tension: "",
        temperature: "",
        poids: "",
        pouls: "",
        spo2: ""
      });
      fetchWaitingList();
    } catch (err: any) {
      toast.error("Erreur admission: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  const printTicket = (entry: QueueEntry) => {
    // ... no changes to print ticket logic requested
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Ticket Admission - ${entry.patients?.nom_complet}</title>
          <style>
            @page { size: 80mm 200mm; margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 10mm; font-size: 12px; line-height: 1.4; color: #000; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5mm; margin-bottom: 5mm; }
            .clinic-name { font-weight: bold; font-size: 16px; margin: 0; }
            .ticket-info { margin-bottom: 5mm; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .value { font-size: 14px; margin-bottom: 3mm; display: block; }
            .urgency { border: 2px solid #000; padding: 2mm; text-align: center; font-weight: bold; margin-bottom: 5mm; }
            .footer { text-align: center; border-top: 1px dashed #000; padding-top: 5mm; margin-top: 10mm; font-size: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="clinic-name">CLINIQUE RIVERSIDE</p>
            <p>TICKET D'ADMISSION # ${entry.id.slice(0, 5).toUpperCase()}</p>
          </div>
          <div class="ticket-info">
            <span class="label">Patient</span>
            <span class="value">${entry.patients?.nom_complet}</span>
            
            <span class="label">Heure Arrivée</span>
            <span class="value">${new Date(entry.heure_arrivee).toLocaleTimeString()}</span>
            
            <span class="label">Service</span>
            <span class="value">${entry.service}</span>
            
            <span class="label">Motif</span>
            <span class="value">${entry.motif}</span>
          </div>
          ${entry.urgence ? '<div class="urgency">URGENT / VITAL</div>' : ''}
          <div class="footer">
            <p>Merci de patienter en salle d'attente.<br/>Votre santé est notre priorité.</p>
            <p>${new Date().toLocaleDateString()}</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-xl">
            <Clock size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight leading-tight">
              Centre d&apos;Admission <span className="text-riverside-red">& Triage</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">Accueil rapide & Orientation patients</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 px-6">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aujourd&apos;hui</p>
              <p className="text-xl font-black text-slate-900" suppressHydrationWarning>{waitingList.length} Patients</p>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div className="text-right">
              <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Urgences</p>
              <p className="text-xl font-black text-riverside-red" suppressHydrationWarning>{waitingList.filter(e => e.urgence).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Search & Quick Add */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-8">
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-100/50">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Identification Patient</h2>
               <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Search size={16} />
               </div>
            </div>

            <div className="relative mb-6">
              <input 
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher (Nom ou Téléphone)..."
                className="w-full pl-12 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-riverside-red transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-riverside-red animate-spin" size={20} />}
            </div>

            <div className="space-y-3">
              {foundPatients.map(p => (
                <div key={p.id} className="relative">
                  <div className="w-full p-5 bg-white border border-slate-50 rounded-2xl flex items-center justify-between hover:border-riverside-red hover:shadow-lg hover:shadow-red-500/5 transition-all group">
                    <div className="flex-1 text-left">
                      <p className="text-sm font-black text-slate-900 uppercase">{p.nom_complet}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{p.telephone || 'Aucun Tel'} • {p.type_assurance}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => {
                           setSelectedPatient(p);
                           setIsEditTriageMode(false);
                           setShowTriageModal(true);
                         }}
                         className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl hover:bg-riverside-red transition-all"
                       >
                         Triage
                       </button>
                       <div className="relative">
                         <button 
                           onClick={() => setActiveDropdown(activeDropdown === p.id ? null : p.id)}
                           className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-100"
                         >
                           <MoreVertical size={16} />
                         </button>

                         <AnimatePresence>
                           {activeDropdown === p.id && (
                             <>
                               <motion.div 
                                 initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                 animate={{ opacity: 1, scale: 1, y: 0 }}
                                 exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                 className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                               >
                                  <button 
                                    onClick={() => router.push(`/patients?id=${p.id}`)}
                                    className="w-full p-4 flex items-center gap-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all uppercase"
                                  >
                                    <Eye size={14} className="text-blue-500" /> Voir Dossier
                                  </button>
                                  <button 
                                    onClick={() => handleEditPatient(p)}
                                    className="w-full p-4 flex items-center gap-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all uppercase border-t border-slate-50"
                                  >
                                    <Edit2 size={14} className="text-amber-500" /> Modifier Identité
                                  </button>
                               </motion.div>
                               <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                             </>
                           )}
                         </AnimatePresence>
                       </div>
                    </div>
                  </div>
                </div>
              ))}

              {!searchTerm && !searching && foundPatients.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                  <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest leading-relaxed">
                    Saisissez un nom pour rechercher<br/>ou créez un nouveau dossier
                  </p>
                </div>
              )}

              {searchTerm.length >= 2 && !searching && foundPatients.length === 0 && (
                <motion.button 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setInitialNameForModal(searchTerm);
                    setIsPatientModalOpen(true);
                  }}
                  className="w-full p-8 border-2 border-dashed border-red-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-riverside-red hover:bg-red-50 transition-all font-sans"
                >
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                    <UserPlus size={28} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest">Créer le dossier pour</p>
                    <p className="text-sm font-black mt-1 uppercase tracking-tight text-slate-900">&quot;{searchTerm}&quot;</p>
                  </div>
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Waiting List */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-8">
           <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-xl shadow-slate-100/50">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Salle d&apos;Attente</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1" suppressHydrationWarning>File active du {new Date().toLocaleDateString()}</p>
                </div>
                <button 
                  onClick={fetchWaitingList}
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                >
                  <Zap size={18} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Heure</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Motif & Service</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {waitingList.map((entry) => (
                      <tr 
                        key={entry.id} 
                        className={cn(
                          "group hover:bg-slate-50/30 transition-all",
                          entry.urgence && "bg-red-50/30 border-l-4 border-l-riverside-red",
                          entry.statut === "Annulé" && "opacity-40 grayscale"
                        )}
                      >
                        <td className="px-8 py-6">
                           <span className="text-xs font-black text-slate-400 italic font-mono uppercase" suppressHydrationWarning>
                             {new Date(entry.heure_arrivee).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                          <div>
                            <p className={cn("text-sm font-black text-slate-900 uppercase", entry.urgence && "text-riverside-red")}>{entry.patients?.nom_complet}</p>
                            <div className="flex items-center gap-2 mt-1">
                               {entry.urgence && entry.statut !== "Annulé" && <div className="w-2 h-2 bg-riverside-red animate-ping rounded-full" />}
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">
                                 {entry.patients?.type_assurance}
                               </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded uppercase">
                                 {entry.orientation || "Consultation"}
                               </span>
                               <span className="text-[10px] font-black text-slate-900 uppercase">
                                 {entry.service}
                               </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight line-clamp-1 italic">{entry.motif}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            entry.statut === "En attente" ? "bg-slate-100 text-slate-500" : 
                            entry.statut === "Annulé" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {entry.statut}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => printTicket(entry)}
                              className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm group-hover:shadow-lg disabled:opacity-0"
                              disabled={entry.statut === "Annulé"}
                            >
                              <Printer size={16} />
                            </button>

                            <div className="relative">
                              <button 
                                onClick={() => setActiveDropdown(activeDropdown === entry.id ? null : entry.id)}
                                disabled={entry.statut === "Annulé"}
                                className="w-10 h-10 bg-white border border-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all shadow-sm disabled:opacity-0"
                              >
                                <MoreVertical size={16} />
                              </button>

                              <AnimatePresence>
                                {activeDropdown === entry.id && (
                                  <>
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                      className="absolute right-0 bottom-12 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                                    >
                                       <button 
                                         onClick={() => handleEditTriage(entry)}
                                         className="w-full p-4 flex items-center gap-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all uppercase"
                                       >
                                         <Edit2 size={14} className="text-amber-500" /> Modifier Triage
                                       </button>
                                       <button 
                                         onClick={() => handleCancelVisit(entry)}
                                         className="w-full p-4 flex items-center gap-3 text-[10px] font-black text-red-500 hover:bg-red-50 transition-all uppercase border-t border-slate-50"
                                       >
                                         <Trash2 size={14} /> Annuler Visite
                                       </button>
                                    </motion.div>
                                    <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {waitingList.length === 0 && !loadingQueue && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                           <div className="flex flex-col items-center gap-4 text-slate-300">
                              <User size={48} className="opacity-20" />
                              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Aucun patient enregistré aujourd&apos;hui</p>
                           </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      </div>

      {/* Triage Modal */}
      <AnimatePresence>
        {showTriageModal && selectedPatient && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowTriageModal(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[1001]" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, x: "-50%", y: "-40%" }} 
              animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }} 
              exit={{ scale: 0.95, opacity: 0, x: "-50%", y: "-40%" }} 
              className="fixed top-1/2 left-1/2 w-[95%] max-w-2xl bg-white rounded-[3rem] z-[1002] p-0 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
               <div className="p-8 md:p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-riverside-red shadow-sm border border-slate-100">
                       {isEditTriageMode ? <Edit2 size={28} /> : <Stethoscope size={28} />}
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                         {isEditTriageMode ? "Mise à jour du Triage" : "Placement en File d'Attente"}
                       </h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                         Dossier : {selectedPatient.nom_complet}
                       </p>
                    </div>
                 </div>
                 <button 
                   onClick={() => {
                     setShowTriageModal(false);
                     setIsEditTriageMode(false);
                     setEditingQueueEntry(null);
                   }}
                   className="w-10 h-10 bg-white text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-riverside-red transition-all shadow-sm border border-slate-100"
                 >
                   <X size={20} />
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10">
                 {/* Section A : La Visite */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-6 bg-riverside-red rounded-full" />
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Section A : Détails de la Visite</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motif de la visite *</label>
                        <textarea 
                          required
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-riverside-red focus:bg-white transition-all resize-none"
                          rows={3}
                          placeholder="Décrivez brièvement le motif..."
                          value={triageData.motif}
                          onChange={e => setTriageData({...triageData, motif: e.target.value})}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service de destination *</label>
                        <select 
                          required
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-riverside-red focus:bg-white appearance-none cursor-pointer"
                          value={triageData.service}
                          onChange={e => setTriageData({...triageData, service: e.target.value})}
                        >
                          {services.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Niveau d&apos;Urgence</label>
                        <select 
                          className={cn(
                            "w-full p-5 border rounded-2xl text-[11px] font-black uppercase outline-none transition-all cursor-pointer appearance-none",
                            triageData.urgence === "Urgence Vitale" ? "bg-red-50 border-red-200 text-riverside-red" : "bg-slate-50 border-slate-100 text-slate-900"
                          )}
                          value={triageData.urgence}
                          onChange={e => setTriageData({...triageData, urgence: e.target.value})}
                        >
                          <option value="Normale">Normale</option>
                          <option value="Prioritaire">Prioritaire</option>
                          <option value="Urgence Vitale">Urgence Vitale</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Personne de confiance du jour (Optionnel)</label>
                        <input 
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-riverside-red focus:bg-white transition-all uppercase"
                          placeholder="Nom & Contact de l'accompagnateur"
                          value={triageData.personne_confiance}
                          onChange={e => setTriageData({...triageData, personne_confiance: e.target.value})}
                        />
                      </div>
                    </div>
                 </div>

                 {/* Section B : Constantes Vitales */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Section B : Constantes Vitales</h4>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                          <Activity size={10} /> Tension (mmHg)
                        </label>
                        <input 
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-center outline-none focus:border-riverside-red focus:bg-white"
                          placeholder="12/8"
                          value={triageData.tension}
                          onChange={e => setTriageData({...triageData, tension: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                          <Thermometer size={10} /> Temp. (°C)
                        </label>
                        <input 
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-center outline-none focus:border-riverside-red focus:bg-white"
                          placeholder="37.5"
                          value={triageData.temperature}
                          onChange={e => setTriageData({...triageData, temperature: e.target.value})}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                          <Scale size={10} /> Poids (Kg)
                        </label>
                        <input 
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-center outline-none focus:border-riverside-red focus:bg-white"
                          placeholder="75"
                          value={triageData.poids}
                          onChange={e => setTriageData({...triageData, poids: e.target.value})}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                          <Activity size={10} className="text-red-400" /> Pouls (bpm)
                        </label>
                        <input 
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-center outline-none focus:border-riverside-red focus:bg-white"
                          placeholder="80"
                          value={triageData.pouls}
                          onChange={e => setTriageData({...triageData, pouls: e.target.value})}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                          <Zap size={10} className="text-blue-400" /> SpO2 (%)
                        </label>
                        <input 
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-center outline-none focus:border-riverside-red focus:bg-white"
                          placeholder="98"
                          value={triageData.spo2}
                          onChange={e => setTriageData({...triageData, spo2: e.target.value})}
                        />
                      </div>
                    </div>
                 </div>
               </div>

               <div className="p-8 md:p-10 bg-slate-50 border-t border-slate-100 flex gap-6">
                 <button 
                   onClick={() => {
                      setShowTriageModal(false);
                      setIsEditTriageMode(false);
                   }}
                   className="flex-1 py-5 bg-white border border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                 >
                   Annuler
                 </button>
                 <button 
                   disabled={searching}
                   onClick={handleAddToQueue}
                   className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-riverside-red transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                   {searching ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                   {isEditTriageMode ? "Modifier le Triage" : "Confirmer l'Arrivée"}
                 </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <NewPatientModal 
        isOpen={isPatientModalOpen}
        onClose={() => {
          setIsPatientModalOpen(false);
          setIsEditPatientMode(false);
          setEditingPatientData(null);
        }}
        isEditMode={isEditPatientMode}
        initialData={editingPatientData}
        initialName={initialNameForModal}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

export default function AdmissionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-riverside-red" size={48} />
      </div>
    }>
      <div className="p-4 md:p-8">
        <AdmissionDashboard />
      </div>
    </Suspense>
  );
}
