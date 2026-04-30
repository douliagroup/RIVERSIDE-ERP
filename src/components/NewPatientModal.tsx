"use client";

import React, { useState } from "react";
import { 
  X, 
  User, 
  Phone, 
  Calendar, 
  Shield, 
  Loader2, 
  CheckCircle2, 
  Plus 
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patientId: string) => void;
  initialName?: string;
  isEditMode?: boolean;
  initialData?: any;
}

export default function NewPatientModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialName = "", 
  isEditMode = false, 
  initialData 
}: NewPatientModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nom_complet: "",
    telephone: "",
    sexe: "M",
    date_naissance: "",
    age: "",
    type_assurance: "Cash",
    nom_assurance: "",
    profession: "",
    societe: "",
    quartier: "",
    contact_urgence: ""
  });

  React.useEffect(() => {
    if (isEditMode && initialData) {
      setForm({
        nom_complet: initialData.nom_complet || "",
        telephone: initialData.telephone || "",
        sexe: initialData.sexe || "M",
        date_naissance: initialData.date_naissance || "",
        age: initialData.age?.toString() || "",
        type_assurance: initialData.type_assurance || "Cash",
        nom_assurance: initialData.numero_assurance || "", 
        profession: initialData.profession || "",
        societe: initialData.societe || "",
        quartier: initialData.quartier || "",
        contact_urgence: initialData.accompagnateur || ""
      });
    } else if (initialName) {
      setForm(prev => ({ ...prev, nom_complet: initialName.toUpperCase() }));
    } else {
      // Reset form when opening for new patient
      setForm({
        nom_complet: "",
        telephone: "",
        sexe: "M",
        date_naissance: "",
        age: "",
        type_assurance: "Cash",
        nom_assurance: "",
        profession: "",
        societe: "",
        quartier: "",
        contact_urgence: ""
      });
    }
  }, [initialName, isEditMode, initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_complet) return toast.error("Le nom complet est obligatoire");
    if (!form.telephone) return toast.error("Le numéro de téléphone est obligatoire");

    setSubmitting(true);
    try {
      const payload = {
        nom_complet: form.nom_complet.toUpperCase(),
        telephone: form.telephone,
        sexe: form.sexe,
        date_naissance: form.date_naissance || null,
        age: form.age ? parseInt(form.age) : null,
        type_assurance: form.type_assurance,
        numero_assurance: form.nom_assurance,
        profession: form.profession,
        societe: form.societe,
        quartier: form.quartier,
        accompagnateur: form.contact_urgence,
        statut: "Actif"
      };

      if (isEditMode && initialData?.id) {
        const { error } = await supabase
          .from('patients')
          .update(payload)
          .eq('id', initialData.id);
        
        if (error) throw error;
        toast.success("Dossier patient mis à jour ! 🔄");
        onSuccess(initialData.id);
      } else {
        const { data, error } = await supabase
          .from('patients')
          .insert([payload])
          .select()
          .single();
        
        if (error) throw error;
        toast.success("Nouveau dossier généré ! ✨");
        onSuccess(data.id);
      }
      
      onClose();
    } catch (err: any) {
      console.error("Supabase Error:", err);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const assurances = ["ZENITHE", "CHANAS ASSURANCE", "WILLIS TOWER ASSURANCE", "ASCOMA ASSURANCE", "PASS 24 ASSURANCE", "AXA ASSURANCE", "GMC", "BICEC"];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row"
        >
          {/* Left Panel: Visual/Context */}
          <div className="hidden md:flex w-1/3 bg-slate-900 p-10 flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-riverside-red/10 rounded-full -mr-32 -mt-32 blur-3xl" />
             <div className="relative z-10">
                <div className="w-16 h-16 bg-riverside-red rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-red-500/20">
                   <User size={32} />
                </div>
                <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter">Nouveau<br/>Dossier</h2>
                <p className="text-slate-400 text-xs mt-4 font-medium">Standard Clinique Riverside - Qualité & Rapidité.</p>
             </div>
             <div className="relative z-10 border-t border-slate-800 pt-8 mt-8">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aide</p>
                <p className="text-[11px] text-slate-400 mt-2 font-bold italic">&quot;Chaque donnée compte pour un suivi médical d&apos;exception.&quot;</p>
             </div>
          </div>

          <div className="flex-1 p-8 md:p-12 max-h-[90vh] overflow-y-auto bg-slate-50/30">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Fiche Administrative</h3>
                <p className="text-[10px] font-black text-riverside-red uppercase tracking-widest mt-1">Identification & Couverture</p>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 bg-white text-slate-400 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-riverside-red transition-all shadow-sm border border-slate-100"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section A: État Civil */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-1.5 h-6 bg-riverside-red rounded-full" />
                   <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Section A : État Civil</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Complet du Patient *</label>
                    <input 
                      autoFocus
                      required
                      value={form.nom_complet}
                      onChange={(e) => setForm({...form, nom_complet: e.target.value.toUpperCase()})}
                      placeholder="Ex: TCHOKOUTE Jean Philippe"
                      className="w-full p-5 bg-white border border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-riverside-red focus:shadow-lg focus:shadow-red-500/5 transition-all uppercase placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexe</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button
                         type="button"
                         onClick={() => setForm({...form, sexe: "M"})}
                         className={cn(
                           "py-4 rounded-2xl text-[10px] font-black uppercase transition-all border",
                           form.sexe === "M" ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-400 border-slate-200"
                         )}
                       >
                         Masculin
                       </button>
                       <button
                         type="button"
                         onClick={() => setForm({...form, sexe: "F"})}
                         className={cn(
                           "py-4 rounded-2xl text-[10px] font-black uppercase transition-all border",
                           form.sexe === "F" ? "bg-riverside-red text-white border-riverside-red shadow-lg shadow-red-200" : "bg-white text-slate-400 border-slate-200"
                         )}
                       >
                         Féminin
                       </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                       Âge / Date de Naissance
                       <span className="text-[9px] italic text-slate-300 lowercase font-bold">Anniversaire DOULIA Love 🎂</span>
                    </label>
                    <div className="flex gap-3">
                      <input 
                        placeholder="Âge"
                        value={form.age}
                        onChange={(e) => setForm({...form, age: e.target.value})}
                        className="w-20 p-5 bg-white border border-slate-100 rounded-2xl text-sm font-black text-center outline-none focus:border-riverside-red"
                      />
                      <input 
                        type="date"
                        value={form.date_naissance}
                        onChange={(e) => setForm({...form, date_naissance: e.target.value})}
                        className="flex-1 p-5 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-riverside-red"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section B: Contact & Pro */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                   <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Section B : Contact & Profession</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone *</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        required
                        value={form.telephone}
                        onChange={(e) => setForm({...form, telephone: e.target.value})}
                        placeholder="6XX XXX XXX"
                        className="w-full pl-12 pr-6 py-5 bg-white border border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-riverside-red transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quartier de Résidence</label>
                    <input 
                      value={form.quartier}
                      onChange={(e) => setForm({...form, quartier: e.target.value})}
                      placeholder="Ex: Bonapriso"
                      className="w-full p-5 bg-white border border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-riverside-red transition-all uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Profession</label>
                    <input 
                      value={form.profession}
                      onChange={(e) => setForm({...form, profession: e.target.value})}
                      placeholder="Ex: Ingénieur"
                      className="w-full p-5 bg-white border border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-riverside-red transition-all uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Société / Employeur</label>
                    <input 
                      value={form.societe}
                      onChange={(e) => setForm({...form, societe: e.target.value})}
                      placeholder="Ex: Riverside Corp"
                      className="w-full p-5 bg-white border border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-riverside-red transition-all uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section C: Couverture & Urgence */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                   <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Section C : Couverture & Urgence</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact d&apos;Urgence (Nom & Tél)</label>
                    <input 
                      value={form.contact_urgence}
                      onChange={(e) => setForm({...form, contact_urgence: e.target.value})}
                      placeholder="Ex: Epouse (699...)"
                      className="w-full p-5 bg-white border border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-riverside-red transition-all uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de Couverture</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <select 
                        value={form.type_assurance}
                        onChange={(e) => setForm({...form, type_assurance: e.target.value, nom_assurance: e.target.value === "Assurance Privée" ? form.nom_assurance : ""})}
                        className="w-full pl-12 pr-6 py-5 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-riverside-red cursor-pointer appearance-none"
                      >
                        <option value="Cash">Cash (Privé)</option>
                        <option value="Assurance Privée">Assurance Privée</option>
                        <option value="Prise en charge Société">Prise en charge Société</option>
                      </select>
                    </div>
                  </div>

                  {form.type_assurance === "Assurance Privée" && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-1.5"
                    >
                      <label className="text-[10px] font-black text-riverside-red uppercase tracking-widest ml-1">Nom de l&apos;Assurance</label>
                      <select 
                        required
                        value={form.nom_assurance}
                        onChange={(e) => setForm({...form, nom_assurance: e.target.value})}
                        className="w-full p-5 bg-white border-2 border-red-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-riverside-red animate-pulse"
                      >
                        <option value="">-- Sélectionner l&apos;assurance --</option>
                        {assurances.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="flex gap-6 pt-6 sticky bottom-0 bg-slate-50/10 backdrop-blur-sm -mx-2 px-2 pb-2">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-5 bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                >
                  Annuler
                </button>
                <button 
                  disabled={submitting}
                  className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-riverside-red transition-all shadow-xl shadow-red-50 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Générer le Dossier Patient
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
