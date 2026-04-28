"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Loader2,
  TrendingUp,
  Eye,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sejours, setSejours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caDuJour, setCaDuJour] = useState(0);
  
  // New states for actions
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedSejourDetail, setSelectedSejourDetail] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [sejoursRes, transactionsRes] = await Promise.all([
        supabase
          .from('sejours_actifs')
          .select(`
            *,
            patients (
              nom_complet,
              type_assurance
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions_caisse')
          .select('montant_verse, date_transaction')
          .gte('date_transaction', new Date().toISOString().split('T')[0])
      ]);

      if (sejoursRes.error) throw sejoursRes.error;
      setSejours(sejoursRes.data || []);
      
      if (transactionsRes.data) {
        const total = transactionsRes.data.reduce((acc, curr) => acc + (curr.montant_verse || 0), 0);
        setCaDuJour(total);
      }

    } catch (err: any) {
      console.error("[Dashboard] Erreur fatale lors de la récupération:", err);
      setError("Erreur de connexion à la base de données.");
    } finally {
      setLoading(false);
    }
  };

  const cancelSejour = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette visite ?")) return;
    
    try {
      setIsDeleting(id);
      const { error } = await supabase
        .from('sejours_actifs')
        .update({ statut: 'Annulé' })
        .eq('id', id);

      if (error) throw error;
      toast.success("Visite annulée avec succès");
      fetchData();
    } catch (err: any) {
      toast.error("Erreur lors de l'annulation");
      console.error(err);
    } finally {
      setIsDeleting(null);
      setActiveMenuId(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sejours_actifs' },
        () => fetchData()
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
      icon: Users, 
      color: "text-orange-500", 
      bg: "bg-orange-50",
      link: "/tresorerie"
    },
    { 
      label: "Consultations", 
      value: sejours.filter(s => s.statut === "En consultation" || s.statut === "En cours" || s.statut === "En Examen").length.toString(), 
      icon: Calendar, 
      color: "text-emerald-500", 
      bg: "bg-emerald-50",
      link: "/medical"
    },
    { 
      label: "CA du Jour", 
      value: caDuJour.toLocaleString() + " F", 
      icon: TrendingUp, 
      color: "text-blue-600", 
      bg: "bg-blue-50",
      link: "/tresorerie"
    },
    { 
      label: "Urgences", 
      value: sejours.filter(s => s.priorite === "Urgence" || s.statut === "Urgent").length.toString().padStart(2, '0'), 
      icon: AlertCircle, 
      color: "text-riverside-red", 
      bg: "bg-red-50",
      link: "/medical"
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
           <Image 
             src="https://i.postimg.cc/qRmsjmD7/Background-Eraser-20241231-212658879.png" 
             alt="Riverside Logo Watermark" 
             width={150}
             height={150}
             referrerPolicy="no-referrer"
             className="w-40 h-40 object-contain"
           />
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 bg-white rounded-2xl shadow-xl shadow-red-50 flex items-center justify-center border border-slate-50 overflow-hidden"
          >
             <Image 
               src="https://i.postimg.cc/qRmsjmD7/Background-Eraser-20241231-212658879.png" 
               alt="Riverside Logo" 
               width={80}
               height={80}
               referrerPolicy="no-referrer"
               className="w-20 h-20 object-contain"
             />
          </motion.div>
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-black text-slate-900 tracking-tight uppercase"
            >
              Tableau de <span className="text-riverside-red">Bord</span>
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 mt-1"
            >
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                DASHBOARD OPÉRATIONNEL
              </p>
              <span className="h-3 w-[1px] bg-slate-200" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                {mounted ? new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'}
              </p>
            </motion.div>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/admission")}
          className="bg-riverside-red text-white px-8 py-4 rounded-xl shadow-lg shadow-red-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:scale-[1.02] transition-all relative z-10"
        >
          <PlusCircle size={18} />
          Nouvelle Admission
        </motion.button>
      </header>

      {/* Stats Section section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => router.push(stat.link)}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col group transition-all hover:shadow-xl hover:border-slate-200 cursor-pointer active:scale-95"
          >
            <span className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-4">{stat.label}</span>
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{stat.value}</span>
              </div>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner border border-transparent", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-[8px] font-black uppercase text-riverside-red tracking-widest">
               Accéder au module
               <ChevronRight size={10} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area (Salle d'attente) section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col"
      >
        <div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
              Salle d&apos;Attente Interactive
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Flux Patients en Temps Réel</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 group focus-within:border-riverside-red transition-colors">
              <Search size={14} className="text-slate-400 group-focus-within:text-riverside-red" />
              <input type="text" placeholder="RECHERCHER..." className="bg-transparent border-none text-[9px] font-black text-slate-900 focus:ring-0 placeholder:text-slate-300 w-32 uppercase" />
            </div>
            <button className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600 border border-slate-100 shadow-inner">
              <Filter size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase font-black tracking-widest text-slate-300 bg-slate-50/30 border-b border-slate-50">
                <th className="px-8 py-4">Ref</th>
                <th className="px-8 py-4">Nom Patient</th>
                <th className="px-8 py-4">Visite</th>
                <th className="px-8 py-4">Heure</th>
                <th className="px-8 py-4 text-center">Priorité</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-6 h-16 bg-slate-50/10" />
                  </tr>
                ))
              ) : sejours.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-100 border border-slate-100 shadow-inner">
                        <Clock size={24} />
                      </div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Aucun patient en file d&apos;attente</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sejours.map((sejour, idx) => (
                  <motion.tr 
                    key={sejour.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => router.push("/medical")}
                    className="hover:bg-slate-50 transition-colors group cursor-pointer relative"
                  >
                    <td className="px-8 py-5 text-slate-400 font-black text-[10px] uppercase tracking-tighter">
                      #{sejour.id.substring(0, 6).toUpperCase()}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[9px] font-black text-slate-900 group-hover:bg-red-50 group-hover:border-riverside-red transition-all shadow-inner">
                          {sejour.patients?.nom_complet?.charAt(0) || "P"}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">{sejour.patients?.nom_complet || "Inconnu"}</span>
                          <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase mt-1">{sejour.patients?.type_assurance || "Cash"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md uppercase tracking-tight">
                        {sejour.motif_visite}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-slate-400 text-[10px] font-black tracking-widest tabular-nums">
                      {new Date(sejour.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <StatusBadge status={sejour.statut} />
                    </td>
                    <td className="px-8 py-5 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === sejour.id ? null : sejour.id);
                        }}
                        className="w-8 h-8 inline-flex items-center justify-center hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                      >
                        <MoreHorizontal size={14} className={cn("transition-colors", activeMenuId === sejour.id ? "text-riverside-red" : "text-slate-400")} />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {activeMenuId === sejour.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                              }} 
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-8 top-12 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden py-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button 
                                onClick={() => {
                                  setSelectedSejourDetail(sejour);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
                              >
                                <Eye size={12} className="text-slate-400" />
                                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Voir Détails</span>
                              </button>
                              <button 
                                onClick={() => router.push(`/admission?edit=${sejour.id}`)}
                                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
                              >
                                <Pencil size={12} className="text-slate-400" />
                                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Modifier</span>
                              </button>
                              <div className="h-[1px] bg-slate-50 my-1 mx-2" />
                              <button 
                                onClick={() => cancelSejour(sejour.id)}
                                disabled={isDeleting === sejour.id}
                                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-red-50 transition-colors group"
                              >
                                <Trash2 size={12} className="text-slate-400 group-hover:text-riverside-red" />
                                <span className="text-[9px] font-black uppercase text-slate-600 group-hover:text-riverside-red tracking-widest">
                                  {isDeleting === sejour.id ? "Annulation..." : "Annuler Visite"}
                                </span>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Riverside Sync Active</span>
           </div>
           <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em]">Medical Intelligence Core</p>
        </div>
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedSejourDetail && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSejourDetail(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-xl h-fit max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden border border-slate-100"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Détails de la Visite</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Dossier Patient Riverside</p>
                </div>
                <button 
                  onClick={() => setSelectedSejourDetail(null)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-10 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nom Complet</p>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{selectedSejourDetail.patients?.nom_complet}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Admission</p>
                    <p className="text-xs font-mono font-bold text-slate-500 uppercase">#{selectedSejourDetail.id.substring(0, 8)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</p>
                    <p className="text-xs font-bold text-slate-800">{selectedSejourDetail.patients?.telephone || "N/A"}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assurance</p>
                    <p className="text-xs font-black text-emerald-600 uppercase italic">{selectedSejourDetail.patients?.type_assurance || "Cash"}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motif de Visite</p>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed italic">&quot;{selectedSejourDetail.motif_visite}&quot;</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profession</p>
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{selectedSejourDetail.patients?.profession || "N/A"}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Société</p>
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{selectedSejourDetail.patients?.societe || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex justify-end">
                <button 
                  onClick={() => setSelectedSejourDetail(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all"
                >
                  Fermer le dossier
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string }> = {
    'Terminé': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    'En attente': { color: 'bg-orange-50 text-orange-600 border-orange-100' },
    'En cours': { color: 'bg-blue-50 text-blue-600 border-blue-100' },
    'Urgent': { color: 'bg-red-50 text-red-600 border-red-100 animate-pulse' },
    'En Examen': { color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    'Admission': { color: 'bg-slate-50 text-slate-600 border-slate-100' },
  };

  const style = config[status] || { color: 'bg-slate-50 text-slate-400 border-slate-100' };

  return (
    <span className={cn(
      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-xs inline-block",
      style.color
    )}>
      {status}
    </span>
  );
}
