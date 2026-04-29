"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Heart, 
  Cake, 
  MessageCircle, 
  Megaphone, 
  Send, 
  Calendar, 
  Settings, 
  Plus, 
  Search, 
  Loader2,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
  PenTool,
  Copy,
  Zap,
  Globe,
  Share2
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { GoogleGenAI } from "@google/genai";

interface Campaign {
  id: string;
  titre: string;
  contenu: string;
  statut: "Brouillon" | "Envoyé" | "Programmé";
  cible: string;
  date_envoi?: string;
  created_at: string;
}

interface AlertPatient {
  id: string;
  nom_complet: string;
  telephone: string;
  type: "ANNIVERSAIRE" | "SUIVI";
  info: string;
}

export default function DouliaLovePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [birthdayPatients, setBirthdayPatients] = useState<AlertPatient[]>([]);
  const [followupPatients, setFollowupPatients] = useState<AlertPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState<"dashboard" | "ia">("dashboard");

  // IA Generator State
  const [iaForm, setIaForm] = useState({
    theme: "",
    plateforme: "Facebook",
    ton: "Éducatif"
  });
  const [generatedPost, setGeneratedPost] = useState("");
  const [generatingIa, setGeneratingIa] = useState(false);

  const [form, setForm] = useState({
    titre: "",
    contenu: "",
    cible: "Tous les patients",
    statut: "Brouillon" as Campaign["statut"]
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Campaigns
      const { data: qCam } = await supabase
        .from('campagnes_doulia_love')
        .select('*')
        .order('created_at', { ascending: false });
      setCampaigns(qCam || []);

      // 2. Fetch Birthdays (today is Day-Month)
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      
      const { data: qPat } = await supabase.from('patients').select('id, nom_complet, telephone, date_naissance');
      const bdays = (qPat || []).filter(p => {
        if (!p.date_naissance) return false;
        const d = new Date(p.date_naissance);
        return (d.getMonth() + 1) === month && d.getDate() === day;
      }).map(p => ({
        id: p.id,
        nom_complet: p.nom_complet,
        telephone: p.telephone,
        type: "ANNIVERSAIRE" as const,
        info: "Fête son anniversaire aujourd'hui !"
      }));
      setBirthdayPatients(bdays);

      // 3. Fetch Follow-ups (exactly 3 days ago)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const start = new Date(threeDaysAgo.setHours(0,0,0,0)).toISOString();
      const end = new Date(threeDaysAgo.setHours(23,59,59,999)).toISOString();

      const { data: qConsult } = await supabase
        .from('consultations')
        .select('*, patients(nom_complet, telephone)')
        .gte('created_at', start)
        .lte('created_at', end);
      
      const follows = (qConsult || []).map((c: any) => ({
        id: c.id,
        nom_complet: c.patients?.nom_complet || "Inconnu",
        telephone: c.patients?.telephone || "N/A",
        type: "SUIVI" as const,
        info: `Consulté il y a 3 jours pour: ${c.motif_visite || 'Routine'}`
      }));
      setFollowupPatients(follows);

    } catch (err) {
      console.error("Doulia Love data error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendSMS = (patient: AlertPatient) => {
    const message = patient.type === "ANNIVERSAIRE" 
      ? `Toute l'équipe de Riverside vous souhaite un joyeux anniversaire ! ✨`
      : `Bonjour ${patient.nom_complet}, comment vous sentez-vous suite à votre visite à Riverside ? N'hésitez pas à nous écrire en cas de besoin.`;

    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: `Envoi du SMS DOULIA Love à ${patient.nom_complet}...`,
        success: `Message DOULIA Love envoyé avec succès à ${patient.telephone}`,
        error: "Erreur lors de l'envoi"
      }
    );
  };

  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('campagnes_doulia_love')
        .insert([form]);
      
      if (error) throw error;
      toast.success("Campagne créée");
      setShowCampaignModal(false);
      setForm({ titre: "", contenu: "", cible: "Tous les patients", statut: "Brouillon" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sendCampaign = async (id: string, titre: string) => {
    try {
      const { error } = await supabase
        .from('campagnes_doulia_love')
        .update({ statut: "Envoyé", date_envoi: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Campagne "${titre}" déclenchée avec succès !`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleGeneratePost = async () => {
    if (!iaForm.theme) return toast.error("Veuillez saisir un thème");
    
    setGeneratingIa(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `Génère un post pour les réseaux sociaux pour une clinique médicale nommée Riverside.
      Thème: ${iaForm.theme}
      Plateforme: ${iaForm.plateforme}
      Ton: ${iaForm.ton}
      Inclus des emojis pertinents et des hashtags. Le contenu doit être engageant et inciter à l'action ou à la réflexion sur la santé.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setGeneratedPost(response.text || "Erreur de génération");
      toast.success("Contenu généré ! ✨");
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur IA: " + err.message);
    } finally {
      setGeneratingIa(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPost);
    toast.success("Copié dans le presse-papiers !");
  };

  return (
    <div className="min-h-screen bg-rose-50/30 p-6 md:p-10 font-sans overflow-x-hidden relative">
      
      {/* LABEL DISCRET */}
      <div className="fixed bottom-6 right-8 text-[8px] font-black text-rose-300 uppercase tracking-[0.5em] rotate-90 origin-bottom-right pointer-events-none">
        Powered by DOULIA Connect
      </div>

      {/* HEADER */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-rose-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-rose-200 animate-pulse">
              <Heart size={32} fill="white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">DOULIA <span className="text-rose-600">Love</span></h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">&quot;Le patient n&apos;est pas un dossier, c&apos;est un membre de la famille&quot;</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/60 p-2 rounded-2xl border border-rose-100/50 backdrop-blur-sm">
            <button 
              onClick={() => setActiveView("dashboard")}
              className={cn(
                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeView === "dashboard" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-rose-600"
              )}
            >
              Fidélisation
            </button>
            <button 
              onClick={() => setActiveView("ia")}
              className={cn(
                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeView === "ia" ? "bg-rose-500 text-white shadow-lg" : "text-slate-400 hover:text-rose-600"
              )}
            >
              <Zap size={14} className={activeView === "ia" ? "text-yellow-300" : ""} /> Générateur IA
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeView === "dashboard" ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              {/* ALERTS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
                
                {/* BIRTHDAYS */}
                <div className="bg-white p-10 rounded-[3.5rem] shadow-xl shadow-rose-100/30 border border-rose-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -translate-y-10 translate-x-10" />
                  <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest mb-8 flex items-center gap-3 relative z-10">
                    <Cake size={20} className="text-rose-500" /> 🎂 Anniversaires du Jour
                  </h2>

                  <div className="space-y-4 relative z-10">
                    {loading ? (
                       <Loader2 className="animate-spin text-slate-200 mx-auto" size={48} />
                    ) : birthdayPatients.length === 0 ? (
                      <div className="p-10 text-center text-[11px] font-bold text-slate-300 uppercase italic border-2 border-dashed border-slate-50 rounded-[2.5rem]">
                        Aucun anniversaire aujourd&apos;hui
                      </div>
                    ) : (
                      birthdayPatients.map(p => (
                        <div key={p.id} className="p-6 bg-rose-50/50 border border-rose-100 rounded-[2rem] flex items-center justify-between group hover:bg-rose-50 hover:shadow-md transition-all">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-lg font-black text-rose-500 shadow-sm">
                              {p.nom_complet.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 leading-none mb-1">{p.nom_complet}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{p.telephone}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => sendSMS(p)}
                            className="bg-rose-500 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2"
                          >
                            <Send size={12} /> SMS de Vœux
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* FOLLOW UPS */}
                <div className="bg-white p-10 rounded-[3.5rem] shadow-xl shadow-blue-100/30 border border-blue-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-y-10 translate-x-10" />
                  <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest mb-8 flex items-center gap-3 relative z-10">
                    <Sparkles size={20} className="text-blue-500" /> ❤️ Suivi Post-Consultation (J+3)
                  </h2>

                  <div className="space-y-4 relative z-10">
                    {loading ? (
                       <Loader2 className="animate-spin text-slate-200 mx-auto" size={48} />
                    ) : followupPatients.length === 0 ? (
                      <div className="p-10 text-center text-[11px] font-bold text-slate-300 uppercase italic border-2 border-dashed border-slate-50 rounded-[2.5rem]">
                         Aucun suivi à 3 jours prévu
                      </div>
                    ) : (
                      followupPatients.map(p => (
                        <div key={p.id} className="p-6 bg-blue-50/50 border border-blue-100 rounded-[2rem] flex items-center justify-between group hover:bg-blue-50 hover:shadow-md transition-all">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-lg font-black text-blue-500 shadow-sm">
                              {p.nom_complet.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 leading-none mb-1">{p.nom_complet}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{p.info}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => sendSMS(p)}
                            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2"
                          >
                            <Send size={12} /> SMS de Suivi
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* CAMPAIGNS SECTION */}
              <div className="bg-white p-12 rounded-[4rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
                 <div className="flex items-center justify-between mb-10">
                   <h2 className="text-lg font-black text-slate-950 uppercase tracking-tighter flex items-center gap-3">
                     <Megaphone size={24} className="text-rose-500" /> Gestion des Campagnes Massives
                   </h2>
                   <button 
                    onClick={() => setShowCampaignModal(true)}
                    className="px-6 py-3 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center gap-2"
                   >
                     <Plus size={14} /> Créer Broadcast
                   </button>
                 </div>

                 <div className="overflow-x-auto">
                   <table className="w-full">
                     <thead>
                       <tr className="border-b border-slate-50">
                          <th className="text-left py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campagne</th>
                          <th className="text-left py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cible</th>
                          <th className="text-center py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                          <th className="text-right py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                       {campaigns.map(camp => (
                         <tr key={camp.id} className="group hover:bg-slate-50/50 transition-colors">
                           <td className="py-6">
                             <p className="text-xs font-black text-slate-950 uppercase">{camp.titre}</p>
                             <p className="text-[9px] font-bold text-slate-400 truncate max-w-xs">&quot;{camp.contenu}&quot;</p>
                           </td>
                           <td className="py-6">
                             <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg uppercase">
                               {camp.cible}
                             </span>
                           </td>
                           <td className="py-6 text-center">
                             <span className={cn(
                              "px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                              camp.statut === "Envoyé" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                             )}>
                               {camp.statut}
                             </span>
                           </td>
                           <td className="py-6 text-right">
                              {camp.statut !== "Envoyé" ? (
                                <button 
                                  onClick={() => sendCampaign(camp.id, camp.titre)}
                                  className="bg-slate-950 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md flex items-center justify-center gap-2 ml-auto"
                                >
                                  <Send size={12} /> Lancer
                                </button>
                              ) : (
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-2 px-5">
                                  <CheckCircle2 size={14} /> Envoyé
                                </span>
                              )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="ia"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto"
            >
              <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-rose-50 flex flex-col md:flex-row gap-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 opacity-50" />
                
                {/* IA FORM */}
                <div className="flex-1 space-y-8 relative z-10">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter flex items-center gap-3">
                      <PenTool size={28} className="text-rose-500" /> Générateur de Posts IA
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-2">Créez du contenu viral et éducatif en un clic ✨</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sujet ou Thème</label>
                      <input 
                        type="text" 
                        value={iaForm.theme}
                        onChange={(e) => setIaForm({...iaForm, theme: e.target.value})}
                        placeholder="Ex: Prévention Paludisme, Arrivée d'un nouveau pédiatre..."
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold outline-none focus:border-rose-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plateforme</label>
                        <select 
                           value={iaForm.plateforme}
                           onChange={(e) => setIaForm({...iaForm, plateforme: e.target.value})}
                           className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-[10px] font-black uppercase outline-none focus:border-rose-500"
                        >
                          <option value="Facebook">Facebook</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Script TikTok">Script TikTok</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ton souhaité</label>
                        <select 
                           value={iaForm.ton}
                           onChange={(e) => setIaForm({...iaForm, ton: e.target.value})}
                           className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-[10px] font-black uppercase outline-none focus:border-rose-500"
                        >
                          <option value="Éducatif">Éducatif</option>
                          <option value="Empathique">Empathique</option>
                          <option value="Institutionnel">Institutionnel</option>
                          <option value="Ludique">Ludique</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={handleGeneratePost}
                      disabled={generatingIa}
                      className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 flex items-center justify-center gap-3 relative group overflow-hidden"
                    >
                      {generatingIa ? (
                        <>
                          <Loader2 className="animate-spin" size={20} /> Génération en cours...
                        </>
                      ) : (
                        <>
                          <Zap size={18} className="text-yellow-400 animate-bounce" />
                          Générer le contenu ✨
                          <motion.div 
                            className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* RESULT AREA */}
                <div className="flex-1 bg-slate-950 p-10 rounded-[3.5rem] shadow-2xl relative flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Résultat Riverside IA</span>
                    <Share2 size={20} className="text-slate-800" />
                  </div>

                  <textarea 
                    readOnly
                    value={generatedPost}
                    placeholder="Le contenu généré s'affichera ici..."
                    className="flex-1 bg-transparent text-slate-200 text-sm font-medium leading-relaxed resize-none outline-none scrollbar-hide border-none"
                  />

                  {generatedPost && (
                    <button 
                      onClick={copyToClipboard}
                      className="mt-6 w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Copy size={14} /> 📋 Copier le contenu
                    </button>
                  )}
                  
                  {!generatedPost && !generatingIa && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col opacity-20 pointer-events-none">
                       <PenTool size={64} className="text-white mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-white">Prêt à créer</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CAMPAIGN MODAL */}
      <AnimatePresence>
        {showCampaignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
              
              <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <Megaphone size={24} className="text-rose-500" /> Créer une Campagne
              </h2>

              <form onSubmit={handleCampaignSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titre</label>
                    <input 
                      required
                      value={form.titre}
                      onChange={(e) => setForm({...form, titre: e.target.value})}
                      placeholder="Ex: Campagne Octobre Rose"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[1.2rem] text-sm font-bold outline-none focus:border-rose-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Audience Cible</label>
                    <select 
                       value={form.cible}
                       onChange={(e) => setForm({...form, cible: e.target.value})}
                       className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[1.2rem] text-[10px] font-black uppercase outline-none focus:border-rose-500"
                    >
                      <option value="Tous les patients">Tous les patients</option>
                      <option value="Femmes uniquement">Femmes uniquement (Octobre Rose)</option>
                      <option value="Patients avec dettes">Patients avec dettes (Relance)</option>
                      <option value="Seniors">Seniors</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contenu du Message (SMS)</label>
                  <textarea 
                    required
                    rows={4}
                    value={form.contenu}
                    onChange={(e) => setForm({...form, contenu: e.target.value})}
                    placeholder="Tapez le contenu du SMS ici..."
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-medium outline-none focus:border-rose-500 transition-all resize-none"
                  />
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Aperçu Riverside DOULIA Love</span>
                    <span className={cn("text-[9px] font-black uppercase", form.contenu.length > 160 ? "text-rose-500" : "text-slate-400")}>
                      {form.contenu.length} / 160 caract.
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowCampaignModal(false)}
                    className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    disabled={submitting}
                    className="flex-[2] py-5 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl flex items-center justify-center gap-3"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Enregistrer & Programmer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
