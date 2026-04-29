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
  ClipboardList,
  Users,
  UserCog,
  FileDown,
  FilePlus,
  Search,
  History,
  Shield,
  Printer,
  Upload,
  FolderOpen,
  Trash2,
  Lock,
  Download
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

type TabType = "taches" | "personnel" | "rapports" | "archives" | "audit" | "stocks";

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
  notes_administratives?: string;
  email?: string;
}

interface RapportClinique {
  id: string;
  type_rapport: string;
  auteur: string;
  contenu: any;
  created_at: string;
}

interface ArchiveClinique {
  id: string;
  nom_fichier: string;
  categorie: 'LÉGAL' | 'RH' | 'TECHNIQUE';
  url_fichier: string;
  taille?: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  utilisateur: string;
  action: string;
  details: string;
  created_at: string;
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
  
  // New States
  const [rapports, setRapports] = useState<RapportClinique[]>([]);
  const [archives, setArchives] = useState<ArchiveClinique[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Personnel | null>(null);
  const [uploading, setUploading] = useState(false);
  const [archiveForm, setArchiveForm] = useState({ nom: "", categorie: "LÉGAL" as ArchiveClinique["categorie"] });

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

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        { data: persData, error: persErr }, 
        { data: chmData, error: chmErr }, 
        { data: patData, error: patErr },
        { data: stockData, error: stockErr },
        { data: rapportData, error: rapportErr },
        { data: archiveData, error: archiveErr },
        { data: auditData, error: auditErr }
      ] = await Promise.all([
        supabase.from('personnel_clinique').select('*').order('nom_complet'),
        supabase.from('chambres').select('id, numero').order('numero'),
        supabase.from('patients').select('id, nom_complet'),
        supabase.from('stocks').select('*').order('designation'),
        supabase.from('rapports_clinique').select('*').order('created_at', { ascending: false }),
        supabase.from('archives_clinique').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
      ]);
      
      if (persErr) console.error("Erreur personnel:", persErr);
      if (chmErr) console.error("Erreur chambres:", chmErr);
      if (patErr) console.error("Erreur patients:", patErr);
      if (stockErr) console.error("Erreur stocks:", stockErr);
      if (rapportErr) console.error("Erreur rapports:", rapportErr);
      if (archiveErr) console.error("Erreur archives:", archiveErr);
      if (auditErr) console.error("Erreur audit:", auditErr);

      setPersonnel(persData || []);
      setChambres(chmData || []);
      setPatientsHospitalises(patData || []);
      setStocks(stockData || []);
      setRapports(rapportData || []);
      setArchives(archiveData || []);
      setAuditLogs(auditData || []);

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

  const recordAudit = async (action: string, details: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert([{
      utilisateur: user?.email || 'Système',
      action,
      details,
      created_at: new Date().toISOString()
    }]);
  };

