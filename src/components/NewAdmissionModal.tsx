"use client";

import React, { useState } from "react";
import { 
  X, 
  User, 
  Phone, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Loader2,
  CheckCircle,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";

interface NewAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewAdmissionModal({ isOpen, onClose, onSuccess }: NewAdmissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nom_complet: "",
    telephone: "",
    type_assurance: "Cash",
    numero_assurance: "",
    alertes_medicales: "",
    motif_visite: "",
  });

  const [assurances, setAssurances] = useState<any[]>([]);
  const [loadingAssurances, setLoadingAssurances] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const fetchAssurances = async () => {
        setLoadingAssurances(true);
        try {
          const { data } = await supabase.from('assurances').select('nom').order('nom');
          if (data && data.length > 0) {
            setAssurances(data);
          } else {
            console.warn("[Admission] Aucune assurance trouvée dans la table.");
          }
        } catch (err) {
          console.error("Erreur chargement assurances:", err);
        } finally {
          setLoadingAssurances(false);
        }
      };
      fetchAssurances();
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ÉTAPE A : Création du patient selon le schéma réel
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .insert([{
          nom_complet: formData.nom_complet,
          telephone: formData.telephone,
          type_assurance: formData.type_assurance,
          numero_assurance: formData.numero_assurance,
          alertes_medicales: formData.alertes_medicales
        }])
        .select()
        .single();

      if (patientError) {
        alert(`Erreur lors de la création du dossier patient: ${patientError.message}`);
        throw patientError;
      }
      console.log("[Admission] Nouveau patient créé avec succès ID:", patientData.id);

      // ÉTAPE B : Création du séjour actif (File d'attente)
      const { error: sejourError } = await supabase
        .from("sejours_actifs")
        .insert([{
          patient_id: patientData.id,
          statut: "En attente",
          motif_visite: formData.motif_visite
        }]);

      if (sejourError) {
        alert(`Erreur lors de l'admission en file d'attente: ${sejourError.message}`);
        throw sejourError;
      }
      console.log("[Admission] Séjour actif créé pour patient ID:", patientData.id);

      // Succès
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);

    } catch (err: any) {
      console.error("[Admission] Erreur lors de la soumission:", err);
      setError(err.message || "Une erreur est survenue lors de l'admission.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    setFormData({
      nom_complet: "",
      telephone: "",
      type_assurance: "Cash",
      numero_assurance: "",
      alertes_medicales: "",
      motif_visite: "",
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full max-w-lg bg-white shadow-2xl z-[101] overflow-y-auto border-l border-slate-100"
          >
            <div className="p-8 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-10 bg-slate-50 -m-8 p-8 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Admission Riverside</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Enregistrement Patient et File d&apos;Attente</p>
                </div>
                <button 
                  onClick={handleClose}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 shadow-sm"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {success ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-red-50 text-riverside-red rounded-2xl flex items-center justify-center shadow-lg shadow-red-100 border border-red-100"
                  >
                    <CheckCircle size={40} />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Admission Validée</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{formData.nom_complet} est en file d&apos;attente</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 space-y-8 mt-10">
                  {/* Section 1: Infos Patient */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-[9px] font-black text-slate-900 uppercase tracking-widest pb-3 border-b border-slate-100">
                      <User size={14} className="text-riverside-red" />
                      État Civil & Contact
                    </div>
                    
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Complet du Patient</label>
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-riverside-red transition-colors" size={16} />
                          <input 
                            required
                            type="text"
                            name="nom_complet"
                            value={formData.nom_complet}
                            onChange={handleChange}
                            placeholder="EX: JEAN DUPONT"
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-riverside-red outline-none transition-all text-xs font-black uppercase tracking-tight"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                          <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-riverside-red transition-colors" size={16} />
                            <input 
                              required
                              type="tel"
                              name="telephone"
                              value={formData.telephone}
                              onChange={handleChange}
                              placeholder="6XX XX XX XX"
                              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-riverside-red outline-none transition-all text-xs font-black tracking-tight"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Couverture</label>
                          <div className="relative group">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-riverside-red transition-colors" size={16} />
                            <select 
                              required
                              name="type_assurance"
                              value={formData.type_assurance}
                              onChange={handleChange}
                              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-riverside-red outline-none transition-all text-xs font-black uppercase tracking-tight appearance-none cursor-pointer"
                            >
                              <option value="Cash">CASH / PRIVÉ</option>
                              {loadingAssurances ? (
                                <option disabled>SYNC PARTENAIRES...</option>
                              ) : (
                                <>
                                  {assurances.map(a => (
                                    <option key={a.nom} value={a.nom}>{a.nom}</option>
                                  ))}
                                </>
                              )}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Matricule Assurance</label>
                        <input 
                          type="text"
                          name="numero_assurance"
                          value={formData.numero_assurance}
                          onChange={handleChange}
                          placeholder="FACULTATIF"
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-riverside-red outline-none transition-all text-xs font-black uppercase tracking-tight"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Alertes Médicales & Allergies</label>
                        <div className="relative group">
                          <AlertTriangle className="absolute left-4 top-4 text-slate-400 group-focus-within:text-riverside-red transition-colors" size={16} />
                          <textarea 
                            name="alertes_medicales"
                            value={formData.alertes_medicales}
                            onChange={handleChange}
                            rows={2}
                            placeholder="SIGNALER TOUTE ALLERGIE MAJEURE..."
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-riverside-red outline-none transition-all text-xs font-black uppercase tracking-tight resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Infos Séjour */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[9px] font-black text-slate-900 uppercase tracking-widest pb-3 border-b border-slate-100">
                      <FileText size={14} className="text-riverside-red" />
                      Signes & Motif Admission
                    </div>

                    <div className="group">
                      <textarea 
                        required
                        name="motif_visite"
                        value={formData.motif_visite}
                        onChange={handleChange}
                        rows={3}
                        placeholder="DÉTAILLEZ LE MOTIF DE LA VISITE OU LES SYMPTÔMES..."
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-riverside-red outline-none transition-all text-xs font-black uppercase tracking-tight resize-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-black uppercase flex items-start gap-3"
                    >
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-8 mt-auto flex gap-3">
                    <button 
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-3.5 border border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all active:scale-95"
                    >
                      Annuler
                    </button>
                    <button 
                      disabled={loading}
                      type="submit"
                      className="flex-[2] py-3.5 bg-riverside-red text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-red-100 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          SYNC...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Lancer l&apos;Admission
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
