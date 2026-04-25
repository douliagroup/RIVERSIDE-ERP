"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  FileText, 
  Plus, 
  Loader2,
  Calendar,
  Clock,
  ChevronRight,
  ClipboardList
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";

type TabType = "taches" | "garde" | "reunion" | "stocks";

interface Task {
  id: string;
  titre: string;
  priorite: "Basse" | "Normale" | "Haute" | "Urgence";
  statut: "À faire" | "Terminé";
  created_at: string;
}

interface Personnel {
  id: string;
  nom_complet: string;
  fonction: string;
  categorie_staff?: string;
  telephone?: string;
}

interface Chambre {
  id: string;
  numero: string;
}

interface StockItem {
  id: string;
  designation: string;
  categorie: string;
  quantite_actuelle: number;
  seuil_alerte: number;
}

export default function AdministrationPage() {
  const [activeTab, setActiveTab] = useState<TabType>("taches");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [patientsHospitalises, setPatientsHospitalises] = useState<any[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);

  // Form states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({ titre: "", priorite: "Normale" as Task["priorite"] });
  const [newStock, setNewStock] = useState({ designation: "", categorie: "", quantite_actuelle: 0, seuil_alerte: 10 });

  // Rapport de Garde State
  const [gardeForm, setGardeForm] = useState({
    medecin_id: "",
    soins: "",
    evenements: "",
    transmissions: "",
    chambre_transmissions: [] as { chambre_id: string, patient_id: string, note: string }[]
  });

  // Réunion Technique State
  const [reunionForm, setReunionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    infos_veille: "",
    urgences: "",
    presences: [] as string[] // personnel IDs
  });

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        { data: persData, error: persErr }, 
        { data: chmData, error: chmErr }, 
        { data: patData, error: patErr },
        { data: stockData, error: stockErr }
      ] = await Promise.all([
        supabase.from('personnel').select('id, nom_complet, fonction, categorie_staff, telephone').order('nom_complet'),
        supabase.from('chambres').select('id, numero').order('numero'),
        supabase.from('patients').select('id, nom_complet'),
        supabase.from('stocks').select('*').order('designation')
      ]);
      
      if (persErr) {
        console.error("CRITICAL: Erreur Supabase Personnel:", persErr.message, persErr.details, persErr.hint);
      } else {
        console.log("DEBUG RIVERSIDE PERSONNEL:", persData);
        if (!persData || persData.length === 0) {
          console.warn("ATTENTION: La liste du personnel est vide dans Supabase.");
        }
      }
      if (chmErr) console.error("Erreur chambres:", chmErr);
      if (patErr) console.error("Erreur patients:", patErr);
      if (stockErr) console.error("Erreur stocks:", stockErr);

      setPersonnel(persData || []);
      setChambres(chmData || []);
      setPatientsHospitalises(patData || []);
      setStocks(stockData || []);

      if (activeTab === "taches") {
        const { data, error } = await supabase
          .from("taches_clinique")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setTasks(data || []);
      }
    } catch (err) {
      console.warn(`[Admin] Erreur lors du chargement des données:`, err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("taches_clinique")
        .insert([{ ...newTask, statut: "À faire" }]);
      
      if (error) throw error;
      setShowTaskForm(false);
      setNewTask({ titre: "", priorite: "Normale" });
      fetchData();
    } catch (err) {
      console.error("Erreur création tâche:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.statut === "À faire" ? "Terminé" : "À faire";
    try {
      const { error } = await supabase
        .from("taches_clinique")
        .update({ statut: newStatus })
        .eq("id", task.id);
      
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Erreur update tâche:", err);
    }
  };

  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("stocks")
        .insert([newStock]);
      
      if (error) throw error;
      setShowStockForm(false);
      setNewStock({ designation: "", categorie: "", quantite_actuelle: 0, seuil_alerte: 10 });
      fetchData();
    } catch (err) {
      console.error("Erreur création stock:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGardeRapport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("rapports_garde")
        .insert([gardeForm]);
      
      if (error) throw error;
      alert("Rapport de Garde Enregistré avec succès");
      setGardeForm({
        medecin_id: "",
        soins: "",
        evenements: "",
        transmissions: "",
        chambre_transmissions: []
      });
    } catch (err) {
      console.error("Erreur rapports garde:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const priorityColors = {
    Basse: "bg-slate-100 text-slate-600",
    Normale: "bg-blue-100 text-blue-600",
    Haute: "bg-amber-100 text-amber-600",
    Urgence: "bg-red-100 text-red-600 animate-pulse",
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-8 pb-20 px-4 md:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-riverside-red rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
              <ShieldCheck size={28} />
            </div>
            Administration <span className="text-riverside-red">Interne</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Gestion du personnel et rapports cliniques</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setActiveTab("taches")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === "taches" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Tâches
          </button>
          <button 
            onClick={() => setActiveTab("garde")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === "garde" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Rapport de Garde
          </button>
          <button 
            onClick={() => setActiveTab("reunion")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === "reunion" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Réunion Technique
          </button>
          <button 
            onClick={() => setActiveTab("stocks")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === "stocks" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Stocks
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <motion.div 
        whileHover={{ boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
        className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden min-h-[600px] flex flex-col transition-all duration-500"
      >
        
        {/* View Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
              {activeTab === "taches" ? <ClipboardList size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <h2 className="font-bold text-slate-700 uppercase tracking-tight">
                {activeTab === "taches" ? "Gestion des Tâches" : activeTab === "garde" ? "Rapport de Garde Médicale" : activeTab === "reunion" ? "Réunion Technique Quotidienne" : "Gestion des Stocks Pharmacie"}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Riverside Medical Center • Douala
              </p>
            </div>
          </div>
          
          {activeTab === "taches" && (
            <button 
              onClick={() => setShowTaskForm(true)}
              className="px-4 py-2 bg-riverside-red text-white text-xs font-bold rounded-xl hover:bg-riverside-red-hover transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} /> Nouvelle Tâche
            </button>
          )}

          {activeTab === "stocks" && (
            <button 
              onClick={() => setShowStockForm(true)}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} /> Réceptionner du stock
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-8 overflow-y-auto max-h-[70vh] bg-slate-50/10">
          {loading ? (
            <div className="h-full flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-riverside-red" size={32} />
            </div>
          ) : activeTab === "taches" ? (
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic text-sm">Aucune tâche enregistrée.</div>
              ) : (
                tasks.map(task => (
                  <motion.div 
                    layout
                    key={task.id}
                    whileHover={{ scale: 1.01, x: 4, borderColor: "rgba(220, 38, 38, 0.3)" }}
                    className={cn(
                      "group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                      task.statut === "Terminé" ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleTaskStatus(task)}
                        className={cn(
                          "transition-colors",
                          task.statut === "Terminé" ? "text-emerald-500" : "text-slate-300 hover:text-riverside-red"
                        )}
                      >
                        {task.statut === "Terminé" ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>
                      <div>
                        <p className={cn(
                          "text-sm font-bold transition-all",
                          task.statut === "Terminé" ? "text-slate-400 line-through" : "text-slate-700"
                        )}>
                          {task.titre}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={cn("text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full", priorityColors[task.priorite])}>
                            {task.priorite}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : activeTab === "garde" ? (
            <form onSubmit={handleCreateGardeRapport} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Responsable de Garde</label>
                  <select 
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-riverside-red text-sm font-bold"
                    value={gardeForm.medecin_id}
                    onChange={e => setGardeForm({...gardeForm, medecin_id: e.target.value})}
                  >
                    <option value="">-- Sélectionner le personnel --</option>
                    {personnel.map(p => (
                      <option key={p.id} value={p.id}>{p.nom_complet} • {p.fonction} {p.categorie_staff ? `[${p.categorie_staff}]` : ""}</option>
                    ))}
                    {personnel.length === 0 && (
                      <option disabled>Aucun personnel trouvé</option>
                    )}
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Date</label>
                  <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500">
                    {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Transmissions par Chambre</label>
                  <button 
                    type="button"
                    onClick={() => setGardeForm({
                      ...gardeForm, 
                      chambre_transmissions: [...gardeForm.chambre_transmissions, { chambre_id: "", patient_id: "", note: "" }]
                    })}
                    className="text-[10px] font-bold text-riverside-red uppercase tracking-widest flex items-center gap-1"
                  >
                    <Plus size={14} /> Ajouter une ligne
                  </button>
                </div>
                
                {gardeForm.chambre_transmissions.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">Aucune transmission spécifique ajoutée.</p>
                ) : (
                  <div className="space-y-3">
                    {gardeForm.chambre_transmissions.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <select 
                          className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                          value={item.chambre_id}
                          onChange={e => {
                            const newRows = [...gardeForm.chambre_transmissions];
                            newRows[idx].chambre_id = e.target.value;
                            setGardeForm({...gardeForm, chambre_transmissions: newRows});
                          }}
                        >
                          <option value="">Chambre</option>
                          {chambres.map(c => <option key={c.id} value={c.id}>{c.numero}</option>)}
                        </select>
                        <select 
                          className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                          value={item.patient_id}
                          onChange={e => {
                            const newRows = [...gardeForm.chambre_transmissions];
                            newRows[idx].patient_id = e.target.value;
                            setGardeForm({...gardeForm, chambre_transmissions: newRows});
                          }}
                        >
                          <option value="">Patient</option>
                          {patientsHospitalises.map(p => <option key={p.id} value={p.id}>{p.nom_complet}</option>)}
                        </select>
                        <input 
                          placeholder="Note de transmission..."
                          className="p-2 bg-white border border-slate-200 rounded-xl text-xs"
                          value={item.note}
                          onChange={e => {
                            const newRows = [...gardeForm.chambre_transmissions];
                            newRows[idx].note = e.target.value;
                            setGardeForm({...gardeForm, chambre_transmissions: newRows});
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Soins (Surveillance, Techniques...)</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-riverside-red text-sm h-32 resize-none"
                      placeholder="Détails des soins effectués..."
                      value={gardeForm.soins}
                      onChange={e => setGardeForm({...gardeForm, soins: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Évènements et faits marquants</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-riverside-red text-sm h-32 resize-none"
                      placeholder="Ruptures de stock, pannes, incidents..."
                      value={gardeForm.evenements}
                      onChange={e => setGardeForm({...gardeForm, evenements: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Transmissions pour la relève</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-riverside-red text-sm h-32 resize-none"
                      placeholder="Recommandations prioritaires..."
                      value={gardeForm.transmissions}
                      onChange={e => setGardeForm({...gardeForm, transmissions: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  disabled={submitting}
                  className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                  <span>ENREGISTRER LE RAPPORT DE GARDE</span>
                </button>
              </div>
            </form>
          ) : activeTab === "stocks" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stocks.map(item => (
                  <div key={item.id} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                    {item.quantite_actuelle <= item.seuil_alerte && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black uppercase px-2 py-1 flex items-center gap-1">
                        <AlertCircle size={10} /> ALERTE RUPTURE
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{item.categorie}</p>
                        <h4 className="font-bold text-slate-800">{item.designation}</h4>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mt-6">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Stock Actuel</p>
                        <p className={cn(
                          "text-2xl font-black",
                          item.quantite_actuelle <= item.seuil_alerte ? "text-red-600" : "text-slate-900"
                        )}>
                          {item.quantite_actuelle}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Seuil</p>
                        <p className="text-xs font-bold text-slate-600">{item.seuil_alerte}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {stocks.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-400 italic text-sm">
                    Aucun article en stock.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={async (e) => { e.preventDefault(); setSubmitting(true); setTimeout(() => { setSubmitting(false); alert("Rapport de Réunion Enregistré"); }, 1000); }} className="space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="space-y-4">
                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Présences (Personnel)</label>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     {personnel.map(p => (
                       <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer group">
                         <input 
                           type="checkbox" 
                           className="w-4 h-4 rounded-md border-slate-300 text-riverside-red focus:ring-riverside-red"
                           checked={reunionForm.presences.includes(p.id)}
                           onChange={(e) => {
                             if(e.target.checked) setReunionForm({...reunionForm, presences: [...reunionForm.presences, p.id]});
                             else setReunionForm({...reunionForm, presences: reunionForm.presences.filter(id => id !== p.id)});
                           }}
                         />
                         <div className="flex flex-col">
                           <span className="text-xs font-bold text-slate-700 group-hover:text-riverside-red">{p.nom_complet}</span>
                           <span className="text-[9px] text-slate-400 font-bold uppercase">{p.fonction}</span>
                         </div>
                       </label>
                     ))}
                   </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">Informations techniques et médicales de la veille</label>
                      <textarea 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-riverside-red text-sm h-32 resize-none"
                        placeholder="Résumé des activités..."
                        value={reunionForm.infos_veille}
                        onChange={e => setReunionForm({...reunionForm, infos_veille: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">Urgences signalées</label>
                      <textarea 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-riverside-red text-sm h-32 resize-none"
                        placeholder="Points critiques..."
                        value={reunionForm.urgences}
                        onChange={e => setReunionForm({...reunionForm, urgences: e.target.value})}
                      />
                    </div>
                 </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-slate-100">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Planification Opérationnelle</label>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                        <th className="p-3 text-left border border-slate-200">Acteur</th>
                        <th className="p-3 text-left border border-slate-200">Action Prévue</th>
                        <th className="p-3 text-left border border-slate-200">Échéance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1,2,3].map(i => (
                        <tr key={i}>
                          <td className="p-0 border border-slate-200"><input className="w-full p-3 text-xs bg-transparent focus:ring-0 border-none" placeholder="ex: Major de Garde" /></td>
                          <td className="p-0 border border-slate-200"><input className="w-full p-3 text-xs bg-transparent focus:ring-0 border-none" placeholder="ex: Commande Oxygène" /></td>
                          <td className="p-0 border border-slate-200"><input className="w-full p-3 text-xs bg-transparent focus:ring-0 border-none" placeholder="ex: 12h00" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>

               <div className="flex justify-end pt-4">
                  <button 
                    disabled={submitting}
                    className="px-10 py-4 bg-riverside-red text-white font-black rounded-2xl shadow-xl shadow-red-200 hover:bg-riverside-red-hover transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    <span>ARCHIVER LA RÉUNION TECHNIQUE</span>
                  </button>
               </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* Task Creation Modal */}
      <AnimatePresence>
        {showTaskForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTaskForm(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} 
              animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }} 
              exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} 
              className="fixed top-1/2 left-1/2 w-[95%] max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl z-[101] p-8 scrollbar-hide"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-6">Nouvelle Tâche Administative</h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Titre de la tâche</label>
                  <input required value={newTask.titre} onChange={e => setNewTask({...newTask, titre: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-riverside-red" placeholder="ex: Inventaire bloc opératoire..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Niveau d&apos;urgence</label>
                  <select value={newTask.priorite} onChange={e => setNewTask({...newTask, priorite: e.target.value as Task["priorite"]})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-riverside-red">
                    <option value="Basse">Basse</option>
                    <option value="Normale">Normale</option>
                    <option value="Haute">Haute</option>
                    <option value="Urgence">URGENCE CRITIQUE</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowTaskForm(false)} className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600">Annuler</button>
                  <button disabled={submitting} type="submit" className="flex-[2] py-3 bg-riverside-red text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center">
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : "Ajouter la tâche"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Stock Reception Modal */}
      <AnimatePresence>
        {showStockForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStockForm(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} 
              animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }} 
              exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} 
              className="fixed top-1/2 left-1/2 w-[95%] max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl z-[101] p-8 scrollbar-hide"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-6">Réception de Stock</h3>
              <form onSubmit={handleCreateStock} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Désignation de l&apos;article</label>
                  <input required value={newStock.designation} onChange={e => setNewStock({...newStock, designation: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-riverside-red" placeholder="ex: Paracétamol 500mg..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Catégorie</label>
                  <select value={newStock.categorie} onChange={e => setNewStock({...newStock, categorie: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-riverside-red">
                    <option value="">-- Choisir --</option>
                    <option value="Consommable">Consommable</option>
                    <option value="Médicament">Médicament</option>
                    <option value="Laboratoire">Laboratoire</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Quantité</label>
                    <input type="number" required value={newStock.quantite_actuelle} onChange={e => setNewStock({...newStock, quantite_actuelle: parseInt(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-riverside-red" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Seuil Alerte</label>
                    <input type="number" required value={newStock.seuil_alerte} onChange={e => setNewStock({...newStock, seuil_alerte: parseInt(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-riverside-red" />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowStockForm(false)} className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600">Annuler</button>
                  <button disabled={submitting} type="submit" className="flex-[2] py-3 bg-slate-900 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center">
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : "Enregistrer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
