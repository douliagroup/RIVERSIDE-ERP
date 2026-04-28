"use client";

import React, { useState, useEffect } from "react";
import { 
  User, 
  Phone, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Loader2,
  CheckCircle,
  Plus,
  ArrowLeft,
  Briefcase,
  Building
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AdmissionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nom_complet: "",
    telephone: "",
    sexe: "M",
    age: "",
    quartier: "",
    profession: "",
    societe: "",
    type_assurance: "Cash",
    numero_assurance: "",
    alertes_medicales: "",
    motif_visite: "",
  });

  const [assurances, setAssurances] = useState<any[]>([]);
  const [loadingAssurances, setLoadingAssurances] = useState(false);

  useEffect(() => {
    const fetchAssurances = async () => {
      setLoadingAssurances(true);
      try {
        const { data } = await supabase.from('assurances').select('nom').order('nom');
        if (data && data.length > 0) {
          setAssurances(data);
        }
      } catch (err) {
        console.error("Erreur chargement assurances:", err);
      } finally {
        setLoadingAssurances(false);
      }
    };
    fetchAssurances();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ÉTAPE A : Création du patient
      // Validation : age et telephone sont facultatifs
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .insert([{
          nom_complet: formData.nom_complet.toUpperCase(),
          telephone: formData.telephone || null,
          sexe: formData.sexe,
          age: formData.age ? parseInt(formData.age) : null,
          quartier: formData.quartier.toUpperCase(),
          profession: formData.profession.toUpperCase(),
          societe: formData.societe.toUpperCase(),
          type_assurance: formData.type_assurance,
          numero_assurance: formData.numero_assurance,
          alertes_medicales: formData.alertes_medicales
        }])
        .select()
        .single();

      if (patientError) throw patientError;

      // ÉTAPE B : Création du séjour actif
      const { error: sejourError } = await supabase
        .from("sejours_actifs")
        .insert([{
          patient_id: patientData.id,
          statut: "En attente",
          motif_visite: formData.motif_visite
        }]);

      if (sejourError) throw sejourError;

      toast.success("Admission réussie ! Redirection...");
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);

    } catch (err: any) {
      console.error("[Admission] Error:", err);
      setError(err.message || "Une erreur est survenue.");
      toast.error(err.message || "Erreur d'admission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 h-full">
          {/* Sidebar Info */}
          <div className="md:col-span-4 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-riverside-red/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="relative z-10 space-y-8">
              <button 
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                <ArrowLeft size={16} /> Retour Dashboard
              </button>
              
              <div>
                <h1 className="text-3xl font-black tracking-tighter leading-tight italic">RIVERSIDE<br/><span className="text-riverside-red">ADMISSION</span></h1>
                <p className="text-slate-400 text-xs font-medium mt-4 leading-relaxed uppercase tracking-tight">
                  Enregistrement centralisé des patients pour consultations, examens et soins ambulatoires.
                </p>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:bg-riverside-red group-hover:border-riverside-red transition-all">
                       <User size={18} className="text-slate-400 group-hover:text-white" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Identité</p>
                       <p className="text-[11px] font-bold">Vérification ID requise</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:bg-riverside-red group-hover:border-riverside-red transition-all">
                       <Shield size={18} className="text-slate-400 group-hover:text-white" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assurance</p>
                       <p className="text-[11px] font-bold">Couverture & Droits</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="relative z-10 pt-10 border-t border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Medical Management System v4.0</p>
            </div>
          </div>

          {/* Form Content */}
          <div className="md:col-span-8 p-10 md:p-16 h-full overflow-y-auto max-h-[80vh] custom-scrollbar">
            {success ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-100 animate-bounce">
                  <CheckCircle size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Admission Réussie</h2>
                  <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-wide">Le patient a été ajouté à la file d&apos;attente</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-12">
                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-riverside-red rounded-full" />
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Informations Patient</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Complet</label>
                      <input 
                        required
                        type="text"
                        name="nom_complet"
                        value={formData.nom_complet}
                        onChange={handleChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none transition-all font-bold text-sm uppercase"
                        placeholder="EX: MOKO JEAN PIERRE"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone (Facultatif)</label>
                        <input 
                          type="tel"
                          name="telephone"
                          value={formData.telephone}
                          onChange={handleChange}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none transition-all font-bold text-sm"
                          placeholder="6XX XX XX XX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Âge (Facultatif)</label>
                        <input 
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none transition-all font-bold text-sm"
                          placeholder="EX: 45"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexe</label>
                        <select 
                          name="sexe"
                          value={formData.sexe}
                          onChange={handleChange}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none transition-all font-bold text-sm appearance-none"
                        >
                          <option value="M">MASCULIN</option>
                          <option value="F">FÉMININ</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quartier</label>
                        <input 
                          required
                          type="text"
                          name="quartier"
                          value={formData.quartier}
                          onChange={handleChange}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none transition-all font-bold text-sm uppercase"
                          placeholder="EX: PK12"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Profession</label>
                        <div className="relative group">
                          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-riverside-red transition-colors" size={16} />
                          <input 
                            type="text"
                            name="profession"
                            value={formData.profession}
                            onChange={handleChange}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none transition-all font-bold text-sm uppercase"
                            placeholder="EX: COMPTABLE"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Société</label>
                        <div className="relative group">
                          <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-riverside-red transition-colors" size={16} />
                          <input 
                            type="text"
                            name="societe"
                            value={formData.societe}
                            onChange={handleChange}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none transition-all font-bold text-sm uppercase"
                            placeholder="EX: ENEO / SABC"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Couverture Médicale</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assurance / Partenaire</label>
                      <select 
                        name="type_assurance"
                        value={formData.type_assurance}
                        onChange={handleChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none transition-all font-bold text-sm appearance-none"
                      >
                        <option value="Cash">CASH / PRIVÉ</option>
                        {assurances.map(a => (
                          <option key={a.nom} value={a.nom}>{a.nom.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro de Matricule</label>
                      <input 
                        type="text"
                        name="numero_assurance"
                        value={formData.numero_assurance}
                        onChange={handleChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-riverside-red outline-none transition-all font-bold text-sm"
                        placeholder="789/XYZ/2026"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-amber-500 rounded-full" />
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Motif de Visite</h2>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description des symptômes</label>
                    <textarea 
                      required
                      name="motif_visite"
                      value={formData.motif_visite}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:border-riverside-red outline-none transition-all font-bold text-sm resize-none"
                      placeholder="DÉTAILLEZ ICI LE MOTIF DU PATIENT..."
                    />
                  </div>
                </div>

                <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-4 text-amber-600 bg-amber-50 px-6 py-4 rounded-2xl border border-amber-100">
                      <AlertTriangle size={20} className="shrink-0" />
                      <p className="text-[10px] font-black uppercase leading-tight tracking-tight">
                        En validant, le patient sera automatiquement<br/>ajouté à la file d&apos;attente médicale.
                      </p>
                   </div>
                   
                   <button 
                    disabled={loading}
                    className="w-full md:w-auto px-12 py-5 bg-riverside-red text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-200 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
                   >
                     {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                     Lancer l&apos;Admission
                   </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
