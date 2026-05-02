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
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";

import { generatePDF } from "@/src/lib/pdfGenerator";
import { PDFTemplates } from "@/src/components/PDFTemplates";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!authLoading && userRole && userRole !== 'patron' && userRole !== 'personnel' && userRole !== 'administratif') {
      router.push('/');
    }
  }, [userRole, authLoading, router]);

  const [activeTab, setActiveTab] = useState<TabType>("taches");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [patientsHospitalises, setPatientsHospitalises] = useState<any[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  
  const [rapports, setRapports] = useState<RapportClinique[]>([]);
  const [archives, setArchives] = useState<ArchiveClinique[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Personnel | null>(null);
  const [uploading, setUploading] = useState(false);
  const [archiveForm, setArchiveForm] = useState({ nom: "", categorie: "LÉGAL" as ArchiveClinique["categorie"] });

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({ titre: "", priorite: "Normale" as Task["priorite"] });
  const [newStock, setNewStock] = useState({ designation: "", categorie: "", quantite_actuelle: 0, seuil_alerte: 10 });
  const [printingRapport, setPrintingRapport] = useState<RapportClinique | null>(null);
  const [rapportType, setRapportType] = useState<"GARDE" | "REUNION">("GARDE");

  const CHAMBRES = ["211", "210", "209", "208", "207", "205", "204", "202", "P4"];
  const ESPACES = ["Accueil", "Couloirs", "Toilettes", "Salle Cons. 1/2", "Laboratoire", "Cour", "Cuisine"];

  const [gardeForm, setGardeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    heure_debut: "19:00",
    heure_fin: "08:00",
    medecin_id: "",
    prise_service: [{ nom: "", prenom: "" }, { nom: "", prenom: "" }],
    patients_en_salle: CHAMBRES.reduce((acc, c) => ({ ...acc, [c]: "" }), {} as Record<string, string>),
    soins: { surveillance: "", technique: "", relationnel: "" },
    admissions_sorties: CHAMBRES.reduce((acc, c) => ({ ...acc, [c]: { patient: "", heure_adm: "", heure_sortie: "" } }), {} as Record<string, any>),
    difficultes: "",
    transmissions: "",
    espaces_nettoyes: ""
  });

  const [reunionForm, setReunionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    heure_debut: "08:00",
    heure_fin: "09:00",
    dirige_par: "",
    presences: Array(10).fill({ nom: "", prenom: "" }),
    rapport_veille: { technique: "", autres: "" },
    besoins: Array(5).fill(""),
    planification: {
      stats: { nbPatients: 0, assures: 0, nonAssures: 0 },
      patients: CHAMBRES.reduce((acc, c) => ({ ...acc, [c]: { nom: "", assurance: "", entreprise: "" } }), {} as Record<string, any>),
      personnel_med: CHAMBRES.reduce((acc, c) => ({ ...acc, [c]: "" }), {} as Record<string, string>),
    },
    espaces: ESPACES.reduce((acc, e) => ({ ...acc, [e]: "" }), {} as Record<string, string>),
    autres_activites: ""
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: persData, error: persErr }, 
        { data: rhData, error: rhErr },
        { data: chmData, error: chmErr }, 
        { data: patData, error: patErr },
        { data: stockData, error: stockErr },
        { data: rapportData, error: rapportErr },
        { data: archiveData, error: archiveErr },
        { data: auditData, error: auditErr }
      ] = await Promise.all([
        supabase.from('personnel_clinique').select('*').order('nom_complet'),
        supabase.from('dossiers_rh').select('*').order('nom_complet'),
        supabase.from('chambres').select('id, numero').order('numero'),
        supabase.from('patients').select('id, nom_complet'),
        supabase.from('stocks').select('*').order('designation'),
        supabase.from('rapports_clinique').select('*').order('created_at', { ascending: false }),
        supabase.from('archives_clinique').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
      ]);
      
      if (persErr) console.error("Erreur personnel:", persErr);
      if (rhErr) console.warn("Erreur dossiers_rh:", rhErr);
      if (chmErr) console.error("Erreur chambres:", chmErr);
      if (patErr) console.error("Erreur patients:", patErr);
      if (stockErr) console.error("Erreur stocks:", stockErr);
      if (rapportErr) console.error("Erreur rapports:", rapportErr);
      if (archiveErr) console.error("Erreur archives:", archiveErr);
      if (auditErr) console.error("Erreur audit:", auditErr);

      const finalPersonnel = rhData && rhData.length > 0 ? rhData : persData || [];
      setPersonnel(finalPersonnel);
      setChambres(chmData || []);
      setPatientsHospitalises(patData || []);
      setStocks(stockData || []);
      setRapports(rapportData || []);
      setArchives(archiveData || []);
      setAuditLogs(auditData || []);

      const { data: taskData, error: taskErr } = await supabase
        .from("taches_clinique")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!taskErr) setTasks(taskData || []);

    } catch (err) {
      console.warn(`[Admin] Erreur fatale lors du chargement:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, fetchData]);

  const recordAudit = async (action: string, details: string) => {
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
      const isGarde = rapportType === "GARDE";
      const currentForm = isGarde ? gardeForm : reunionForm;
      const auteurId = isGarde ? gardeForm.medecin_id : reunionForm.dirige_par;
      const auteurName = personnel.find(p => p.id === auteurId)?.nom_complet || "Inconnu";

      const { error } = await supabase
        .from("rapports_clinique")
        .insert([{
          type_rapport: rapportType,
          auteur: auteurName,
          contenu: { ...currentForm, type_selection: rapportType }
        }]);
      
      if (error) throw error;
      toast.success("Rapport Officiel Enregistré et Scellé");
      recordAudit(`RAPPORT_${rapportType}`, `Enregistrement d'un rapport premium de ${rapportType.toLowerCase()}`);
      
      // Reset logic
      if (isGarde) {
        setGardeForm({
          date: new Date().toISOString().split('T')[0],
          heure_debut: "19:00",
          heure_fin: "08:00",
          medecin_id: "",
          prise_service: [{ nom: "", prenom: "" }, { nom: "", prenom: "" }],
          patients_en_salle: CHAMBRES.reduce((acc, c) => ({ ...acc, [c]: "" }), {} as Record<string, string>),
          soins: { surveillance: "", technique: "", relationnel: "" },
          admissions_sorties: CHAMBRES.reduce((acc, c) => ({ ...acc, [c]: { patient: "", heure_adm: "", heure_sortie: "" } }), {} as Record<string, any>),
          difficultes: "",
          transmissions: "",
          espaces_nettoyes: ""
        });
      } else {
        setReunionForm({
          date: new Date().toISOString().split('T')[0],
          heure_debut: "08:00",
          heure_fin: "09:00",
          dirige_par: "",
          presences: Array(10).fill({ nom: "", prenom: "" }),
          rapport_veille: { technique: "", autres: "" },
          besoins: Array(5).fill(""),
          planification: {
            stats: { nbPatients: 0, assures: 0, nonAssures: 0 },
            patients: CHAMBRES.reduce((acc, c) => ({ ...acc, [c]: { nom: "", assurance: "", entreprise: "" } }), {} as Record<string, any>),
            personnel_med: CHAMBRES.reduce((acc, c) => ({ ...acc, [c]: "" }), {} as Record<string, string>),
          },
          espaces: ESPACES.reduce((acc, e) => ({ ...acc, [e]: "" }), {} as Record<string, string>),
          autres_activites: ""
        });
      }
      
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

  const handleGenerateMonthlyReport = async () => {
    try {
      toast.loading("Génération du rapport mensuel stratégique...");
      // On utilise le hub-content pour capturer l'état actuel ou un élément spécifique
      await generatePDF('admin-content', `Rapport_Mensuel_Riverside_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
      toast.dismiss();
      toast.success("Rapport exporté avec succès");
    } catch (err) {
      toast.dismiss();
      toast.error("Échec de la génération du rapport");
    }
  };

  const handleDownloadRapportPDF = async (rapport: RapportClinique) => {
    const templateId = "admin-rapport-template";
    const element = document.getElementById(templateId);
    if (!element) {
      toast.error("Template non trouvé");
      return;
    }

    try {
      toast.loading("Génération du document officiel...");
      setPrintingRapport(rapport);
      await new Promise(r => setTimeout(r, 150));

      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Rapport_Riverside_${rapport.type_rapport}_${rapport.created_at ? new Date(rapport.created_at).toLocaleDateString() : 'N/A'}.pdf`);
      toast.dismiss();
      toast.success("Document prêt !");
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Erreur de génération");
    } finally {
      setPrintingRapport(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 pb-32 px-4 md:px-8 bg-slate-50/20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pt-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-riverside-red rounded-2xl flex items-center justify-center text-white shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">
              Riverside <span className="text-riverside-red">Hub</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] opacity-70">Contrôle administratif Riverside</p>
          </div>
        </div>
        
        {/* Tab Switcher - Plus compact */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm gap-0.5 overflow-x-auto no-scrollbar">
          {(["taches", "personnel", "rapports", "archives", "audit", "stocks"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-[9px] uppercase tracking-widest font-black rounded-xl transition-all duration-200 whitespace-nowrap",
                activeTab === tab 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab === "taches" ? "Tâches" : tab === "personnel" ? "Personnel" : tab === "rapports" ? "Rapports" : tab === "archives" ? "Archives" : tab === "audit" ? "Audit" : "Stocks"}
            </button>
          ))}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden min-h-[600px] flex flex-col"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-white relative gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
              {activeTab === "taches" ? <ClipboardList size={22} /> : activeTab === "personnel" ? <Users size={22} /> : activeTab === "archives" ? <FolderOpen size={22} /> : activeTab === "audit" ? <Lock size={22} /> : <FileText size={22} />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                {activeTab === "taches" ? "Tâches" : activeTab === "personnel" ? "Personnel (RH)" : activeTab === "rapports" ? "Rapports" : activeTab === "archives" ? "Archives" : activeTab === "audit" ? "Audit" : "Stocks"}
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Flux Riverside • Sécurisé</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {activeTab === "archives" && (
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Nom..." className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={archiveForm.nom} onChange={e => setArchiveForm({...archiveForm, nom: e.target.value})} />
                <label className="cursor-pointer px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl hover:bg-black transition-all flex items-center gap-2">
                  <Upload size={14} /> Téléverser
                  <input type="file" className="hidden" onChange={handleUploadArchive} disabled={uploading} />
                </label>
              </div>
            )}
            {activeTab === "taches" && (
              <button onClick={() => setShowTaskForm(true)} className="px-6 py-3 bg-riverside-red text-white text-[10px] font-black uppercase rounded-xl shadow-red-100 flex items-center gap-2">
                <Plus size={16} /> Nouvelle Tâche
              </button>
            )}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleGenerateMonthlyReport}
                className="px-4 py-3 bg-slate-950 text-white text-[10px] font-black uppercase rounded-xl flex items-center gap-2 shadow-lg"
              >
                <FileDown size={14} /> Rapport Mensuel
              </button>
              <button 
                onClick={() => generatePDF('admin-content', `Riverside_${activeTab}.pdf`)}
                className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-riverside-red transition-all"
              >
                <Printer size={20} />
              </button>
            </div>
          </div>
        </div>

        <div id="admin-content" className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-[70vh] bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-riverside-red" size={48} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chargement...</p>
            </div>
          ) : activeTab === "taches" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {tasks.map(task => (
                <div key={task.id} className="p-2 rounded-lg border border-slate-100 bg-white shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <button onClick={() => toggleTaskStatus(task)} className={cn(task.statut === "Terminé" ? "text-emerald-500" : "text-slate-200")}>
                        <CheckCircle2 size={18} />
                     </button>
                     <div>
                       <p className={cn("text-[10px] font-black uppercase truncate max-w-[80px]", task.statut === "Terminé" ? "text-slate-300 line-through" : "text-slate-900")}>{task.titre}</p>
                       <span className="text-[7px] font-black uppercase text-slate-400 px-1 py-0.5 bg-slate-50 rounded">{task.priorite}</span>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          ) : activeTab === "personnel" ? (
            <div className="bg-white border border-slate-100 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-2">Employé</th>
                    <th className="px-4 py-2">Poste</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {personnel.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-1.5">
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-riverside-red group-hover:text-white transition-colors">
                             <UserCog size={12} />
                           </div>
                           <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">{p.nom_complet}</p>
                         </div>
                      </td>
                      <td className="px-4 py-1.5 text-[9px] font-bold text-slate-400 uppercase truncate max-w-[100px]">{p.fonction}</td>
                      <td className="px-4 py-1.5 text-right">
                        <button 
                          onClick={() => setSelectedStaff(p)}
                          className="px-2 py-1 bg-slate-900 text-white rounded text-[7px] font-black uppercase hover:bg-riverside-red transition-all"
                        >
                          Fiche RH
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === "rapports" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-12 bg-slate-100 p-4 md:p-8 rounded-[2.5rem]">
                {/* Tabs selection */}
                <div className="flex justify-center mb-8 gap-4">
                  <button 
                    onClick={() => setRapportType("GARDE")}
                    className={cn("px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all tracking-widest", 
                      rapportType === "GARDE" ? "bg-riverside-red text-white shadow-lg shadow-red-200" : "bg-white text-slate-400 hover:text-riverside-red shadow-sm")}
                  >
                    Rapport de Garde
                  </button>
                  <button 
                    onClick={() => setRapportType("REUNION")}
                    className={cn("px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all tracking-widest", 
                      rapportType === "REUNION" ? "bg-riverside-red text-white shadow-lg shadow-red-200" : "bg-white text-slate-400 hover:text-riverside-red shadow-sm")}
                  >
                    Réunion Technique
                  </button>
                </div>

                {/* A4 Document Container */}
                <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm p-12 max-w-5xl mx-auto border border-slate-200 min-h-[29.7cm]">
                  {/* Official Header */}
                  <div className="text-center mb-12 space-y-4 border-b-2 border-riverside-red pb-8">
                    <h2 className="text-2xl font-black text-riverside-red tracking-[0.1em] uppercase leading-tight">
                      R I S I M E D
                    </h2>
                    <h3 className="text-xl font-bold text-slate-900 tracking-wider uppercase">
                      Clinique Riverside Medical Center SARL
                    </h3>
                    <div className="w-16 h-1 bg-slate-900 mx-auto rounded-full" />
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">
                      {rapportType === "GARDE" ? "RAPPORT DE GARDE MÉDICALE" : "RAPPORT DE RÉUNION TECHNIQUE"}
                    </p>
                  </div>

                  <form onSubmit={handleCreateGardeRapport} className="space-y-12 text-slate-800">
                    
                    {/* Header Fields */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">Date</label>
                        <input 
                          type="date" 
                          className="w-full bg-transparent font-bold text-sm outline-none border-b border-slate-300 focus:border-riverside-red transition-all"
                          value={rapportType === "GARDE" ? gardeForm.date : reunionForm.date}
                          onChange={(e) => rapportType === "GARDE" ? setGardeForm({...gardeForm, date: e.target.value}) : setReunionForm({...reunionForm, date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">Début</label>
                        <input 
                          type="time" 
                          className="w-full bg-transparent font-bold text-sm outline-none border-b border-slate-300 focus:border-riverside-red transition-all"
                          value={rapportType === "GARDE" ? gardeForm.heure_debut : reunionForm.heure_debut}
                          onChange={(e) => rapportType === "GARDE" ? setGardeForm({...gardeForm, heure_debut: e.target.value}) : setReunionForm({...reunionForm, heure_debut: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">Fin</label>
                        <input 
                          type="time" 
                          className="w-full bg-transparent font-bold text-sm outline-none border-b border-slate-300 focus:border-riverside-red transition-all"
                          value={rapportType === "GARDE" ? gardeForm.heure_fin : reunionForm.heure_fin}
                          onChange={(e) => rapportType === "GARDE" ? setGardeForm({...gardeForm, heure_fin: e.target.value}) : setReunionForm({...reunionForm, heure_fin: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">{rapportType === "GARDE" ? "Médecin" : "Dirigé par"}</label>
                        <select 
                          required
                          className="w-full bg-transparent font-bold text-[10px] outline-none border-b border-slate-300 focus:border-riverside-red transition-all"
                          value={rapportType === "GARDE" ? gardeForm.medecin_id : reunionForm.dirige_par}
                          onChange={(e) => rapportType === "GARDE" ? setGardeForm({...gardeForm, medecin_id: e.target.value}) : setReunionForm({...reunionForm, dirige_par: e.target.value})}
                        >
                          <option value="">Sélectionner...</option>
                          {personnel.map(p => <option key={p.id} value={p.id}>{p.nom_complet}</option>)}
                        </select>
                      </div>
                    </div>

                    {rapportType === "GARDE" ? (
                      <div className="space-y-12">
                        {/* I - Prise de service */}
                        <section className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">I - Prise de service</h4>
                          <div className="grid grid-cols-2 gap-8">
                            {gardeForm.prise_service.map((ps, idx) => (
                              <div key={idx} className="flex gap-4">
                                <input placeholder="Nom" className="flex-1 p-2 border-b border-slate-300 outline-none text-xs" value={ps.nom} onChange={e => {
                                  const newPS = [...gardeForm.prise_service];
                                  newPS[idx].nom = e.target.value;
                                  setGardeForm({...gardeForm, prise_service: newPS});
                                }} />
                                <input placeholder="Prénom" className="flex-1 p-2 border-b border-slate-300 outline-none text-xs" value={ps.prenom} onChange={e => {
                                  const newPS = [...gardeForm.prise_service];
                                  newPS[idx].prenom = e.target.value;
                                  setGardeForm({...gardeForm, prise_service: newPS});
                                }} />
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* II - Patients en salle */}
                        <section className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">II - Patients en salle(s)</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-200">
                              <thead>
                                <tr>
                                  {CHAMBRES.map(c => <th key={c} className="border border-slate-200 p-2 text-[10px] font-black bg-slate-50 uppercase">{c}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  {CHAMBRES.map(c => (
                                    <td key={c} className="border border-slate-200 p-0">
                                      <input 
                                        className="w-full p-2 text-center text-[10px] outline-none h-12"
                                        value={gardeForm.patients_en_salle[c]}
                                        onChange={e => setGardeForm({
                                          ...gardeForm, 
                                          patients_en_salle: { ...gardeForm.patients_en_salle, [c]: e.target.value }
                                        })}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </section>

                        {/* III - Soins effectués */}
                        <section className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">III - Soins effectués</h4>
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-500">1. Surveillance clinique</label>
                              <textarea className="w-full p-4 border border-slate-200 rounded text-xs h-24 resize-none" value={gardeForm.soins.surveillance} onChange={e => setGardeForm({...gardeForm, soins: {...gardeForm.soins, surveillance: e.target.value}})} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-500">2. Soins techniques</label>
                              <textarea className="w-full p-4 border border-slate-200 rounded text-xs h-24 resize-none" value={gardeForm.soins.technique} onChange={e => setGardeForm({...gardeForm, soins: {...gardeForm.soins, technique: e.target.value}})} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-500">3. Soins relationnels</label>
                              <textarea className="w-full p-4 border border-slate-200 rounded text-xs h-24 resize-none" value={gardeForm.soins.relationnel} onChange={e => setGardeForm({...gardeForm, soins: {...gardeForm.soins, relationnel: e.target.value}})} />
                            </div>
                          </div>
                        </section>

                        {/* IV - Gestion admissions/sorties */}
                        <section className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">IV - Gestion des admissions et sorties</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-200">
                              <thead>
                                <tr>
                                  <th className="border border-slate-200 p-2 text-[10px] font-black bg-slate-50 uppercase text-left w-32">Information</th>
                                  {CHAMBRES.map(c => <th key={c} className="border border-slate-200 p-2 text-[10px] font-black bg-slate-50 uppercase w-28">{c}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-slate-200 p-2 text-[9px] font-black uppercase text-slate-500 bg-white">Pat.</td>
                                  {CHAMBRES.map(c => (
                                    <td key={c} className="border border-slate-200 p-0">
                                      <input 
                                        className="w-full p-2 text-center text-[10px] outline-none"
                                        placeholder="Nom..."
                                        value={gardeForm.admissions_sorties[c].patient}
                                        onChange={e => {
                                          const newAS = {...gardeForm.admissions_sorties};
                                          newAS[c].patient = e.target.value;
                                          setGardeForm({...gardeForm, admissions_sorties: newAS});
                                        }}
                                      />
                                    </td>
                                  ))}
                                </tr>
                                <tr>
                                  <td className="border border-slate-200 p-2 text-[9px] font-black uppercase text-slate-500 bg-white">Adm.</td>
                                  {CHAMBRES.map(c => (
                                    <td key={c} className="border border-slate-200 p-0">
                                      <input 
                                        type="time"
                                        className="w-full p-2 text-center text-[10px] outline-none"
                                        value={gardeForm.admissions_sorties[c].heure_adm}
                                        onChange={e => {
                                          const newAS = {...gardeForm.admissions_sorties};
                                          newAS[c].heure_adm = e.target.value;
                                          setGardeForm({...gardeForm, admissions_sorties: newAS});
                                        }}
                                      />
                                    </td>
                                  ))}
                                </tr>
                                <tr>
                                  <td className="border border-slate-200 p-2 text-[9px] font-black uppercase text-slate-500 bg-white">Sortie</td>
                                  {CHAMBRES.map(c => (
                                    <td key={c} className="border border-slate-200 p-0">
                                      <input 
                                        type="time"
                                        className="w-full p-2 text-center text-[10px] outline-none"
                                        value={gardeForm.admissions_sorties[c].heure_sortie}
                                        onChange={e => {
                                          const newAS = {...gardeForm.admissions_sorties};
                                          newAS[c].heure_sortie = e.target.value;
                                          setGardeForm({...gardeForm, admissions_sorties: newAS});
                                        }}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </section>

                        {/* V-VII - Textareas Finales */}
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">V - Difficultés rencontrées</h4>
                            <textarea className="w-full p-4 border border-slate-200 rounded text-xs h-32 resize-none" value={gardeForm.difficultes} onChange={e => setGardeForm({...gardeForm, difficultes: e.target.value})} />
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">VI - Transmissions inform.</h4>
                            <textarea className="w-full p-4 border border-slate-200 rounded text-xs h-32 resize-none" value={gardeForm.transmissions} onChange={e => setGardeForm({...gardeForm, transmissions: e.target.value})} />
                          </div>
                        </section>
                        
                        <section className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">VII - Salles et espaces nettoyés</h4>
                          <textarea className="w-full p-4 border border-slate-200 rounded text-xs h-24 resize-none" value={gardeForm.espaces_nettoyes} onChange={e => setGardeForm({...gardeForm, espaces_nettoyes: e.target.value})} />
                        </section>
                      </div>
                    ) : (
                      <div className="space-y-12">
                        {/* I - Présences */}
                        <section className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">I - Présences</h4>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            {reunionForm.presences.map((p, idx) => (
                              <div key={idx} className="flex gap-4 items-center">
                                <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}.</span>
                                <input placeholder="Nom" className="flex-1 p-1 border-b border-slate-200 outline-none text-[10px]" value={p.nom} onChange={e => {
                                  const newP = [...reunionForm.presences];
                                  newP[idx] = {...newP[idx], nom: e.target.value};
                                  setReunionForm({...reunionForm, presences: newP});
                                }} />
                                <input placeholder="Prénom" className="flex-1 p-1 border-b border-slate-200 outline-none text-[10px]" value={p.prenom} onChange={e => {
                                  const newP = [...reunionForm.presences];
                                  newP[idx] = {...newP[idx], prenom: e.target.value};
                                  setReunionForm({...reunionForm, presences: newP});
                                }} />
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* II - Rapport de garde veille */}
                        <section className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">II - Rapport de garde de la veille</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-500">Informations techniques/médicales</label>
                              <textarea className="w-full p-4 border border-slate-200 rounded text-xs h-32 resize-none" value={reunionForm.rapport_veille.technique} onChange={e => setReunionForm({...reunionForm, rapport_veille: {...reunionForm.rapport_veille, technique: e.target.value}})} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-500">Autres informations</label>
                              <textarea className="w-full p-4 border border-slate-200 rounded text-xs h-32 resize-none" value={reunionForm.rapport_veille.autres} onChange={e => setReunionForm({...reunionForm, rapport_veille: {...reunionForm.rapport_veille, autres: e.target.value}})} />
                            </div>
                          </div>
                        </section>

                        {/* III - Besoins et commandes */}
                        <section className="space-y-4">
                          <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">III - Besoins et commandes</h4>
                          <div className="space-y-2">
                            {reunionForm.besoins.map((b, idx) => (
                              <div key={idx} className="flex gap-4 items-center">
                                <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}.</span>
                                <input className="flex-1 p-2 border-b border-slate-200 outline-none text-xs" value={b} onChange={e => {
                                  const newB = [...reunionForm.besoins];
                                  newB[idx] = e.target.value;
                                  setReunionForm({...reunionForm, besoins: newB});
                                }} />
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* IV - Planification */}
                        <section className="space-y-8">
                          <h4 className="text-[11px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-sm inline-block">IV - Planification</h4>
                          
                          <div className="grid grid-cols-3 gap-8 bg-slate-50 p-6 rounded-xl">
                            <div className="space-y-2 text-center">
                              <label className="text-[9px] font-black uppercase text-slate-400">Nb Patients en salle</label>
                              <input type="number" className="w-16 mx-auto text-xl font-black bg-transparent text-center outline-none border-b-2 border-slate-200 focus:border-riverside-red" value={reunionForm.planification.stats.nbPatients} onChange={e => setReunionForm({...reunionForm, planification: {...reunionForm.planification, stats: {...reunionForm.planification.stats, nbPatients: parseInt(e.target.value) || 0}}})} />
                            </div>
                            <div className="space-y-2 text-center">
                              <label className="text-[9px] font-black uppercase text-slate-400">Assurés</label>
                              <input type="number" className="w-16 mx-auto text-xl font-black bg-transparent text-center outline-none border-b-2 border-slate-200 focus:border-riverside-red text-emerald-600" value={reunionForm.planification.stats.assures} onChange={e => setReunionForm({...reunionForm, planification: {...reunionForm.planification, stats: {...reunionForm.planification.stats, assures: parseInt(e.target.value) || 0}}})} />
                            </div>
                            <div className="space-y-2 text-center">
                              <label className="text-[9px] font-black uppercase text-slate-400">Non Assurés</label>
                              <input type="number" className="w-16 mx-auto text-xl font-black bg-transparent text-center outline-none border-b-2 border-slate-200 focus:border-riverside-red text-amber-600" value={reunionForm.planification.stats.nonAssures} onChange={e => setReunionForm({...reunionForm, planification: {...reunionForm.planification, stats: {...reunionForm.planification.stats, nonAssures: parseInt(e.target.value) || 0}}})} />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase text-slate-500 italic">Tableau 1 - Patients par chambre</p>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-slate-200">
                                <thead>
                                  <tr>
                                    <th className="border border-slate-200 p-2 text-[9px] font-black bg-slate-50 uppercase text-left w-24">Infos</th>
                                    {CHAMBRES.map(c => <th key={c} className="border border-slate-200 p-2 text-[9px] font-black bg-slate-50 uppercase w-28">{c}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border border-slate-200 p-2 text-[8px] font-black uppercase text-slate-400 bg-white">Pat.</td>
                                    {CHAMBRES.map(c => (
                                      <td key={c} className="border border-slate-200 p-0">
                                        <input className="w-full p-2 text-center text-[9px] outline-none" value={reunionForm.planification.patients[c].nom} onChange={e => {
                                          const newP = {...reunionForm.planification.patients};
                                          newP[c].nom = e.target.value;
                                          setReunionForm({...reunionForm, planification: {...reunionForm.planification, patients: newP}});
                                        }} />
                                      </td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="border border-slate-200 p-2 text-[8px] font-black uppercase text-slate-400 bg-white">Assur.</td>
                                    {CHAMBRES.map(c => (
                                      <td key={c} className="border border-slate-200 p-0">
                                        <input className="w-full p-2 text-center text-[9px] outline-none" value={reunionForm.planification.patients[c].assurance} onChange={e => {
                                          const newP = {...reunionForm.planification.patients};
                                          newP[c].assurance = e.target.value;
                                          setReunionForm({...reunionForm, planification: {...reunionForm.planification, patients: newP}});
                                        }} />
                                      </td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="border border-slate-200 p-2 text-[8px] font-black uppercase text-slate-400 bg-white">Entr.</td>
                                    {CHAMBRES.map(c => (
                                      <td key={c} className="border border-slate-200 p-0">
                                        <input className="w-full p-2 text-center text-[9px] outline-none" value={reunionForm.planification.patients[c].entreprise} onChange={e => {
                                          const newP = {...reunionForm.planification.patients};
                                          newP[c].entreprise = e.target.value;
                                          setReunionForm({...reunionForm, planification: {...reunionForm.planification, patients: newP}});
                                        }} />
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase text-slate-500 italic">Tableau 2 - Personnel par chambre</p>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-slate-200">
                                <thead>
                                  <tr>
                                    <th className="border border-slate-200 p-2 text-[9px] font-black bg-slate-50 uppercase text-left w-24">Poste</th>
                                    {CHAMBRES.map(c => <th key={c} className="border border-slate-200 p-2 text-[9px] font-black bg-slate-50 uppercase w-28">{c}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border border-slate-200 p-2 text-[8px] font-black uppercase text-slate-400 bg-white h-10">Médicaux</td>
                                    {CHAMBRES.map(c => (
                                      <td key={c} className="border border-slate-200 p-0">
                                        <input className="w-full p-2 text-center text-[9px] outline-none" value={reunionForm.planification.personnel_med[c]} onChange={e => {
                                          const newP = {...reunionForm.planification.personnel_med};
                                          newP[c] = e.target.value;
                                          setReunionForm({...reunionForm, planification: {...reunionForm.planification, personnel_med: newP}});
                                        }} />
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase text-slate-500 italic">Tableau 3 - Personnels par espaces</p>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-slate-200">
                                <thead>
                                  <tr>
                                    {ESPACES.map(e => <th key={e} className="border border-slate-200 p-2 text-[9px] font-black bg-slate-50 uppercase w-32">{e}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    {ESPACES.map(esp => (
                                      <td key={esp} className="border border-slate-200 p-0">
                                        <input className="w-full p-2 text-center text-[9px] outline-none" value={reunionForm.espaces[esp]} onChange={e => {
                                          setReunionForm({...reunionForm, espaces: {...reunionForm.espaces, [esp]: e.target.value}});
                                        }} />
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-200">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 italic">Autres activités</label>
                            <textarea className="w-full p-4 border border-slate-200 rounded text-xs h-24 resize-none" value={reunionForm.autres_activites} onChange={e => setReunionForm({...reunionForm, autres_activites: e.target.value})} />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className="text-[10px] font-black uppercase text-slate-500 italic mb-2">Réunion dirigée par</label>
                            <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded font-bold text-sm" placeholder="Nom du responsable..." value={personnel.find(p => p.id === reunionForm.dirige_par)?.nom_complet || ""} readOnly />
                          </div>
                        </section>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-12 text-center">
                      <button 
                        disabled={submitting}
                        type="submit"
                        className="px-16 py-6 bg-riverside-red text-white text-[12px] font-black uppercase tracking-[0.4em] rounded-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-4 mx-auto"
                      >
                        {submitting ? <Loader2 className="animate-spin" size={24} /> : <ClipboardList size={24} />}
                        SCELLER ET ARCHIVER LE DOCUMENT
                      </button>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">
                        Ce document sera scellé numériquement et archivé dans Supabase.
                      </p>
                    </div>
                  </form>
                </div>
              </div>

              {/* Historique simple en bas */}
              <div className="lg:col-span-12 mt-8">
                <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-xl">
                  <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">Archives des Rapports Premium</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-8 py-4 text-left">Date</th>
                          <th className="px-8 py-4 text-left">Type de Document</th>
                          <th className="px-8 py-4 text-left">Signataire</th>
                          <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rapports.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-4 text-[11px] font-black text-slate-900 uppercase">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-8 py-4">
                              <span className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase border", 
                                r.type_rapport === "GARDE" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100")}>
                                {r.type_rapport === "GARDE" ? "Rapport de Garde" : "Réunion Technique"}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-[11px] font-bold text-slate-600 uppercase">{r.auteur}</td>
                            <td className="px-8 py-4 text-right">
                              <button onClick={() => handleDownloadRapportPDF(r)} className="p-2 text-slate-300 hover:text-riverside-red transition-all">
                                 <FileDown size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "archives" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['LÉGAL', 'RH', 'TECHNIQUE'] as const).map(cat => (
                <div key={cat} className="space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{cat}</p>
                  <div className="space-y-2">
                    {archives.filter(a => a.categorie === cat).map(a => (
                      <div key={a.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group">
                        <p className="text-[10px] font-black text-slate-700 line-clamp-1">{a.nom_fichier}</p>
                        <a href={a.url_fichier} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-riverside-red"><Download size={14} /></a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "audit" ? (
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
               <table className="w-full text-left font-mono text-[9px]">
                 <thead className="bg-slate-900 text-slate-400 uppercase">
                   <tr><th className="px-4 py-3">Log</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Preuve</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {auditLogs.map(log => (
                     <tr key={log.id}>
                       <td className="px-4 py-2 text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</td>
                       <td className="px-4 py-2 font-black uppercase text-amber-600">{log.action}</td>
                       <td className="px-4 py-2 text-slate-500">{log.details}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stocks.map(item => (
                <div key={item.id} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm relative group hover:border-riverside-red/30 transition-all">
                  {item.quantite_actuelle <= item.seuil_alerte && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-600 rounded-full m-1.5 animate-pulse" />}
                  <p className="text-[7px] font-black text-slate-300 uppercase leading-none mb-1">{item.categorie}</p>
                  <h4 className="text-[9px] font-black text-slate-900 uppercase truncate mb-2">{item.designation}</h4>
                  <div className="flex items-end justify-between mt-1">
                    <p className={cn("text-base font-black leading-none", item.quantite_actuelle <= item.seuil_alerte ? "text-red-600" : "text-slate-900")}>{item.quantite_actuelle}</p>
                    <p className="text-[7px] font-bold text-slate-200">#STK</p>
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

      <PDFTemplates 
        id="admin-rapport-template" 
        type="RAPPORT_GARDE" 
        data={printingRapport} 
      />
    </div>
  );
}
