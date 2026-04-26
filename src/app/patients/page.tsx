"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Shield, 
  MoreVertical,
  Loader2,
  Calendar,
  Filter
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import NewAdmissionModal from "@/src/components/NewAdmissionModal";

interface Patient {
  id: string;
  nom_complet: string;
  telephone: string;
  type_assurance: string;
  numero_assurance?: string;
  alertes_medicales?: string;
  created_at: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error("Erreur chargement patients:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.telephone?.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <Users className="text-riverside-red" size={24} />
            Base Patients Riverside
          </h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Gestion et Suivi des Dossiers Médicaux</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-riverside-red text-white px-6 py-2.5 rounded-lg shadow-lg shadow-red-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] transition-all active:scale-95"
        >
          <UserPlus size={16} />
          Nouveau Patient
        </button>
      </div>

      {/* Filters & Stats section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-riverside-red transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="RECHERCHER UN PATIENT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-riverside-red font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
          />
        </div>
        <div className="bg-white p-4 border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-9 h-9 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center border border-slate-100 shadow-inner">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Base Totale</p>
            <p className="text-xl font-black text-slate-900 tabular-nums leading-none tracking-tighter">{patients.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-9 h-9 bg-red-50 text-riverside-red rounded-xl flex items-center justify-center border border-red-100 shadow-inner">
            <Shield size={16} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Conventionnés</p>
            <p className="text-xl font-black text-riverside-red tabular-nums leading-none tracking-tighter">{patients.filter(p => p.type_assurance !== 'Cash').length}</p>
          </div>
        </div>
      </div>

      {/* Main Table section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Identité Patient</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Contact</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Couverture</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Enregistrement</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Loader2 className="animate-spin text-riverside-red mx-auto" size={24} />
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-4">Accès base de données...</p>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-300 italic text-[10px] uppercase font-black tracking-widest">Aucun patient répertorié.</td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 font-black text-[9px] uppercase shadow-inner group-hover:bg-white group-hover:border-riverside-red transition-all">
                          {patient.nom_complet.substring(0, 2)}
                        </div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{patient.nom_complet}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-tight">
                        <Phone size={11} className="text-riverside-red" />
                        {patient.telephone}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-[0.1em] border shadow-xs",
                        patient.type_assurance === "Cash" ? "bg-slate-50 text-slate-600 border-slate-100" : "bg-red-50 text-riverside-red border-red-100"
                      )}>
                        {patient.type_assurance}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2 text-slate-300 text-[9px] font-black uppercase tracking-widest">
                        <Calendar size={11} />
                        {new Date(patient.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                        <MoreVertical size={14} className="text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewAdmissionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchPatients}
      />
    </div>
  );
}
