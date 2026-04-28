"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Shield, 
  MoreVertical,
  Loader2,
  Calendar,
  Filter,
  Eye,
  Pencil,
  Activity,
  LogOut,
  Stethoscope,
  Bed,
  CheckCircle2,
  X,
  Plus
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Patient {
  id: string;
  nom_complet: string;
  telephone: string;
  type_assurance: string;
  sexe: string;
  age: number;
  profession?: string;
  societe?: string;
  numero_assurance?: string;
  alertes_medicales?: string;
  created_at: string;
  sejours_actifs?: {
    id: string;
    statut: string;
    motif_visite: string;
    service_actuel?: string;
  }[];
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filtres
  const [sexFilter, setSexFilter] = useState("Tous");
  const [assuranceFilter, setAssuranceFilter] = useState("Tous");
  
  // Menu d'actions
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedSejourDetail, setSelectedSejourDetail] = useState<Patient | null>(null);
  
  // Modal Gestion Séjour
  const [managingPatient, setManagingPatient] = useState<Patient | null>(null);
  const [isUpdatingStay, setIsUpdatingStay] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*, sejours_actifs(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error("Erreur chargement patients:", err);
      toast.error("Échec du chargement des patients");
    } finally {
      setLoading(false);
    }
  };

  const getActiveSejour = (patient: Patient) => {
    return patient.sejours_actifs?.find(s => s.statut !== 'Terminé' && s.statut !== 'Annulé');
  };

  const updateStayStatus = async (sejourId: string, newStatus: string) => {
    try {
      setIsUpdatingStay(true);
      const { error } = await supabase
        .from('sejours_actifs')
        .update({ statut: newStatus })
        .eq('id', sejourId);

      if (error) throw error;
      toast.success(`Patient transféré en ${newStatus}`);
      setManagingPatient(null);
      fetchPatients();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour du séjour");
      console.error(err);
    } finally {
      setIsUpdatingStay(false);
    }
  };

  const closeStay = async (sejourId: string) => {
    if (!confirm("Voulez-vous clôturer ce séjour ? Le patient ne sera plus visible sur le flux actif.")) return;
    try {
      setIsUpdatingStay(true);
      const { error } = await supabase
        .from('sejours_actifs')
        .update({ statut: 'Terminé' })
        .eq('id', sejourId);

      if (error) throw error;
      toast.success("Séjour clôturé avec succès");
      setManagingPatient(null);
      fetchPatients();
    } catch (err) {
      toast.error("Erreur lors de la clôture");
    } finally {
      setIsUpdatingStay(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.telephone?.includes(searchTerm);
    const matchesSex = sexFilter === "Tous" || p.sexe === sexFilter;
    const matchesAssurance = assuranceFilter === "Tous" || p.type_assurance === assuranceFilter;
    
    return matchesSearch && matchesSex && matchesAssurance;
  });

  const uniqueAssurances = Array.from(new Set(patients.map(p => p.type_assurance))).filter(Boolean).sort();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <Users className="text-riverside-red" size={24} />
            Base Patients Riverside
          </h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Gestion et Suivi des Dossiers Médicaux</p>
        </div>
        
        <button 
          onClick={() => router.push("/admission")}
          className="bg-riverside-red text-white px-6 py-2.5 rounded-lg shadow-lg shadow-red-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] transition-all active:scale-95"
        >
          <UserPlus size={16} />
          Nouveau Patient
        </button>
      </div>

      {/* Filters & Stats section */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-riverside-red transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="RECHERCHER UN PATIENT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-riverside-red font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
          />
        </div>

        <div className="md:col-span-1 border border-slate-100 rounded-xl bg-white px-4 flex items-center shadow-sm">
          <Filter size={12} className="text-slate-400 mr-2" />
          <select 
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value)}
            className="w-full h-full bg-transparent outline-none font-black text-[9px] uppercase tracking-widest text-slate-600 cursor-pointer"
          >
            <option value="Tous">SEXE: TOUS</option>
            <option value="M">MASCULIN</option>
            <option value="F">FÉMININ</option>
          </select>
        </div>

        <div className="md:col-span-1 border border-slate-100 rounded-xl bg-white px-4 flex items-center shadow-sm">
          <Shield size={12} className="text-slate-400 mr-2" />
          <select 
            value={assuranceFilter}
            onChange={(e) => setAssuranceFilter(e.target.value)}
            className="w-full h-full bg-transparent outline-none font-black text-[9px] uppercase tracking-widest text-slate-600 cursor-pointer"
          >
            <option value="Tous">ASSURANCE: TOUTES</option>
            {uniqueAssurances.map(a => (
              <option key={a} value={a}>{a.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="bg-white p-4 border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm md:col-span-1">
          <div className="w-8 h-8 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center border border-slate-100">
            <Users size={14} />
          </div>
          <div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Base</p>
            <p className="text-lg font-black text-slate-900 leading-none">{patients.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm md:col-span-1">
          <div className="w-8 h-8 bg-red-50 text-riverside-red rounded-xl flex items-center justify-center border border-red-100">
            <Shield size={14} />
          </div>
          <div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Actifs</p>
            <p className="text-lg font-black text-riverside-red leading-none">
              {patients.filter(p => getActiveSejour(p)).length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Table section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Identité Patient</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Contact</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Couverture</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Enregistrement</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Loader2 className="animate-spin text-riverside-red mx-auto" size={24} />
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-4">Accès base de données...</p>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-300 italic text-[10px] uppercase font-black tracking-widest">Aucun patient répertorié.</td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 font-black text-[10px] uppercase shadow-inner group-hover:bg-white group-hover:border-riverside-red transition-all">
                          {patient.nom_complet.substring(0, 2)}
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{patient.nom_complet}</p>
                          {(() => {
                            const sejour = getActiveSejour(patient);
                            if (sejour) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse outline outline-2 outline-emerald-100" />
                                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                                    EN {sejour.statut.toUpperCase()}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="inline-flex items-center gap-2 text-slate-600 text-[10px] font-bold uppercase">
                          <Phone size={10} className="text-riverside-red" />
                          {patient.telephone || "SANS NUMERO"}
                        </div>
                        <p className="text-[8px] text-slate-300 font-black uppercase tracking-tighter">{patient.sexe === 'M' ? 'MASCULIN' : 'FÉMININ'} • {patient.age} ANS</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={cn(
                          "px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-[0.1em] border shadow-xs",
                          patient.type_assurance === "Cash" ? "bg-slate-50 text-slate-600 border-slate-100" : "bg-red-50 text-riverside-red border-red-100"
                        )}>
                          {patient.type_assurance}
                        </span>
                        {patient.numero_assurance && (
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">REF: {patient.numero_assurance}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-50 px-3 py-1 rounded-lg">
                        <Calendar size={10} />
                        {new Date(patient.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === patient.id ? null : patient.id)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100"
                      >
                        <MoreVertical size={14} className={cn("transition-colors", activeMenuId === patient.id ? "text-riverside-red" : "text-slate-400")} />
                      </button>

                      <AnimatePresence>
                        {activeMenuId === patient.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden py-2"
                            >
                              <button 
                                onClick={() => {
                                  setSelectedSejourDetail(patient);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
                              >
                                <Eye size={12} className="text-slate-400" />
                                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Voir le Dossier</span>
                              </button>
                              <button 
                                onClick={() => router.push(`/admission?edit=${getActiveSejour(patient)?.id || ""}`)}
                                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
                              >
                                <Pencil size={12} className="text-slate-400" />
                                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Modifier</span>
                              </button>
                              <div className="h-[px] bg-slate-50 my-1 mx-2" />
                              <button 
                                onClick={() => {
                                  setManagingPatient(patient);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-red-50 transition-colors group"
                              >
                                <Activity size={12} className="text-slate-400 group-hover:text-riverside-red" />
                                <span className="text-[9px] font-black uppercase text-slate-600 group-hover:text-riverside-red tracking-widest">Gérer le Séjour</span>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale: Gérer le Séjour */}
      <AnimatePresence>
        {managingPatient && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setManagingPatient(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed inset-0 m-auto w-full max-w-lg h-fit bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden border border-slate-100">
               <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Gestion du Séjour</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">{managingPatient.nom_complet}</p>
                  </div>
                  <button onClick={() => setManagingPatient(null)} className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-50 rounded-xl border border-slate-100 transition-all text-slate-400"><X size={18} /></button>
               </div>

               <div className="p-10 gap-6 flex flex-col">
                  {(() => {
                    const sejour = getActiveSejour(managingPatient);
                    if (!sejour) {
                      return (
                        <div className="text-center py-10 space-y-6">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                            <Activity size={32} className="text-slate-300" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aucun séjour actif pour ce patient.</p>
                            <p className="text-[9px] text-slate-400 mt-2 uppercase">Voulez-vous initier un nouveau parcours de soins ?</p>
                          </div>
                          <button 
                            onClick={() => router.push("/admission")}
                            className="w-full py-4 bg-riverside-red text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                          >
                            <Plus size={16} />
                            Créer une Nouvelle Admission
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-8">
                        <div className="flex items-center gap-4 bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm"><Activity size={20} /></div>
                           <div>
                             <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Status Actuel</p>
                             <p className="text-xs font-black text-emerald-800 uppercase">EN {sejour.statut.toUpperCase()}</p>
                           </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Transferts de Service</p>
                          <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => updateStayStatus(sejour.id, 'Consultation')} disabled={isUpdatingStay} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-all group">
                              <div className="flex items-center gap-4">
                                <Stethoscope size={16} className="text-slate-400 group-hover:text-riverside-red" />
                                <span className="text-[10px] font-black uppercase text-slate-600">Aiguiller en Consultation</span>
                              </div>
                              <Plus size={14} className="text-slate-300" />
                            </button>
                            <button onClick={() => updateStayStatus(sejour.id, 'Infirmerie')} disabled={isUpdatingStay} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-all group">
                              <div className="flex items-center gap-4">
                                <Activity size={16} className="text-slate-400 group-hover:text-riverside-red" />
                                <span className="text-[10px] font-black uppercase text-slate-600">Envoyer en Soins / Infirmerie</span>
                              </div>
                              <Plus size={14} className="text-slate-300" />
                            </button>
                            <button onClick={() => updateStayStatus(sejour.id, 'Hospitalisation')} disabled={isUpdatingStay} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-all group">
                              <div className="flex items-center gap-4">
                                <Bed size={16} className="text-slate-400 group-hover:text-riverside-red" />
                                <span className="text-[10px] font-black uppercase text-slate-600">Transférer en Hospitalisation</span>
                              </div>
                              <Plus size={14} className="text-slate-300" />
                            </button>
                          </div>
                        </div>

                        <button 
                          onClick={() => closeStay(sejour.id)}
                          disabled={isUpdatingStay}
                          className="w-full py-4 border-2 border-slate-100 text-slate-400 hover:border-riverside-red hover:text-riverside-red rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                        >
                          <LogOut size={16} />
                          Clôturer définitivement le Séjour
                        </button>
                      </div>
                    );
                  })()}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Details Modal (Reuse design from Dashboard) */}
      <AnimatePresence>
        {selectedSejourDetail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSejourDetail(null)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed inset-0 m-auto w-full max-w-xl h-fit bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden border border-slate-100">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Dossier Patient</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Identité Riverside Medical Center</p>
                </div>
                <button onClick={() => setSelectedSejourDetail(null)} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <div className="p-10 space-y-8 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nom Complet</p>
                    <p className="text-xs font-black text-slate-800 uppercase">{selectedSejourDetail.nom_complet}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sexe / Age</p>
                    <p className="text-xs font-black text-slate-800 uppercase">{selectedSejourDetail.sexe === 'M' ? 'Masculin' : 'Féminin'} • {selectedSejourDetail.age} ans</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</p>
                    <p className="text-xs font-bold text-slate-800">{selectedSejourDetail.telephone || "N/A"}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assurance</p>
                    <p className="text-xs font-black text-emerald-600 uppercase italic">{selectedSejourDetail.type_assurance}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profession</p>
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{selectedSejourDetail.profession || "N/A"}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Société</p>
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{selectedSejourDetail.societe || "N/A"}</p>
                  </div>
                </div>
                {selectedSejourDetail.alertes_medicales && (
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                    <p className="text-[9px] font-black text-riverside-red uppercase tracking-widest mb-2 flex items-center gap-2 italic">
                      <Activity size={10} /> Alertes Médicales
                    </p>
                    <p className="text-[10px] font-bold text-red-900 leading-relaxed uppercase">{selectedSejourDetail.alertes_medicales}</p>
                  </div>
                )}
              </div>
              <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex justify-end">
                <button onClick={() => setSelectedSejourDetail(null)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all">Fermer</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
