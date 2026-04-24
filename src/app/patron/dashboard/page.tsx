"use client";

import React, { useState } from "react";
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
  LineChart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import ReactMarkdown from "react-markdown";

export default function PatronDashboard() {
  const [query, setQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [kpis, setKpis] = useState<any>(null);

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
      setKpis(data.kpis);
    } catch (error) {
      console.error("Erreur:", error);
      setReport("Une erreur est survenue lors de l'analyse. Vérifiez vos clés API.");
    } finally {
      setAnalyzing(false);
    }
  };

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
        
        <div className="flex items-center gap-4">
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

      {/* AI Search Bar */}
      <div className="mb-12">
        <div className="relative group max-w-4xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-riverside-red/50 to-blue-500/50 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative flex items-center bg-[#141416] border border-slate-800 rounded-2xl p-2 pl-6 shadow-2xl">
            <Search className="text-slate-500 mr-4" size={24} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Posez une question stratégique à l'IA... (ex: 'Analyse ma rentabilité locale')"
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-600 text-lg py-4"
              onKeyDown={(e) => e.key === 'Enter' && !analyzing && startAnalysis()}
            />
            <button 
              onClick={startAnalysis}
              disabled={analyzing}
              className={cn(
                "ml-4 px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95",
                analyzing 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-riverside-red text-white hover:bg-riverside-red-hover shadow-lg shadow-riverside-red/20"
              )}
            >
              {analyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Analyse...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  Lancer l'Analyse
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KPIWidget 
          label="Chiffre d'Affaires" 
          value={kpis?.revenu ? `${(kpis.revenu / 1000000).toFixed(1)}M FCFA` : "4.5M FCFA"} 
          change="+12.5%" 
          icon={CreditCard}
        />
        <KPIWidget 
          label="Flux Patients" 
          value={kpis?.patients ? kpis.patients.toString() : "120"} 
          change="+5.2%" 
          icon={Users}
        />
        <KPIWidget 
          label="Marge Opérationnelle" 
          value={kpis ? `${((kpis.revenu - kpis.depenses) / 1000000).toFixed(1)}M` : "1.7M"} 
          change="-2.1%" 
          icon={LineChart}
          isWarning
        />
        <KPIWidget 
          label="Part de Marché (Est.)" 
          value="18%" 
          change="+0.8%" 
          icon={Target}
        />
      </div>

      {/* AI Report Section */}
      <AnimatePresence>
        {(analyzing || report) && (
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
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-riverside-red animate-pulse" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Confidentialité Maximale</span>
                </div>
              </div>
              
              <div className="p-8 md:p-12 min-h-[400px]">
                {analyzing ? (
                  <div className="flex flex-col items-center justify-center h-full py-20">
                     <Loader2 className="animate-spin text-riverside-red mb-6" size={48} />
                     <p className="text-slate-400 font-medium animate-pulse">Extraction des données de santé transversales...</p>
                     <div className="mt-8 flex gap-2">
                        <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce" />
                     </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-headings:tracking-tighter prose-p:text-slate-400 prose-p:leading-relaxed prose-strong:text-riverside-red">
                    <ReactMarkdown>
                      {report || "L'analyse n'a renvoyé aucun résultat."}
                    </ReactMarkdown>
                  </div>
                )}
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
    <div className="bg-[#141416] border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <Icon className={cn("text-slate-500 group-hover:text-riverside-red transition-colors", isWarning && "text-amber-500")} size={20} />
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded",
          isWarning ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
        )}>
          {change}
        </span>
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-white tracking-tighter">{value}</h3>
    </div>
  );
}
