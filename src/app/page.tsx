"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Clock, 
  Calendar, 
  PlusCircle, 
  Search, 
  MoreHorizontal,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import NewAdmissionModal from "@/src/components/NewAdmissionModal";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sejours, setSejours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSejours = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sejours_actifs')
        .select(`
          *,
          patients (
            nom_complet,
            type_assurance
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSejours(data || []);
    } catch (err: any) {
      console.error("[Dashboard] Erreur fatale lors de la récupération:", err);
      setError("Erreur de connexion à la base de données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSejours();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sejours_actifs' },
        () => fetchSejours()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading && sejours.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-riverside-red animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse italic">Chargement du Dashboard Riverside...</p>
      </div>
    );
  }

  const stats = [
    { 
      label: "En Attente", 
      value: sejours.filter(s => s.statut === "En attente").length.toString(), 
      change: null, 
      icon: Users, 
      color: "text-orange-500", 
      bg: "bg-orange-50" 
    },
    { 
      label: "Consultations", 
      value: sejours.filter(s => s.statut === "En consultation" || s.statut === "En cours").length.toString(), 
      change: null, 
      icon: Calendar, 
      color: "text-emerald-500", 
      bg: "bg-emerald-50" 
    },
    { 
      label: "Urgences", 
      value: sejours.filter(s => s.priorite === "Urgence" || s.statut === "Urgent").length.toString().padStart(2, '0'), 
      change: null, 
      icon: AlertCircle, 
      color: "text-riverside-red", 
      bg: "bg-red-50" 
    },
    { 
      label: "Taux d'Occupation", 
      value: "85%", 
      change: null, 
      icon: Clock, 
      color: "text-blue-600", 
      bg: "bg-blue-50" 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header section section */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-black text-slate-900 tracking-tight"
          >
            Dashboard <span className="text-riverside-red">Global</span>
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em] font-black flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Riverside Medical Center • Douala
            </p>
            <span className="h-4 w-[1px] bg-slate-200" />
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
              {mounted ? new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'}
            </p>
          </motion.div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-riverside-red text-white font-black rounded-xl text-xs shadow-xl shadow-red-200 transition-all flex items-center gap-2.5 group"
        >
          <PlusCircle size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>NOUVELLE ADMISSION</span>
        </motion.button>
      </header>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ 
              translateY: -8, 
              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
              borderColor: "rgba(220, 38, 38, 0.2)"
            }}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col group transition-all"
          >
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em] mb-4">{stat.label}</span>
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900 tracking-tighter">{stat.value}</span>
                {stat.change && (
                  <span className={cn("text-[10px] font-bold mb-1.5 px-1.5 py-0.5 rounded", stat.color, stat.bg)}>
                    {stat.change}
                  </span>
                )}
              </div>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area (Salle d'attente) */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.1)" }}
        transition={{ delay: 0.4 }}
        className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden flex flex-col transition-all duration-500"
      >
        <div className="px-10 py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 to-white">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Salle d&apos;Attente Interactive
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" />
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Flux en temps réel des patients admis</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200">
              <Search size={14} className="text-slate-400" />
              <input type="text" placeholder="Filtrer..." className="bg-transparent border-none text-[10px] font-bold text-slate-600 focus:ring-0 placeholder:text-slate-400 w-24 md:w-40" />
            </div>
            <button className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
              <Filter size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-black tracking-[0.25em] text-slate-400 border-b border-slate-100">
                <th className="px-10 py-6">Code ID</th>
                <th className="px-10 py-6">Identité Patient</th>
                <th className="px-10 py-6">Motif Médical</th>
                <th className="px-10 py-6">Arrivée</th>
                <th className="px-10 py-6">Statut Priorité</th>
                <th className="px-10 py-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-10 py-6 h-20 bg-slate-50/10" />
                  </tr>
                ))
              ) : sejours.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-16 text-center text-slate-400 italic font-bold">
                    <div className="flex flex-col items-center gap-3">
                      <Clock size={40} className="text-slate-100 mb-2" />
                      Aucun patient en attente actuellement.
                    </div>
                  </td>
                </tr>
              ) : (
                sejours.map((sejour, idx) => (
                  <motion.tr 
                    key={sejour.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 + 0.5 }}
                    className="hover:bg-slate-50/80 transition-all group cursor-pointer border-l-4 border-l-transparent hover:border-l-riverside-red"
                  >
                    <td className="px-10 py-6 text-slate-500 font-mono text-[10px] font-black">
                      #{sejour.id.substring(0, 7).toUpperCase()}
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                          {sejour.patients?.nom_complet?.charAt(0) || "P"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 group-hover:text-riverside-red transition-colors">{sejour.patients?.nom_complet || "Inconnu"}</span>
                          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">{sejour.patients?.type_assurance || "Cash"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100/50 px-2 py-1 rounded-md">
                        {sejour.motif_visite}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-slate-500 text-[11px] font-bold font-mono">
                      {new Date(sejour.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-10 py-6">
                      <StatusBadge status={sejour.statut} />
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex justify-center">
                        <div className="p-2 text-slate-300 hover:text-riverside-red transition-colors hover:bg-red-50 rounded-lg">
                          <MoreHorizontal size={16} />
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-8 py-5 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
           <button className="text-[10px] font-bold text-slate-400 hover:text-riverside-red transition-colors flex items-center gap-1 uppercase tracking-[0.2em]">
             Système Riverside v2.0
           </button>
           <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider italic">Mise à jour en temps réel activée</p>
        </div>
      </motion.div>
      <NewAdmissionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchSejours}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string }> = {
    'Terminé': { color: 'bg-emerald-100 text-emerald-600' },
    'En attente': { color: 'bg-orange-100 text-orange-600' },
    'En cours': { color: 'bg-blue-100 text-blue-600' },
    'Urgent': { color: 'bg-rose-100 text-rose-600 animate-pulse' },
    'En Examen': { color: 'bg-blue-100 text-blue-600' },
    'Admission': { color: 'bg-indigo-100 text-indigo-600' },
  };

  const style = config[status] || { color: 'bg-slate-100 text-slate-600' };

  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit",
      style.color
    )}>
      {status}
    </span>
  );
}
