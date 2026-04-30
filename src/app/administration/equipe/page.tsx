"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Lock, 
  ChevronRight, 
  Loader2,
  AlertOctagon,
  CheckCircle2,
  Briefcase
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

const ROLES = [
  { id: 'MEDECIN', label: 'Médecin', color: 'text-blue-600 bg-blue-50' },
  { id: 'RECEPTIONNISTE', label: 'Réceptionniste', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'CAISSIER', label: 'Caissier', color: 'text-amber-600 bg-amber-50' },
  { id: 'MAJOR', label: 'Infirmier Major', color: 'text-purple-600 bg-purple-50' },
  { id: 'PATRON', label: 'Patron (Admin)', color: 'text-rose-600 bg-rose-50' },
];

export default function EquipeAdminPage() {
  const { user, userRole } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'MEDECIN'
  });

  // Guard: Uniquement accessible au Patron
  useEffect(() => {
    if (userRole && userRole !== 'patron') {
      toast.error("Accès réservé à la direction");
      router.push('/');
    }
  }, [userRole, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue");
      }

      toast.success("Compte créé avec succès !");
      setForm({ email: '', password: '', role: 'MEDECIN' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full translate-x-32 -translate-y-32" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <Users size={24} />
            </div>
            Gestion de <span className="text-riverside-red">l&apos;Équipe</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Administration des Accès Riverside Medical Center</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar Info */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-riverside-red/20 rounded-full translate-x-16 translate-y-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            <h3 className="text-xl font-black uppercase tracking-tight mb-4">Sécurité</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
              La création d&apos;un compte professionnel active immédiatement les privilèges associés au rôle choisi. Assurez-vous de communiquer les identifiants de manière sécurisée.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <CheckCircle2 size={14} className="text-emerald-500" /> Password Robuste Requis
              </div>
              <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <CheckCircle2 size={14} className="text-emerald-500" /> Confirmation Email Auto
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Rôles Disponibles</h4>
            <div className="space-y-2">
              {ROLES.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-50">
                  <span className="text-[10px] font-black uppercase text-slate-600">{r.label}</span>
                  <div className={cn("w-2 h-2 rounded-full", r.id === 'PATRON' ? "bg-rose-500" : "bg-slate-300")} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="md:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-riverside-red" />
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
               <UserPlus className="text-riverside-red" />
               Nouveau Collaborateur
            </h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Mail size={12} /> Email Professionnel
                  </label>
                  <input 
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="nom.prenom@riverside.com"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red transition-all font-bold text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Lock size={12} /> Mot de Passe Provisoire
                  </label>
                  <input 
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red transition-all font-bold text-sm"
                  />
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 ml-1 tracking-widest italic">8 caractères minimum conseillés</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <ShieldCheck size={12} /> Rôle & Privilèges
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROLES.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setForm({...form, role: r.id})}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all relative overflow-hidden group",
                          form.role === r.id 
                            ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                            : "bg-white border-slate-100 hover:border-slate-300 text-slate-600"
                        )}
                      >
                         <p className="text-[10px] font-black uppercase tracking-widest relative z-10">{r.label}</p>
                         <p className="text-[8px] font-bold opacity-50 relative z-10">{r.id}</p>
                         {form.role === r.id && (
                           <motion.div layoutId="roleCheck" className="absolute right-3 top-1/2 -translate-y-1/2">
                              <CheckCircle2 size={16} className="text-riverside-red" />
                           </motion.div>
                         )}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <div className="pt-6">
                <button 
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-riverside-red transition-all flex items-center justify-center gap-4 disabled:opacity-50 group hover:-translate-y-1 active:translate-y-0"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Créer le compte Riverside
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
