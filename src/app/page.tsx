"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import { Loader2, ShieldCheck, LogOut } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

export default function DashboardHub() {
  const router = useRouter();
  const { user, userRole, loading, signOut } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      setRedirecting(true);
      // ÉTAPE 2 : ROUTAGE INTELLIGENT DEPUIS LE HUB
      const role = userRole.toLowerCase();
      
      if (role === 'patron') {
        router.push('/patron');
      } else if (role === 'comptable') {
        router.push('/comptabilite');
      } else if (role === 'medecin' || role === 'major') {
        router.push('/medical');
      } else if (role === 'personnel' || role === 'administratif') {
        router.push('/administration');
      } else if (role === 'caissier' || role === 'accueil' || role === 'receptionniste' || role === 'communication') {
        router.push('/admission');
      } else {
        // Fallback for other roles
        router.push('/admission');
      }
    } else if (!loading && !user) {
      router.push('/login');
    }
  }, [user, userRole, loading, router]);

  if (loading || redirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-32 h-32 bg-white rounded-3xl shadow-2xl flex items-center justify-center border border-slate-100 overflow-hidden"
        >
          <Image 
            src="https://i.postimg.cc/jj9x2wr9/92953051-100850928268975-2573263542966812672-n.png" 
            alt="Riverside Logo" 
            width={100}
            height={100}
            className="w-24 h-24 object-contain"
          />
        </motion.div>
        
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-riverside-red animate-spin mx-auto" />
          <p className="text-sm font-black text-slate-900 uppercase tracking-widest animate-pulse">
            Identification de votre bureau Riverside...
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
            Excellence Clinique & Innovation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-12 border border-slate-100 text-center space-y-8">
        <div className="w-20 h-20 bg-red-50 text-riverside-red rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Bienvenue au Riverside ERP</h1>
          <p className="text-xs text-slate-500 font-medium">Vous êtes connecté en tant que <span className="font-bold text-slate-900 uppercase tracking-widest">{userRole}</span>.</p>
        </div>
        
        <div className="h-px bg-slate-100 w-full" />
        
        <button 
          onClick={() => signOut()}
          className="flex items-center justify-center gap-3 w-full p-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-riverside-red transition-all shadow-lg"
        >
          <LogOut size={16} /> Me déconnecter
        </button>
      </div>
    </div>
  );
}