  const handleUpdateStaffNotes = async () => {
    if (!selectedStaff) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('personnel_clinique')
        .update({ notes_administratives: selectedStaff.notes_administratives })
        .eq('id', selectedStaff.id);
      
      if (error) throw error;
      toast.success("Fiche RH mise à jour");
      recordAudit("MODIFICATION_RH", `Notes administratives modifiées pour ${selectedStaff.nom_complet}`);
      fetchData();
      setSelectedStaff(null);
    } catch (err: any) {
      toast.error("Erreur lors de la mise à jour: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadArchive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('archives')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('archives')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('archives_clinique')
        .insert([{
          nom_fichier: archiveForm.nom || file.name,
          categorie: archiveForm.categorie,
          url_fichier: publicUrl,
          taille: (file.size / 1024 / 1024).toFixed(2) + " MB"
        }]);

      if (dbError) throw dbError;

      toast.success("Document archivé avec succès");
      recordAudit("ARCHIVAGE", `Nouveau document: ${archiveForm.nom || file.name} (${archiveForm.categorie})`);
      fetchData();
      setArchiveForm({ nom: "", categorie: "LÉGAL" });
    } catch (err: any) {
      toast.error("Erreur d'archivage: " + err.message);
    } finally {
      setUploading(false);
    }
  };

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
      recordAudit("CRÉATION_TÂCHE", `Nouvelle tâche: ${newTask.titre}`);
      fetchData();
      toast.success("Tâche enregistrée");
    } catch (err: any) {
      toast.error(err.message);
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
      recordAudit("STATUT_TÂCHE", `Tâche "${task.titre}" passée à ${newStatus}`);
      fetchData();
    } catch (err) {
      console.error("Erreur update tâche:", err);
    }
  };

  const handleCreateGardeRapport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("rapports_clinique")
        .insert([{
          type_rapport: "GARDE",
          auteur: personnel.find(p => p.id === gardeForm.medecin_id)?.nom_complet || "Inconnu",
          contenu: gardeForm
        }]);
      
      if (error) throw error;
      toast.success("Rapport de Garde Enregistré");
      recordAudit("RAPPORT_GARDE", "Enregistrement d'un nouveau rapport de garde");
      setGardeForm({
        medecin_id: "",
        soins: "",
        evenements: "",
        transmissions: "",
        chambre_transmissions: []
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
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
      recordAudit("RÉCEPTION_STOCK", `Réception de ${newStock.quantite_actuelle} unités de ${newStock.designation}`);
      fetchData();
      toast.success("Stock mis à jour");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateMonthlyReport = () => {
    const printContent = `
      <div class="p-12 font-sans">
        <h1 class="text-3xl font-black uppercase text-slate-900 border-b-4 border-red-600 pb-4 mb-8">Rapport Mensuel Riverside • Douala</h1>
        <div class="grid grid-cols-2 gap-8 mb-12">
          <div class="bg-slate-50 p-6 rounded-2xl">
            <p class="text-[10px] font-black uppercase text-slate-400 mb-2">Effectif Global</p>
            <p class="text-2xl font-black text-slate-900">${personnel.length} Collaborateurs</p>
          </div>
          <div class="bg-slate-50 p-6 rounded-2xl">
            <p class="text-[10px] font-black uppercase text-slate-400 mb-2">Alertes Stock</p>
            <p class="text-2xl font-black text-red-600">${stocks.filter(s => s.quantite_actuelle <= s.seuil_alerte).length} Ruptures</p>
          </div>
        </div>
        <div class="space-y-6">
          <h2 class="text-xl font-black uppercase text-slate-800">Derniers Audit Logs</h2>
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-slate-900 text-white"><th class="p-2 text-left">Date</th><th class="p-2 text-left">Utilisateur</th><th class="p-2 text-left">Action</th></tr>
            </thead>
            <tbody>
              ${auditLogs.slice(0, 10).map(log => `
                <tr class="border-b border-slate-100">
                  <td class="p-2">${new Date(log.created_at).toLocaleDateString()}</td>
                  <td class="p-2">${log.utilisateur}</td>
                  <td class="p-2 font-bold">${log.action}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p class="mt-20 text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest">Document officiel Riverside Medical Center - Généré le ${new Date().toLocaleDateString()}</p>
      </div>
    `;
    
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<html><head><title>Rapport Riverside</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"></head><body>${printContent}</body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-8 pb-32 px-4 md:px-8 bg-slate-50/20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 pt-8">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-riverside-red rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-red-200">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-4xl font-black text-slate-950 tracking-tight">
              Riverside <span className="text-riverside-red">Hub</span>
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] ml-1 opacity-70">Centre de contrôle administratif et stratégique</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-white/80 backdrop-blur-xl p-1.5 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100/50 gap-1 overflow-x-auto no-scrollbar">
          {(["taches", "personnel", "rapports", "archives", "audit", "stocks"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 text-[10px] uppercase tracking-widest font-black rounded-2xl transition-all duration-300 whitespace-nowrap",
                activeTab === tab 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab === "taches" ? "Tâches" : tab === "personnel" ? "Personnel" : tab === "rapports" ? "Rapports" : tab === "archives" ? "Archives" : tab === "audit" ? "Audit" : "Stocks"}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-12 right-12 z-[100]">
        <motion.button 
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGenerateMonthlyReport}
          className="group bg-slate-950 text-white px-8 py-5 rounded-[2.5rem] shadow-2xl shadow-slate-400/30 border border-white/10 flex items-center gap-4 hover:shadow-black/20 transition-all font-inter"
        >
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-riverside-red transition-colors">
            <Printer size={20} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest leading-none">Rapport Mensuel PDF</span>
        </motion.button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3.5rem] border border-slate-200/60 shadow-2xl shadow-slate-200/40 overflow-hidden min-h-[750px] flex flex-col"
      >
        <div className="px-12 py-10 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-white relative gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
              {activeTab === "taches" ? <ClipboardList size={28} /> : activeTab === "personnel" ? <Users size={28} /> : activeTab === "archives" ? <FolderOpen size={28} /> : activeTab === "audit" ? <Lock size={28} /> : <FileText size={28} />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">
                {activeTab === "taches" ? "Gestion des Tâches" : activeTab === "personnel" ? "Dossiers RH Numériques" : activeTab === "rapports" ? "Archives Cliniques & Gardes" : activeTab === "archives" ? "Coffre-fort Documentaire" : activeTab === "audit" ? "Audit & Transparence" : "Gestion des Stocks"}
              </h2>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Flux de données Riverside • Sécurité Certifiée</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            {activeTab === "archives" && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                <input type="text" placeholder="Nom du document..." className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-300 w-full sm:w-64" value={archiveForm.nom} onChange={e => setArchiveForm({...archiveForm, nom: e.target.value})} />
                <select className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none" value={archiveForm.categorie} onChange={e => setArchiveForm({...archiveForm, categorie: e.target.value as any})}>
                  <option value="LÉGAL">LÉGAL</option>
                  <option value="RH">RH</option>
                  <option value="TECHNIQUE">TECHNIQUE</option>
                </select>
                <label className="cursor-pointer px-8 py-4 bg-slate-950 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
                  {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} 
                  {uploading ? "SYNC..." : "Téléverser"}
                  <input type="file" className="hidden" onChange={handleUploadArchive} disabled={uploading} />
                </label>
              </div>
            )}
            {activeTab === "taches" && (
              <button onClick={() => setShowTaskForm(true)} className="px-8 py-4 bg-riverside-red text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-riverside-red-hover transition-all flex items-center justify-center gap-3 ml-auto shadow-xl shadow-red-100">
                <Plus size={18} /> Nouvelle Tâche
              </button>
            )}
            {activeTab === "stocks" && (
              <button onClick={() => setShowStockForm(true)} className="px-8 py-4 bg-slate-950 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 ml-auto">
                <Plus size={18} /> Entrée Stock
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-12 overflow-y-auto max-h-[75vh] scrollbar-hide bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-40 gap-6">
              <Loader2 className="animate-spin text-riverside-red font-light" size={64} strokeWidth={1} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Initialisation du Hub Riverside...</p>
            </div>
          ) : activeTab === "taches" ? (
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic text-[11px] uppercase font-black tracking-widest opacity-40">Aucune mission en cours</div>
              ) : (
                tasks.map(task => (
                  <motion.div layout key={task.id} whileHover={{ x: 6, borderColor: "rgba(220, 38, 38, 0.2)" }} className={cn("group flex items-center justify-between p-6 rounded-[2rem] border transition-all cursor-pointer", task.statut === "Terminé" ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200 shadow-sm")}>
                    <div className="flex items-center gap-6">
                      <button onClick={() => toggleTaskStatus(task)} className={cn("transition-all duration-500", task.statut === "Terminé" ? "text-emerald-500 scale-110" : "text-slate-200 hover:text-riverside-red hover:scale-110")}>
                        {task.statut === "Terminé" ? <CheckCircle2 size={28} strokeWidth={2.5} /> : <Circle size={28} strokeWidth={2} />}
                      </button>
                      <div>
                        <p className={cn("text-base font-black tracking-tight transition-all", task.statut === "Terminé" ? "text-slate-400 line-through" : "text-slate-900")}>{task.titre}</p>
                        <div className="flex items-center gap-3 mt-1.5 shadow-sm w-fit rounded-full overflow-hidden">
                          <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1", priorityColors[task.priorite])}>{task.priorite}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : activeTab === "personnel" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {personnel.map(p => (
                <motion.div key={p.id} whileHover={{ y: -8 }} onClick={() => setSelectedStaff(p)} className="bg-slate-50/40 p-8 rounded-[3rem] border border-slate-100 hover:border-riverside-red/20 hover:bg-white hover:shadow-2xl transition-all cursor-pointer group text-center">
                  <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-slate-300 group-hover:text-riverside-red border border-slate-100 shadow-sm mx-auto mb-6 transition-all duration-300">
                    <UserCog size={44} strokeWidth={1} />
                  </div>
                  <h4 className="text-xl font-black text-slate-950 tracking-tight leading-none mb-2">{p.nom_complet}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">{p.fonction}</p>
                </motion.div>
              ))}
            </div>
          ) : activeTab === "rapports" ? (
            <div className="space-y-16">
              <div className="bg-slate-950 p-12 rounded-[4rem] text-white">
                <h3 className="text-2xl font-black uppercase tracking-tight mb-8">Nouveau Rapport de Garde</h3>
                <form onSubmit={handleCreateGardeRapport} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <select required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-riverside-red" value={gardeForm.medecin_id} onChange={e => setGardeForm({...gardeForm, medecin_id: e.target.value})}>
                      <option value="" className="text-slate-900">Médecin responsable...</option>
                      {personnel.map(p => <option key={p.id} value={p.id} className="text-slate-900">{p.nom_complet}</option>)}
                    </select>
                    <input className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-riverside-red" placeholder="Détails évènements..." value={gardeForm.evenements} onChange={e => setGardeForm({...gardeForm, evenements: e.target.value})} />
                  </div>
                  <textarea className="w-full p-6 bg-white/5 border border-white/10 rounded-[2.5rem] text-white outline-none focus:border-riverside-red h-40 resize-none" placeholder="Transmissions techniques..." value={gardeForm.transmissions} onChange={e => setGardeForm({...gardeForm, transmissions: e.target.value})} />
                  <button disabled={submitting} className="md:col-span-2 py-6 bg-riverside-red text-white font-black text-[11px] uppercase tracking-[0.4em] rounded-[2rem] shadow-2xl hover:scale-105 transition-all">SCELLER LE RAPPORT</button>
                </form>
              </div>
              <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl">
                <table className="w-full">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    <tr><th className="p-8 text-left">Date Riverside</th><th className="p-8 text-left">Type</th><th className="p-8 text-left">Signataire</th><th className="p-8 text-right">Téléchargement</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rapports.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-8 font-black text-slate-900">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="p-8"><span className="px-3 py-1 bg-red-100 text-riverside-red rounded-lg text-[9px] font-black uppercase">{r.type_rapport}</span></td>
                        <td className="p-8 font-bold text-slate-600">{r.auteur}</td>
                        <td className="p-8 text-right"><button onClick={() => window.print()} className="p-3 text-slate-400 hover:text-riverside-red transition-all"><Download size={20} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === "archives" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {(['LÉGAL', 'RH', 'TECHNIQUE'] as const).map(cat => (
                <div key={cat} className="bg-slate-50/40 p-10 rounded-[3.5rem] border border-slate-100 min-h-[500px]">
                  <h4 className="text-sm font-black text-slate-950 uppercase tracking-[0.2em] mb-10 pb-6 border-b border-slate-200">{cat}</h4>
                  <div className="space-y-4">
                    {archives.filter(a => a.categorie === cat).map(a => (
                      <div key={a.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group shadow-sm">
                        <div className="flex items-center gap-4">
                          <FileText className="text-slate-400" size={20} />
                          <p className="text-[12px] font-black text-slate-950 line-clamp-1">{a.nom_fichier}</p>
                        </div>
                        <a href={a.url_fichier} target="_blank" rel="noopener" className="p-2 text-slate-400 hover:text-riverside-red transition-all"><Download size={16} /></a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "audit" ? (
            <div className="space-y-12">
              <div className="p-10 bg-emerald-50/40 border border-emerald-100 rounded-[3rem] flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-[2rem] text-emerald-600 flex items-center justify-center shadow-lg"><Lock size={36} /></div>
                  <div><h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Le Verrou du Patron</h3><p className="text-[11px] font-black text-emerald-700 uppercase opacity-70 tracking-widest">Traçabilité Immuable</p></div>
                </div>
                <div className="bg-emerald-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Sécurité Active</div>
              </div>
              <div className="bg-white border border-slate-100 rounded-[4rem] overflow-hidden shadow-2xl">
                <table className="w-full">
                  <thead className="bg-slate-950 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    <tr><th className="p-10 text-left">Horodatage</th><th className="p-10 text-left">Utilisateur</th><th className="p-10 text-left">Action</th><th className="p-10 text-left">Preuves</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-all font-mono text-[11px]">
                        <td className="p-10 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-10 font-bold">{log.utilisateur}</td>
                        <td className="p-10"><span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg font-black">{log.action}</span></td>
                        <td className="p-10 text-slate-600 italic">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {stocks.map(item => (
                <div key={item.id} className="p-8 bg-white border border-slate-200 rounded-[3rem] shadow-sm relative overflow-hidden group">
                  {item.quantite_actuelle <= item.seuil_alerte && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black uppercase px-4 py-2 flex items-center gap-2">
                       ALERTE STOCK
                    </div>
                  )}
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.categorie}</p>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight mb-8">{item.designation}</h4>
                  <div className="flex justify-between items-end border-t border-slate-100 pt-6">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Quantité</p><p className={cn("text-3xl font-black", item.quantite_actuelle <= item.seuil_alerte ? "text-red-700" : "text-slate-900")}>{item.quantite_actuelle}</p></div>
                    <div className="text-right text-[10px] font-black text-slate-400 uppercase"><p>Seuil</p><p>{item.seuil_alerte}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* MODALS */}
      <AnimatePresence>
        {selectedStaff && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedStaff(null)} className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[1001]" />
            <motion.div initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }} exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} className="fixed top-1/2 left-1/2 w-[95%] max-w-3xl bg-white rounded-[4rem] z-[1002] p-16 shadow-2xl">
              <div className="flex items-center justify-between mb-12 border-b pb-8 border-slate-100">
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-riverside-red shadow-inner"><UserCog size={48} strokeWidth={1} /></div>
                  <div><h3 className="text-3xl font-black text-slate-950 uppercase tracking-tight">{selectedStaff.nom_complet}</h3><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fiche Numérique Riverside</p></div>
                </div>
                <button onClick={() => window.print()} className="px-8 py-5 bg-slate-50 rounded-[2rem] text-slate-900 flex items-center gap-4 hover:scale-105 transition-all"><Printer size={20} className="text-riverside-red" /><span className="text-[11px] font-black uppercase tracking-widest">PDF FICHE PERSONNEL</span></button>
              </div>
              <textarea className="w-full p-10 bg-slate-50 border border-slate-100 rounded-[3rem] h-64 outline-none focus:border-riverside-red text-base font-bold shadow-inner" placeholder="Notes confidentielles..." value={selectedStaff.notes_administratives || ""} onChange={e => setSelectedStaff({...selectedStaff, notes_administratives: e.target.value})} />
              <div className="flex gap-6 mt-10"><button onClick={() => setSelectedStaff(null)} className="flex-1 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Fermer</button><button disabled={submitting} onClick={handleUpdateStaffNotes} className="flex-[2] py-6 bg-slate-950 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-2xl">VALIDER LES MODIFICATIONS RH</button></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTaskForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTaskForm(false)} className="fixed inset-0 bg-slate-950/70 backdrop-blur-lg z-[1001]" />
            <motion.div initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }} exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} className="fixed top-1/2 left-1/2 w-[95%] max-w-lg bg-white rounded-[4rem] z-[1002] p-12 shadow-2xl">
              <h3 className="text-2xl font-black text-slate-950 uppercase mb-8 text-center">Définir Mission</h3>
              <form onSubmit={handleCreateTask} className="space-y-6">
                <input required value={newTask.titre} onChange={e => setNewTask({...newTask, titre: e.target.value})} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold" placeholder="Titre mission..." />
                <select value={newTask.priorite} onChange={e => setNewTask({...newTask, priorite: e.target.value as any})} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:border-riverside-red">
                  <option value="Basse">Basse</option><option value="Normale">Normale</option><option value="Haute">Haute</option><option value="Urgence">URGENCE CRITIQUE</option>
                </select>
                <button disabled={submitting} type="submit" className="w-full py-5 bg-riverside-red text-white uppercase font-black text-[11px] tracking-widest rounded-2xl shadow-xl">LANCER LA MISSION</button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStockForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStockForm(false)} className="fixed inset-0 bg-slate-950/70 backdrop-blur-lg z-[1001]" />
            <motion.div initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }} exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} className="fixed top-1/2 left-1/2 w-[95%] max-w-lg bg-white rounded-[4rem] z-[1002] p-12 shadow-2xl">
              <h3 className="text-2xl font-black text-slate-950 uppercase mb-8 text-center text-riverside-red">Réception Stock</h3>
              <form onSubmit={handleCreateStock} className="space-y-6">
                <input required value={newStock.designation} onChange={e => setNewStock({...newStock, designation: e.target.value})} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold" placeholder="Désignation..." />
                <select className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase opacity-60" value={newStock.categorie} onChange={e => setNewStock({...newStock, categorie: e.target.value})}>
                  <option value="">Choisir...</option><option value="Consommable">Consommable</option><option value="Médicament">Médicament</option><option value="Maintenance">Maintenance</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" required placeholder="Qté" className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={newStock.quantite_actuelle} onChange={e => setNewStock({...newStock, quantite_actuelle: parseInt(e.target.value)})} />
                  <input type="number" required placeholder="Seuil" className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={newStock.seuil_alerte} onChange={e => setNewStock({...newStock, seuil_alerte: parseInt(e.target.value)})} />
                </div>
                <button disabled={submitting} type="submit" className="w-full py-5 bg-slate-950 text-white uppercase font-black text-[11px] tracking-widest rounded-2xl shadow-xl">ENREGISTRER ENTRÉE</button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
