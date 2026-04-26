"use client";

import React, { useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Heart, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      
      // On laisse le AuthContext et le Middleware gérer la redirection après avoir chargé le rôle
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* Côté Gauche : Identité Visuelle */}
      <div className="hidden md:flex md:w-1/2 bg-riverside-red items-center justify-center p-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full -ml-48 -mb-48 blur-3xl" />
        
        <div className="relative z-10 text-white space-y-8 max-w-md">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden p-2">
            <Image 
              src="https://i.postimg.cc/jj9x2wr9/92953051_100850928268975_2573263542966812672_n.png"
              alt="Logo Riverside"
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tighter leading-none">RIVERSIDE<br/>MEDICAL CENTER</h1>
            <p className="text-red-100 font-medium text-lg">Système de Gouvernance Hospitalière & Audit de Précision.</p>
          </div>
          <div className="pt-10">
            {/* Version and location removed per user request */}
          </div>
        </div>
      </div>

      {/* Côté Droit : Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm space-y-10"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Accès Sécurisé</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Veuillez vous authentifier pour continuer</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3">
                <ShieldCheck size={18} />
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresse E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="nom.prenom@riverside.cm"
                  className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-riverside-red focus:ring-4 focus:ring-red-50 transition-all font-bold text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-riverside-red focus:ring-4 focus:ring-red-50 transition-all font-bold text-sm text-slate-900"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full px-6 py-2.5 bg-riverside-red text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-[10px]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Se Connecter <ArrowRight size={14} /></>}
            </button>
          </form>

          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Besoin d&apos;aide ? Contactez l&apos;administrateur système
          </p>
        </motion.div>
      </div>
    </div>
  );
}
