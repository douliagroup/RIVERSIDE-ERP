"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  CheckCircle2,
  Printer,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Building2,
  Wallet,
  MoreHorizontal
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PDFTemplates } from "@/src/components/PDFTemplates";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Entry {
  id: string;
  date_operation: string;
  libelle: string;
  montant: number;
  flux: "ENTREE" | "SORTIE" | "BANQUE" | "HORS_CAISSE";
  categorie: string;
  created_at: string;
}

interface CategoryOption {
  id: string;
  nom: string;
  flux_associe: string;
}

const DEFAULT_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function AccountingPage() {
  const { userRole, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
    setForm(prev => ({ ...prev, date_operation: now.toISOString().split('T')[0] }));
    setBudgetForm(prev => ({ ...prev, mois: `${DEFAULT_MONTHS[now.getMonth()]} ${now.getFullYear()}`.toUpperCase() }));
    
    // Auth check
    if (!authLoading && userRole && userRole !== 'patron' && userRole !== 'comptable') {
      router.push('/');
    }
  }, [userRole, authLoading, router]);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [systemCashTotal, setSystemCashTotal] = useState(0);
  const [insuranceInvoices, setInsuranceInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedYear, setSelectedYear] = useState(2024);

  const [form, setForm] = useState({
    date_operation: "",
    libelle: "",
    categorie: "",
    montant: "",
    flux: "ENTREE" as Entry["flux"]
  });

  const [lignesBudgetaires, setLignesBudgetaires] = useState<any[]>([]);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    titre: "",
    categorie: "LOYER",
    prevu: "",
    reel: "",
    mois: ""
  });

  // Calculate filtered stats
  const stats = useMemo(() => {
    const filtered = entries.filter(e => {
      const d = new Date(e.date_operation);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const entrees = filtered.filter(e => e.flux === "ENTREE").reduce((acc, curr) => acc + curr.montant, 0);
    const sorties = filtered.filter(e => e.flux === "SORTIE").reduce((acc, curr) => acc + curr.montant, 0);
    const banque = filtered.filter(e => e.flux === "BANQUE").reduce((acc, curr) => acc + curr.montant, 0);
    const horsCaisse = filtered.filter(e => e.flux === "HORS_CAISSE").reduce((acc, curr) => acc + curr.montant, 0);
    
    // Total Dépenses Réelles (Budget)
    const depensesBudget = lignesBudgetaires
      .filter(l => l.mois === `${DEFAULT_MONTHS[selectedMonth]} ${selectedYear}`.toUpperCase())
      .reduce((acc, curr) => acc + (curr.reel || 0), 0);

    const soldeProvisoire = entrees - sorties;
    const soldeNet = (systemCashTotal + entrees) - (sorties + depensesBudget); // Simplified analysis

    return { filtered, entrees, sorties, banque, horsCaisse, soldeProvisoire, soldeNet, depensesBudget };
  }, [entries, selectedMonth, selectedYear, systemCashTotal, lignesBudgetaires]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch manual entries
      const [
        { data: entryData, error: entryError },
        { data: catData },
        { data: budgetData, error: budgetErr }
      ] = await Promise.all([
        supabase.from('comptabilite_manuelle').select('*').order('date_operation', { ascending: false }),
        supabase.from('categories_comptables').select('*').order('nom'),
        supabase.from('lignes_budgetaires').select('*').order('created_at', { ascending: false })
      ]);
      
      if (entryError) throw entryError;
      setEntries(entryData || []);
      setCategories(catData || []);
      setLignesBudgetaires(budgetData || []);

      // 3. System Audit - Cash Total for current month
      const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      const { data: sysData } = await supabase
        .from('transactions_caisse')
        .select('montant_total, methode_paiement')
        .gte('date_transaction', startOfMonth)
        .lte('date_transaction', endOfMonth)
        .eq('methode_paiement', 'Cash');
      
      const totalCash = sysData?.reduce((acc, curr) => acc + (curr.montant_total || 0), 0) || 0;
      setSystemCashTotal(totalCash);

      // 4. Insurance Invoices
      const { data: factData, error: factError } = await supabase
        .from('factures')
        .select('*, patients(nom_complet)')
        .gt('part_assurance', 0)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (factError) {
        const { data: txAssurance } = await supabase
          .from('transactions_caisse')
          .select('*, patients(nom_complet)')
          .eq('methode_paiement', 'Assurance')
          .gte('date_transaction', startOfMonth)
          .lte('date_transaction', endOfMonth);
        setInsuranceInvoices(txAssurance || []);
      } else {
        setInsuranceInvoices(factData || []);
      }

    } catch (err) {
      console.error("Erreur fetch comptabilité:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, fetchData]);

  const handleCreateBudgetLine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('lignes_budgetaires')
        .insert([{
          ...budgetForm,
          prevu: parseFloat(budgetForm.prevu),
          reel: parseFloat(budgetForm.reel)
        }]);
      
      if (error) throw error;
      toast.success("Ligne budgétaire ajoutée");
      setShowBudgetForm(false);
      setBudgetForm({ titre: "", categorie: "LOYER", prevu: "", reel: "", mois: `${DEFAULT_MONTHS[selectedMonth]} ${selectedYear}`.toUpperCase() });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categorie || !form.montant) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comptabilite_manuelle')
        .insert([{
          ...form,
          montant: parseFloat(form.montant)
        }]);
      
      if (error) throw error;
      
      toast.success("Écriture enregistrée");
      setForm({
        date_operation: new Date().toISOString().split('T')[0],
        libelle: "",
        categorie: "",
        montant: "",
        flux: "ENTREE"
      });
      fetchData();
    } catch (err: any) {
      console.error("Erreur insertion:", err);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const fetched = categories.filter(c => c.flux_associe === form.flux);
    if (fetched.length > 0) return fetched;
    
    // Fallback if DB is empty
    const fallbacks = [
      { id: 'f1', nom: 'Achats et Fournitures', flux_associe: 'SORTIE' },
      { id: 'f2', nom: 'Salaires', flux_associe: 'SORTIE' },
      { id: 'f3', nom: 'Loyer', flux_associe: 'SORTIE' },
      { id: 'f4', nom: 'Taxes', flux_associe: 'SORTIE' },
      { id: 'f5', nom: 'Maintenance', flux_associe: 'SORTIE' },
      { id: 'f6', nom: 'Consultations', flux_associe: 'ENTREE' },
      { id: 'f7', nom: 'Pharmacie', flux_associe: 'ENTREE' },
      { id: 'f8', nom: 'Laboratoire', flux_associe: 'ENTREE' },
      { id: 'f9', nom: 'Hospitalisation', flux_associe: 'ENTREE' },
    ];
    return fallbacks.filter(c => c.flux_associe === form.flux) as CategoryOption[];
  }, [categories, form.flux]);

  const handlePrint = async () => {
    const templateId = "bilan-comptable-template";
    const element = document.getElementById(templateId);
    if (!element) {
      toast.error("Template non trouvé");
      return;
    }

    try {
      toast.loading("Génération du Rapport Financier...");
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Rapport_Financier_Riverside_${DEFAULT_MONTHS[selectedMonth]}_${selectedYear}.pdf`);
      toast.dismiss();
      toast.success("Rapport PDF généré !");
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Erreur lors de la génération");
    }
  };

  const gap = stats.entrees - systemCashTotal;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans print:bg-white print:p-0 overflow-x-hidden">
      
      {/* HEADER & SELECTORS */}
      <div className="max-w-7xl mx-auto print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Comptabilité Riverside</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Registre financier & Audit</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 bg-transparent text-sm font-black text-slate-700 outline-none border-none cursor-pointer"
            >
              {DEFAULT_MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-transparent text-sm font-black text-slate-700 outline-none border-none cursor-pointer"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Recettes</p>
            <h3 className="text-2xl font-black text-emerald-600 tabular-nums">{stats.entrees.toLocaleString()} <span className="text-[10px] opacity-60">FCFA</span></h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-red-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full blur-xl -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Total Dépenses (Audit)</p>
            <h3 className="text-2xl font-black text-red-600 tabular-nums relative z-10">{(stats.sorties + stats.depensesBudget).toLocaleString()} <span className="text-[10px] opacity-60">FCFA</span></h3>
          </div>
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Flux Combiné</p>
            <h3 className="text-2xl font-black tabular-nums">{(stats.entrees + systemCashTotal).toLocaleString()} <span className="text-[10px] opacity-60">FCFA</span></h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Immobilisation</p>
            <h3 className="text-2xl font-black text-blue-600 tabular-nums">{stats.banque.toLocaleString()} <span className="text-[10px] opacity-60">FCFA</span></h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-xl shadow-emerald-50">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Solde Net Stratégique</p>
            <h3 className="text-2xl font-black text-emerald-700 tabular-nums">{stats.soldeNet.toLocaleString()} <span className="text-[10px] opacity-60">FCFA</span></h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          
          {/* LEFT: FORM & BUDGET */}
          <div className="lg:col-span-4 lg:sticky lg:top-10 h-fit space-y-6">
            
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[10px] font-black uppercase text-slate-900">Lignes Budgétaires</h3>
                <button onClick={() => setShowBudgetForm(true)} className="p-1 px-3 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase">Ajouter</button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {lignesBudgetaires
                  .filter(l => l.mois === `${DEFAULT_MONTHS[selectedMonth]} ${selectedYear}`.toUpperCase())
                  .map(l => (
                  <div key={l.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group">
                    <div>
                      <p className="text-[9px] font-black text-slate-800 uppercase leading-none mb-1">{l.titre}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{l.categorie}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-900 leading-none">{l.reel?.toLocaleString()}</p>
                       <p className="text-[7px] font-bold text-slate-300">/ {l.prevu?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {lignesBudgetaires.filter(l => l.mois === `${DEFAULT_MONTHS[selectedMonth]} ${selectedYear}`.toUpperCase()).length === 0 && (
                  <p className="text-[9px] text-center text-slate-300 italic py-4">Aucun budget défini pour ce mois</p>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 py-2 border-b border-slate-50 flex items-center gap-2">
                <Plus size={16} className="text-riverside-red" />
                Nouvelle Écriture
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Flux</label>
                    <select 
                      value={form.flux}
                      onChange={(e) => setForm({...form, flux: e.target.value as Entry["flux"], categorie: ""})}
                      className={cn(
                        "w-full p-4 rounded-2xl text-[10px] font-black uppercase outline-none transition-all border",
                        form.flux === "ENTREE" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                        form.flux === "SORTIE" ? "bg-red-50 border-red-100 text-red-600" :
                        form.flux === "BANQUE" ? "bg-blue-50 border-blue-100 text-blue-600" :
                        "bg-slate-100 border-slate-200 text-slate-600"
                      )}
                    >
                      <option value="ENTREE">ENTRÉE</option>
                      <option value="SORTIE">SORTIE</option>
                      <option value="BANQUE">DÉPÔT BANQUE</option>
                      <option value="HORS_CAISSE">HORS CAISSE</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Date</label>
                    <input 
                      type="date"
                      value={form.date_operation}
                      onChange={(e) => setForm({...form, date_operation: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold outline-none focus:border-riverside-red"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Catégorie</label>
                  <select 
                    value={form.categorie}
                    onChange={(e) => setForm({...form, categorie: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black outline-none focus:border-riverside-red uppercase"
                  >
                    <option value="">-- Choisir --</option>
                    {filteredCategories.map(c => (
                      <option key={c.id} value={c.nom}>{c.nom}</option>
                    ))}
                    <option value="Autre">Autre...</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Désignation (Optionnel)</label>
                  <input 
                    placeholder="Libellé de l'opération..."
                    value={form.libelle}
                    onChange={(e) => setForm({...form, libelle: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold outline-none focus:border-riverside-red"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Montant (FCFA)</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={form.montant}
                    onChange={(e) => setForm({...form, montant: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-mono font-black outline-none focus:border-riverside-red"
                  />
                </div>

                <button 
                  disabled={submitting}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : "Enregistrer la ligne"}
                </button>
              </form>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-1000" />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                <AlertCircle size={16} className="text-riverside-red" />
                Audit Système
              </h2>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Recettes Manuelles</span>
                  <span className="text-xs font-black text-slate-900 tabular-nums">{stats.entrees.toLocaleString()} FCFA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Ventes Espèces (Sys)</span>
                  <span className="text-xs font-black text-slate-600 tabular-nums">{systemCashTotal.toLocaleString()} FCFA</span>
                </div>
                <div className={cn(
                  "p-4 rounded-2xl flex flex-col gap-1 items-center justify-center",
                  gap !== 0 ? "bg-red-50 border border-red-100" : "bg-emerald-50 border border-emerald-100"
                )}>
                  <span className="text-[8px] font-black uppercase opacity-60">Écart Détecté</span>
                  <span className={cn(
                    "text-xl font-black tabular-nums",
                    gap !== 0 ? "text-red-600" : "text-emerald-600"
                  )}>
                    {gap > 0 ? "+" : ""}{gap.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: JOURNAL & BILAN */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="bg-white p-2 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[500px] flex flex-col">
              <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest">Journal de Caisse</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit du mois: {DEFAULT_MONTHS[selectedMonth]} {selectedYear}</p>
                </div>
                <button 
                  onClick={handlePrint}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                >
                  <Printer size={14} /> Générer Rapport PDF
                </button>
              </div>

              <div className="px-6 pb-10 space-y-2 mt-4 flex-1">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="animate-spin text-slate-200" size={32} />
                  </div>
                ) : stats.filtered.length === 0 ? (
                  <div className="h-60 flex flex-col items-center justify-center text-slate-300 italic text-sm">
                    <FileText className="mb-4 opacity-10" size={64} />
                    Aucune donnée pour ce mois.
                  </div>
                ) : (
                  stats.filtered.map(item => (
                    <div key={item.id} className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-100 border border-transparent rounded-2xl transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                          item.flux === "ENTREE" ? "bg-emerald-50 text-emerald-600" :
                          item.flux === "SORTIE" ? "bg-red-50 text-red-600" : 
                          item.flux === "BANQUE" ? "bg-blue-50 text-blue-600" : 
                          "bg-slate-200 text-slate-500"
                        )}>
                          {item.flux === "ENTREE" ? <Plus size={16} /> : 
                           item.flux === "BANQUE" ? <Building2 size={16} /> :
                           <ArrowDownRight size={16} />}
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1" suppressHydrationWarning>
                            {mounted && (item.date_operation ? new Date(item.date_operation).toLocaleDateString() : 'N/A')} • {item.categorie}
                          </p>
                          <p className="text-xs font-bold text-slate-700">{item.libelle || item.categorie}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-black tabular-nums",
                          item.flux === "ENTREE" ? "text-emerald-600" : "text-red-600"
                        )}>
                           {item.flux === "ENTREE" ? "+" : "-"} {(item.montant || 0).toLocaleString()}
                        </p>
                        <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest italic">FCFA</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h2 className="text-xs font-black text-slate-950 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Wallet size={16} className="text-blue-500" />
                Détails Assurances (Facturation Libre)
              </h2>
              <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead>
                     <tr className="border-b border-slate-50">
                       <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contrat</th>
                       <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                       <th className="text-right py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Part Assurance</th>
                       <th className="text-right py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {insuranceInvoices.map((inv, idx) => (
                       <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                         <td className="py-4 text-[10px] font-black text-slate-600 uppercase italic">{inv.methode_paiement || "Convention"}</td>
                         <td className="py-4 text-xs font-bold text-slate-800">{inv.patients?.nom_complet || "Patient Externe"}</td>
                         <td className="py-4 text-right text-xs font-black tabular-nums text-blue-600">{(inv.part_assurance || inv.montant_total).toLocaleString()} FCFA</td>
                         <td className="py-4 text-right">
                           <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase">Archivé</span>
                         </td>
                       </tr>
                     ))}
                     {insuranceInvoices.length === 0 && (
                       <tr>
                         <td colSpan={4} className="py-10 text-center text-[10px] font-bold text-slate-300 uppercase italic">Aucune facture assurance trouvée pour ce mois</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* PRINT VERSION (HIDDEN BY DEFAULT) */}
      <div className="hidden print:block w-full max-w-none px-12 py-16 bg-white font-serif text-slate-900">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-12">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">Riverside Medical Center SARL</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Douala - Cameroun • Tél: +237 6XX XXX XXX</p>
          </div>
          <div className="text-right">
            <div className="bg-slate-900 text-white px-6 py-2 text-xs font-black uppercase tracking-widest mb-2">Rapport Comptable Mensuel</div>
            <p className="text-lg font-black uppercase italic">{DEFAULT_MONTHS[selectedMonth]} {selectedYear}</p>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-black uppercase mb-6 bg-slate-50 p-3 border-l-4 border-emerald-600">Section 1: Journal des Entrées</h2>
          {Object.entries(
            stats.filtered
              .filter(e => e.flux === "ENTREE")
              .reduce((acc, curr) => {
                if (!acc[curr.categorie]) acc[curr.categorie] = [];
                acc[curr.categorie].push(curr);
                return acc;
              }, {} as Record<string, Entry[]>)
          ).map(([cat, items]) => (
            <div key={cat} className="mb-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 px-2">{cat}</h3>
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border p-3 text-left text-[10px] font-black uppercase w-32">Date</th>
                    <th className="border p-3 text-left text-[10px] font-black uppercase">Désignation</th>
                    <th className="border p-3 text-right text-[10px] font-black uppercase w-40">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(e => (
                    <tr key={e.id}>
                      <td className="border p-3 text-xs" suppressHydrationWarning>{mounted && (e.date_operation ? new Date(e.date_operation).toLocaleDateString() : 'N/A')}</td>
                      <td className="border p-3 text-xs">{e.libelle || e.categorie}</td>
                      <td className="border p-3 text-right text-xs font-black tabular-nums">{(e.montant || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50/50">
                    <td colSpan={2} className="border p-3 text-right text-[10px] font-black uppercase">Sous-total {cat}</td>
                    <td className="border p-3 text-right text-xs font-black tabular-nums">{items.reduce((s, i) => s + i.montant, 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          <div className="bg-emerald-600 text-white p-4 flex justify-between items-center rounded-lg shadow-sm">
            <span className="text-xs font-black uppercase">TOTAL GÉNÉRAL RECETTES</span>
            <span className="text-xl font-black tabular-nums underline">{stats.entrees.toLocaleString()} FCFA</span>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-black uppercase mb-6 bg-slate-50 p-3 border-l-4 border-red-600">Section 2: Journal des Dépenses</h2>
          {Object.entries(
            stats.filtered
              .filter(e => e.flux === "SORTIE")
              .reduce((acc, curr) => {
                if (!acc[curr.categorie]) acc[curr.categorie] = [];
                acc[curr.categorie].push(curr);
                return acc;
              }, {} as Record<string, Entry[]>)
          ).map(([cat, items]) => (
            <div key={cat} className="mb-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 px-2">{cat}</h3>
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border p-3 text-left text-[10px] font-black uppercase w-32">Date</th>
                    <th className="border p-3 text-left text-[10px] font-black uppercase">Désignation</th>
                    <th className="border p-3 text-right text-[10px] font-black uppercase w-40">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(e => (
                    <tr key={e.id}>
                      <td className="border p-3 text-xs" suppressHydrationWarning>{mounted && (e.date_operation ? new Date(e.date_operation).toLocaleDateString() : 'N/A')}</td>
                      <td className="border p-3 text-xs">{e.libelle || e.categorie}</td>
                      <td className="border p-3 text-right text-xs font-black tabular-nums">{(e.montant || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-red-50/50">
                    <td colSpan={2} className="border p-3 text-right text-[10px] font-black uppercase">Sous-total {cat}</td>
                    <td className="border p-3 text-right text-xs font-black tabular-nums">{items.reduce((s, i) => s + i.montant, 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          <div className="bg-red-600 text-white p-4 flex justify-between items-center rounded-lg shadow-sm">
            <span className="text-xs font-black uppercase">TOTAL GÉNÉRAL DÉPENSES</span>
            <span className="text-xl font-black tabular-nums underline">{stats.sorties.toLocaleString()} FCFA</span>
          </div>
        </section>

        <section className="mb-12 page-break-before">
          <h2 className="text-xl font-black uppercase mb-6 bg-slate-100 p-3">Section 3: Synthèse & Bilan</h2>
          <div className="grid grid-cols-1 gap-2 max-w-md ml-auto">
             <div className="flex justify-between p-2 border-b">
               <span className="text-xs uppercase font-bold">Solde Provisoire (A - B)</span>
               <span className="text-xs font-black">{stats.soldeProvisoire.toLocaleString()} FCFA</span>
             </div>
             <div className="flex justify-between p-2 border-b text-blue-600">
               <span className="text-xs uppercase font-bold">Dépôts Banque</span>
               <span className="text-xs font-black">({stats.banque.toLocaleString()}) FCFA</span>
             </div>
             <div className="flex justify-between p-4 bg-emerald-900 text-white rounded mt-4">
               <span className="text-sm uppercase font-black">SOLDE NET EN CAISSE</span>
               <span className="text-lg font-black">{stats.soldeNet.toLocaleString()} FCFA</span>
             </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-black uppercase mb-6 bg-slate-50 p-3 border-l-4 border-blue-600">Section 4: État des Factures Assurances</h2>
          <table className="w-full border-collapse">
            <thead>
               <tr className="bg-slate-100">
                 <th className="border p-2 text-left text-[9px] font-black uppercase">Convention</th>
                 <th className="border p-2 text-left text-[9px] font-black uppercase">Patient</th>
                 <th className="border p-2 text-right text-[9px] font-black uppercase">Montant Attendu</th>
               </tr>
            </thead>
            <tbody>
              {insuranceInvoices.map((inv, idx) => (
                <tr key={idx}>
                  <td className="border p-2 text-[10px]">{inv.methode_paiement || "Standard"}</td>
                  <td className="border p-2 text-xs">{inv.patients?.nom_complet || "Externe"}</td>
                  <td className="border p-2 text-right text-[10px] font-black tabular-nums">{(inv.part_assurance || inv.montant_total || 0).toLocaleString()} FCFA</td>
                </tr>
              ))}
              {insuranceInvoices.length === 0 && (
                <tr><td colSpan={3} className="border p-6 text-center text-xs italic">Néant</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <div className="mt-32 flex justify-between">
           <div className="text-center">
             <p className="text-[10px] font-black uppercase mb-16 underline">Signature Comptable</p>
             <p className="text-xs font-bold">M. BISSAI Salomon R</p>
           </div>
           <div className="text-center">
             <p className="text-[10px] font-black uppercase mb-16 underline">Visa Direction</p>
             <p className="text-xs font-bold italic">Pour Ordre, Riverside Medical Center</p>
           </div>
        </div>
      </div>

      {/* Hidden Templates */}
      <PDFTemplates 
        id="bilan-comptable-template" 
        type="BILAN_COMPTABLE" 
        data={{
          mois: DEFAULT_MONTHS[selectedMonth],
          annee: selectedYear,
          recettes: (stats.entrees + systemCashTotal),
          depenses: (stats.sorties + stats.depensesBudget),
          banque: stats.banque,
          lignes: lignesBudgetaires.filter(l => l.mois === DEFAULT_MONTHS[selectedMonth].toUpperCase())
        }} 
      />

      {/* Budget Modal */}
      <AnimatePresence>
        {showBudgetForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBudgetForm(false)} className="fixed inset-0 bg-slate-950/70 backdrop-blur-lg z-[1001]" />
            <motion.div initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }} exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }} className="fixed top-1/2 left-1/2 w-[95%] max-w-lg bg-white rounded-[4rem] z-[1002] p-12 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-950 uppercase">Ligne Budgétaire</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Configuration du provisionnement</p>
                </div>
              </div>

              <form onSubmit={handleCreateBudgetLine} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Intitulé du poste</label>
                  <input required value={budgetForm.titre} onChange={e => setBudgetForm({...budgetForm, titre: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red font-bold text-sm" placeholder="Ex: Loyer Avril, Maintenance..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Budget Prévu</label>
                    <input type="number" required value={budgetForm.prevu} onChange={e => setBudgetForm({...budgetForm, prevu: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Décaissé (Réel)</label>
                    <input type="number" required value={budgetForm.reel} onChange={e => setBudgetForm({...budgetForm, reel: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none" placeholder="0" />
                  </div>
                </div>

                <button disabled={submitting} type="submit" className="w-full py-5 bg-riverside-red text-white uppercase font-black text-[11px] tracking-widest rounded-3xl shadow-xl shadow-red-100 mt-4 active:scale-95 transition-all">
                  ACTUALISER LE TABLEAU DE BORD
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          nav, aside, .print-hidden {
            display: none !important;
          }
          .page-break-before {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
}
