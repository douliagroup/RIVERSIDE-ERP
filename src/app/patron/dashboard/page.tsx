"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Search, 
  TrendingUp, 
  Target, 
  Zap, 
  ArrowRight,
  Loader2,
  Sparkles,
  CreditCard,
  Users,
  LineChart,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  History,
  TrendingDown,
  Wallet,
  Clock,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PatronDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // States for KPIs
  const [stats, setStats] = useState({
    caisseJour: 0,
    depensesJour: 0,
    resteARecouvrer: 0,
    patientsConsultes: 0
  });

  // States for sections
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // 1. KPIs
      // Caisse du jour
      const { data: caisseData } = await supabase
        .from('transactions_caisse')
        .select('montant_verse')
        .gte('date_transaction', todayISO);
      
      const caisseTotal = (caisseData || []).reduce((acc, curr) => acc + (curr.montant_verse || 0), 0);

      // Dépenses Validées
      const { data: depensesData } = await supabase
        .from('depenses_caisse')
        .select('montant')
        .eq('statut_validation', 'Approuvé')
        .gte('date_depense', todayISO);
      
      const depensesTotal = (depensesData || []).reduce((acc, curr) => acc + (curr.montant || 0), 0);

      // Reste à Recouvrer
      const { data: resteData } = await supabase
        .from('transactions_caisse')
        .select('reste_a_payer');
      
      const resteTotal = (resteData || []).reduce((acc, curr) => acc + (curr.reste_a_payer || 0), 0);

      // Patients Consultés
      const { count: consultationsCount } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      setStats({
        caisseJour: caisseTotal,
        depensesJour: depensesTotal,
        resteARecouvrer: resteTotal,
        patientsConsultes: consultationsCount || 0
      });

      // 2. Pending Expenses
      const { data: pExpenses } = await supabase
        .from('depenses_caisse')
        .select('*, liste_beneficiaires(nom)')
        .eq('statut_validation', 'En attente')
        .order('date_depense', { ascending: false });
      setPendingExpenses(pExpenses || []);

      // 3. Stock Alerts
      const { data: sAlerts } = await supabase
        .from('stocks')
        .select('*');
      
      // Filter stocks with quantity <= alert threshold
      const filteredAlerts = (sAlerts || []).filter(s => s.quantite_actuelle <= s.seuil_alerte);
      setStockAlerts(filteredAlerts);

      // 4. Audit Logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setAuditLogs(logs || []);

    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('depenses_caisse')
        .update({ 
          statut_validation: 'Approuvé',
          valide_par: user?.user_metadata?.full_name || 'Direction'
        })
        .eq('id', id);
      
      if (error) throw error;
      toast.success("Dépense approuvée !");
      fetchData();
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    }
  };

  const handleRejectExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('depenses_caisse')
        .update({ 
          statut_validation: 'Rejeté',
          valide_par: user?.user_metadata?.full_name || 'Direction'
        })
        .eq('id', id);
      
      if (error) throw error;
      toast.success("Dépense rejetée !");
      fetchData();
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    }
  };

  const startAnalysis = async () => {
    setAnalyzing(true);
    setReport(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setReport(data.report);
    } catch (error) {
      console.error("Erreur:", error);
      setReport("Une erreur est survenue lors de l'analyse. Vérifiez vos clés API.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0B]">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-riverside-red mx-auto" size={48} />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse">Chargement du Centre de Commandement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 -m-4 md:-m-8 p-4 md:p-8 font-sans selection:bg-riverside-red/30">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 text-riverside-red mb-2">
            <ShieldAlert size={18} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Accès Restreint • Direction Générale</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tighter sm:text-5xl">
            Command Center
          </h1>
          <p className="text-slate-500 mt-2 max-w-md">Pilotage stratégique assisté par IA pour Riverside Medical Center.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push("/admission?new=true")}
            className="hidden md:flex items-center gap-2 bg-riverside-red text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-105 transition-all"
          >
            <Zap size={16} /> Nouvelle Admission
          </button>
          
          <div className="h-10 w-[1px] bg-slate-800 hidden md:block" />
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statut Systèmes</p>
             <p className="text-emerald-500 text-xs font-bold flex items-center justify-end gap-1.5 mt-1">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               Connecté à Gemini 3 Flash
             </p>
          </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KPIWidget 
          label="Caisse du Jour" 
          value={`${stats.caisseJour.toLocaleString()} FCFA`} 
          change="Aujourd'hui" 
          icon={Wallet}
        />
        <KPIWidget 
          label="Dépenses Validées" 
          value={`${stats.depensesJour.toLocaleString()} FCFA`} 
          change="Aujourd'hui" 
          icon={TrendingDown}
          isWarning={stats.depensesJour > (stats.caisseJour * 0.5)}
        />
        <KPIWidget 
          label="Reste à Recouvrer" 
          value={`${stats.resteARecouvrer.toLocaleString()} FCFA`} 
          change="Global" 
          icon={LineChart}
          isWarning={stats.resteARecouvrer > 1000000}
        />
        <KPIWidget 
          label="Patients Consultés" 
          value={stats.patientsConsultes.toString()} 
          change="Aujourd'hui" 
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        
        {/* Expense Validation Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#141416] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <ShieldAlert size={120} />
            </div>

            <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Décaissements en attente</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Validation requise par la direction</p>
              </div>
              <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-riverside-red animate-pulse" />
                 <span className="text-[10px] font-bold text-riverside-red uppercase">{pendingExpenses.length} EN ATTENTE</span>
              </div>
            </div>

            <div className="p-0">
              {pendingExpenses.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center justify-center text-slate-500 gap-4">
                  <CheckCircle2 size={48} className="text-emerald-500/50" />
                  <p className="text-sm font-bold uppercase tracking-widest">Aucune dépense en attente de validation</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Motif & Bénéficiaire</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Montant</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-riverside-red transition-colors">{exp.motif}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <p className="text-[10px] text-slate-500 font-bold uppercase">{exp.liste_beneficiaires?.nom || "Inconnu"}</p>
                                <span className="text-slate-700">•</span>
                                <p className="text-[10px] text-slate-600 font-mono tracking-tighter" suppressHydrationWarning>
                                  {new Date(exp.date_depense).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-black text-white tabular-nums">
                              {exp.montant.toLocaleString()} <span className="text-[10px] text-slate-500">FCFA</span>
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center gap-3">
                              {exp.piece_jointe_url && (
                                <a 
                                  href={exp.piece_jointe_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg"
                                  title="Voir Justificatif"
                                >
                                  <Eye size={18} />
                                </a>
                              )}
                              <button 
                                onClick={() => handleApproveExpense(exp.id)}
                                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2"
                              >
                                <CheckCircle2 size={16} /> Approuver
                              </button>
                              <button 
                                onClick={() => handleRejectExpense(exp.id)}
                                className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-riverside-red hover:text-white transition-all shadow-lg flex items-center gap-2"
                              >
                                <XCircle size={16} /> Rejeter
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis Section moved here */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-riverside-red/50 to-blue-500/50 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
            <div className="relative bg-[#141416] border border-slate-800 rounded-3xl p-6 shadow-2xl flex items-center gap-6">
              <div className="w-14 h-14 bg-riverside-red/10 rounded-2xl flex items-center justify-center text-riverside-red">
                <Sparkles size={28} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold tracking-tight">Assistant Stratégique IA</h3>
                <p className="text-slate-500 text-xs mt-1">Interrogez les données cliniques en langage naturel pour des insights immédiats.</p>
              </div>
              <div className="relative flex-1 max-w-md">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: Analyse la productivité du labo..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-riverside-red transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && !analyzing && startAnalysis()}
                />
                <button 
                  onClick={startAnalysis}
                  disabled={analyzing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-riverside-red text-white rounded-lg"
                >
                  {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Stock Alerts & Audit Log */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Stock Alerts Pane */}
          <div className="bg-[#141416] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
             <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-500" size={18} />
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Alertes Stocks</h3>
                </div>
                <Users size={16} className="text-slate-600" />
             </div>
             <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide">
                {stockAlerts.length === 0 ? (
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center py-10">Aucune alerte en cours</p>
                ) : (
                  stockAlerts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-amber-500/30 transition-all">
                      <div>
                        <p className="text-xs font-bold text-white leading-none">{item.designation}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1.5">{item.categorie}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-amber-500">{item.quantite_actuelle} {item.unite}</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">Seuil: {item.seuil_alerte}</p>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>

          {/* Audit Log / Feed */}
          <div className="bg-[#141416] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
             <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="text-riverside-red" size={18} />
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Transparence (Audit)</h3>
                </div>
                <Clock size={16} className="text-slate-600" />
             </div>
             <div className="p-6">
                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative pl-8">
                       <div className="absolute left-0 top-1 w-4 h-4 bg-slate-900 border-2 border-slate-700 rounded-full z-10" />
                       <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-tight leading-none">{log.action}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded uppercase">{log.utilisateur}</span>
                            <span className="text-[9px] text-slate-600 font-mono italic" suppressHydrationWarning>
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-[10px] text-slate-600 mt-2 italic line-clamp-1 group-hover:line-clamp-none transition-all cursor-help" title={log.details}>
                              {log.details}
                            </p>
                          )}
                       </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-4">Aucune activité récente</p>
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* AI Report Section (Collapse/Modal or fixed area) */}
      <AnimatePresence>
        {report && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="mb-12"
          >
            <div className="bg-[#141416] border border-slate-800 rounded-3xl overflow-hidden glass-morphism shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-riverside-red">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Rapport Stratégique IA</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Analyse contextuelle temps réel</p>
                  </div>
                </div>
                <button 
                  onClick={() => setReport(null)}
                  className="p-2 hover:bg-white/5 rounded-lg text-slate-500"
                >
                  <XCircle size={20} />
                </button>
              </div>
              
              <div className="p-8 md:p-12 min-h-[400px]">
                <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-headings:tracking-tighter prose-p:text-slate-400 prose-p:leading-relaxed prose-strong:text-riverside-red">
                  <ReactMarkdown>
                    {report || "L'analyse n'a renvoyé aucun résultat."}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="px-8 py-6 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                <button className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-2 group uppercase tracking-widest">
                  Sauvegarder le Rapport
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-[10px] text-slate-600 font-mono tracking-tighter">RSV-CMD-CENTER-v1.2-ALPHA</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Pattern Background Accent */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>
    </div>
  );
}

function KPIWidget({ label, value, change, icon: Icon, isWarning }: { label: string, value: string, change: string, icon: any, isWarning?: boolean }) {
  return (
    <div className="bg-[#141416] border border-slate-800 p-6 rounded-3xl hover:border-slate-700 transition-all group relative overflow-hidden">
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all text-white">
        <Icon size={120} />
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isWarning ? "bg-amber-500/10 text-amber-500" : "bg-white/5 text-slate-400 group-hover:text-riverside-red group-hover:bg-riverside-red/10 transition-all")}>
          <Icon size={20} />
        </div>
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1",
          isWarning ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
        )}>
          {isWarning ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
          {change}
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
        <h3 className="text-2xl font-black text-white tracking-tight">{value}</h3>
      </div>
    </div>
  );
}
