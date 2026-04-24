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

// Mock data while waiting for real Supabase connection
const MOCK_SEJOURS = [
  { id: "1", patient_id: "P-102", name: "Jean Dupont", motif_visite: "Consultation Générale", statut: "En attente", time: "08:30" },
  { id: "2", patient_id: "P-105", name: "Marie Kengne", motif_visite: "Pédiatrie", statut: "En cours", time: "09:15" },
  { id: "3", patient_id: "P-108", name: "Andre Mballa", motif_visite: "Urgence", statut: "Urgent", time: "09:45" },
  { id: "4", patient_id: "P-110", name: "Alice Fotso", motif_visite: "Gynécologie", statut: "Terminé", time: "10:00" },
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sejours, setSejours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    console.log('[Dashboard] Composant monté, début récupération des données...');
    
    async function fetchSejours() {
      try {
        setLoading(true);
        console.log('[Dashboard] Appel Supabase: table sejours_actifs...');
        
        const { data, error } = await supabase
          .from('sejours_actifs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[Dashboard] Erreur Supabase capturée:', error.message);
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log('[Dashboard] Données réelles récupérées:', data.length, 'entrées');
          setSejours(data);
        } else {
          console.log('[Dashboard] Table vide ou inexistante, chargement des données fictives (Mock)');
          setSejours(MOCK_SEJOURS);
        }
      } catch (err: any) {
        console.error("[Dashboard] Erreur fatale lors de la récupération:", err);
        setError("Erreur de connexion à la base de données.");
        // Repli sur les données mock en cas d'erreur
        setSejours(MOCK_SEJOURS);
      } finally {
        console.log('[Dashboard] Fin du chargement');
        setLoading(false);
      }
    }

    fetchSejours();

    // Inscription aux changements en temps réel - Sécurisé
    let channel: any;
    try {
      console.log('[Dashboard] Inscription au temps réel Supabase...');
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sejours_actifs' },
          (payload) => {
            console.log('[Dashboard] Alerte Temps Réel:', payload);
            fetchSejours();
          }
        )
        .subscribe((status) => {
          console.log('[Dashboard] Statut Subscription:', status);
        });
    } catch (realtimeErr) {
      console.warn('[Dashboard] Erreur lors de l\'activation du temps réel:', realtimeErr);
    }

    return () => {
      if (channel) {
        console.log('[Dashboard] Nettoyage canal temps réel');
        supabase.removeChannel(channel);
      }
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
    { label: "En Attente", value: "12", change: "+22%", icon: Users, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Consultations", value: "45", change: "Stable", icon: Calendar, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Urgences", value: "03", change: "Alerte", icon: AlertCircle, color: "text-riverside-red", bg: "bg-red-50" },
    { label: "Taux d'Occupation", value: "78%", change: null, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header section */}
      <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-200 -mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-8 px-8 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tableau de Bord d'Accueil</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-2">
            Douala, Cameroun • {mounted ? new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'}
          </p>
        </div>
        <button className="px-6 py-2.5 bg-riverside-red hover:bg-riverside-red-hover text-white font-semibold rounded-xl text-sm shadow-lg shadow-red-200 transition-all active:scale-95">
          Nouvelle Admission +
        </button>
      </header>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col group hover:shadow-md transition-shadow"
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-slate-700 tracking-tight">Salle d'Attente Interactive</h2>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold tracking-wider uppercase">Système Opérationnel</span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold tracking-wider uppercase">Temps Réel</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 font-bold">
                <th className="px-8 py-5">ID Patient</th>
                <th className="px-8 py-5">Nom du Patient</th>
                <th className="px-8 py-5">Motif de Visite</th>
                <th className="px-8 py-5">Heure Arrivée</th>
                <th className="px-8 py-5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4 h-16 bg-slate-50/20" />
                  </tr>
                ))
              ) : sejours.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Aucun patient dans la salle d'attente.
                  </td>
                </tr>
              ) : (
                sejours.map((sejour, idx) => (
                  <motion.tr 
                    key={sejour.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5 text-slate-500 font-mono text-xs">
                      #{sejour.id === "1" ? "RM-2409" : sejour.id === "2" ? "RM-2388" : sejour.id === "3" ? "RM-2411" : "RM-2415"}
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-800">
                      {sejour.name || sejour.patient_id}
                    </td>
                    <td className="px-8 py-5 text-slate-600">
                      {sejour.motif_visite}
                    </td>
                    <td className="px-8 py-5 text-slate-500 italic">
                      {sejour.time || "08:45"}
                    </td>
                    <td className="px-8 py-5">
                      <StatusBadge status={sejour.statut} />
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
      </div>
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
