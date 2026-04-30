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
}

export default function NewPatientModal({ isOpen, onClose, onSuccess, initialName = "" }: NewPatientModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nom_complet: initialName,
    telephone: "",
    sexe: "M",
    date_naissance: "",
    age: "",
    type_assurance: "Cash"
  });

  React.useEffect(() => {
    if (initialName) {
      setForm(prev => ({ ...prev, nom_complet: initialName }));
    }
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_complet) return toast.error("Le nom complet est obligatoire");

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          ...form,
          age: form.age ? parseInt(form.age) : null,
          statut: "Actif"
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Dossier patient créé avec succès ! ✨");
      onSuccess(data.id);
      onClose();
      // Reset form
      setForm({
        nom_complet: "",
        telephone: "",
        sexe: "M",
        date_naissance: "",
        age: "",
        type_assurance: "Cash"
      });
    } catch (err: any) {
      console.error("Error creating patient:", err);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden"
        >
          {/* Accent Line */}
          <div className="absolute top-0 left-0 w-full h-2 bg-riverside-red" />
          
          <div className="p-8 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-riverside-red">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Créer Dossier Patient</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Nouveau dossier électronique</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-riverside-red transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Complet du Patient</label>
                <input 
                  autoFocus
                  required
                  value={form.nom_complet}
                  onChange={(e) => setForm({...form, nom_complet: e.target.value})}
                  placeholder="Ex: TCHOKOUTE Jean Philippe"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-riverside-red focus:bg-white transition-all uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                      value={form.telephone}
                      onChange={(e) => setForm({...form, telephone: e.target.value})}
                      placeholder="6XX XXX XXX"
                      className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-riverside-red focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assurance / Couverture</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <select 
                      value={form.type_assurance}
                      onChange={(e) => setForm({...form, type_assurance: e.target.value})}
                      className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-riverside-red focus:bg-white cursor-pointer"
                    >
                      <option value="Cash">Cash (Privé)</option>
                      <option value="AXA">AXA Assurance</option>
                      <option value="GRAS SAVOYE">Gras Savoye</option>
                      <option value="ASCOMA">Ascoma</option>
                      <option value="ALLIANZ">Allianz</option>
                      <option value="ACTIVA">Activa</option>
                      <option value="NSIA">NSIA</option>
                      <option value="SAAR">SAAR</option>
                      <option value="AUTRE">Autre Assurance</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexe</label>
                  <select 
                    value={form.sexe}
                    onChange={(e) => setForm({...form, sexe: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-riverside-red focus:bg-white cursor-pointer"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de Naissance ou Âge</label>
                  <div className="flex gap-2">
                    <input 
                      type="date"
                      value={form.date_naissance}
                      onChange={(e) => setForm({...form, date_naissance: e.target.value})}
                      className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-riverside-red focus:bg-white"
                    />
                    <input 
                      placeholder="Ou Âge"
                      value={form.age}
                      onChange={(e) => setForm({...form, age: e.target.value})}
                      className="w-24 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-center outline-none focus:border-riverside-red focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                >
                  Annuler
                </button>
                <button 
                  disabled={submitting}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-riverside-red transition-all shadow-xl shadow-red-50 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Enregistrer le dossier
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
