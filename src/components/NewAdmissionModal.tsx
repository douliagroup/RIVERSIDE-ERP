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

      if (patientError) throw patientError;
      console.log("[Admission] Nouveau patient créé avec succès ID:", patientData.id);

      // ÉTAPE B : Création du séjour actif (File d'attente)
      const { error: sejourError } = await supabase
        .from("sejours_actifs")
        .insert([{
          patient_id: patientData.id,
          statut: "En attente",
          motif_visite: formData.motif_visite
        }]);

      if (sejourError) throw sejourError;
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
            className="fixed right-0 top-0 h-screen w-full max-w-lg bg-white shadow-2xl z-[101] overflow-y-auto"
          >
            <div className="p-8 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Nouvelle Admission</h2>
                  <p className="text-sm text-slate-500">Enregistrement d&apos;un nouveau patient</p>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              {success ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle size={40} />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Admission Réussie</h3>
                    <p className="text-slate-500 mt-2">Le patient a été ajouté à la file d&apos;attente.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 space-y-8">
                  {/* Section 1: Infos Patient */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">
                      <User size={12} />
                      Informations Patient
                    </div>
                    
                    <div className="space-y-4">
                      <div className="group">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nom Complet</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            required
                            type="text"
                            name="nom_complet"
                            value={formData.nom_complet}
                            onChange={handleChange}
                            placeholder="ex: Jean Dupont"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-riverside-red/20 focus:border-riverside-red outline-none transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="group">
                          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Téléphone</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              required
                              type="tel"
                              name="telephone"
                              value={formData.telephone}
                              onChange={handleChange}
                              placeholder="ex: 699 00 00 00"
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-riverside-red/20 focus:border-riverside-red outline-none transition-all text-sm"
                            />
                          </div>
                        </div>

                        <div className="group">
                          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Assurance</label>
                          <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                              required
                              name="type_assurance"
                              value={formData.type_assurance}
                              onChange={handleChange}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-riverside-red/20 focus:border-riverside-red outline-none transition-all text-sm appearance-none cursor-pointer font-bold"
                            >
                              <option value="Cash">CASH (Paiement Direct)</option>
                              {loadingAssurances ? (
                                <option disabled>Chargement des assureurs...</option>
                              ) : (
                                <>
                                  {assurances.map(a => (
                                    <option key={a.nom} value={a.nom}>{a.nom}</option>
                                  ))}
                                  {assurances.length === 0 && (
                                    <option disabled>Aucun partenaire trouvé</option>
                                  )}
                                </>
                              )}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="group">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Numéro d&apos;Assurance (si applicable)</label>
                        <input 
                          type="text"
                          name="numero_assurance"
                          value={formData.numero_assurance}
                          onChange={handleChange}
                          placeholder="ex: POL-882299"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-riverside-red/20 focus:border-riverside-red outline-none transition-all text-sm"
                        />
                      </div>

                      <div className="group">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Alertes / Allergies (Optionnel)</label>
                        <div className="relative">
                          <AlertTriangle className="absolute left-3 top-3 text-slate-400" size={18} />
                          <textarea 
                            name="alertes_medicales"
                            value={formData.alertes_medicales}
                            onChange={handleChange}
                            rows={2}
                            placeholder="ex: Allergie à la pénicilline..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-riverside-red/20 focus:border-riverside-red outline-none transition-all text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Infos Séjour */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">
                      <FileText size={12} />
                      Motif de la Visite
                    </div>

                    <div className="group">
                      <textarea 
                        required
                        name="motif_visite"
                        value={formData.motif_visite}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Quels sont les symptômes ou le motif de consultation ?"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-riverside-red/20 focus:border-riverside-red outline-none transition-all text-sm resize-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start gap-3"
                    >
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-8 mt-auto flex gap-3">
                    <button 
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95 text-sm"
                    >
                      Annuler
                    </button>
                    <button 
                      disabled={loading}
                      type="submit"
                      className="flex-[2] py-3.5 bg-riverside-red text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-riverside-red-hover transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 text-sm"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <Plus size={18} />
                          Confirmer l&apos;Admission
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
