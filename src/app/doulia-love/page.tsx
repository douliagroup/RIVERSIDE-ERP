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
  type: "ANNIVERSAIRE" | "J+3" | "CRM";
  info: string;
  date_reference?: string;
  patient_id?: string;
}

interface CRMAction {
  id: string;
  patient_id: string;
  type_action: string;
  statut: string;
  date_prevue: string;
  notes: string;
  created_at: string;
  patients: { nom_complet: string; telephone: string };
}

export default function DouliaLovePage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"anniversaires" | "post_soins" | "suivi">("anniversaires");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [crmTasks, setCrmTasks] = useState<CRMAction[]>([]);
  const [birthdayPatients, setBirthdayPatients] = useState<AlertPatient[]>([]);
  const [j3Patients, setJ3Patients] = useState<AlertPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState<"dashboard" | "ia">("dashboard");

  useEffect(() => {
    setMounted(true);
  }, []);

  const getWhatsAppLink = (phone: string, type: "ANNIVERSAIRE" | "J+3" | "CRM", name: string) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\s/g, '').replace('+', '');
    const finalPhone = cleanPhone.startsWith('237') ? cleanPhone : `237${cleanPhone}`;
    
    let message = "";
    if (type === "ANNIVERSAIRE") {
      message = `Joyeux Anniversaire ${name} ! 🎂 La clinique Riverside vous souhaite bonheur et santé. ✨`;
    } else if (type === "J+3") {
      message = `Bonjour ${name}, la clinique Riverside prend de vos nouvelles suite à votre passage il y a 3 jours. Comment évolue votre état ? ❤️`;
    } else {
      message = `Bonjour ${name}, nous vous contactons pour votre suivi à la clinique Riverside.`;
    }

    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  };

  const markActionDone = async (patient: AlertPatient | CRMAction, type: string) => {
    try {
      if ('type_action' in patient) {
        // It's a record in crm_suivi
        await supabase.from('crm_suivi').update({ statut: 'Fait' }).eq('id', patient.id);
      } else {
        // It's a dynamic alert, we log it
        await supabase.from('crm_suivi').insert([{
          patient_id: patient.patient_id,
          type_action: type,
          statut: 'Fait',
          date_prevue: new Date().toISOString().split('T')[0],
          notes: `Action automatisée DOULIA Love effectuée`
        }]);
      }
      toast.success("Action marquée comme effectuée ! ✨");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [crmForm, setCrmForm] = useState({
    patient_id: "",
    type_action: "Suivi Médical",
    date_prevue: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const [patientsList, setPatientsList] = useState<any[]>([]);

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
      // 1. Fetch CRM Tasks from crm_suivi
      const { data: qCrm } = await supabase
        .from('crm_suivi')
        .select('*, patients(nom_complet, telephone)')
        .eq('statut', 'À faire')
        .order('date_prevue', { ascending: true });
      setCrmTasks(qCrm as any || []);

      // 2. Fetch Patients for Birthdays & Search
      const { data: qPats } = await supabase.from('patients').select('id, nom_complet, telephone, date_naissance');
      setPatientsList(qPats || []);

      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      
      const bdays = (qPats || []).filter(p => {
        if (!p.date_naissance) return false;
        const d = new Date(p.date_naissance);
        return (d.getMonth() + 1) === currentMonth;
      }).map(p => ({
        id: p.id,
        patient_id: p.id,
        nom_complet: p.nom_complet,
        telephone: p.telephone,
        type: "ANNIVERSAIRE" as const,
        info: `Anniversaire le ${new Date(p.date_naissance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
      }));
      setBirthdayPatients(bdays);

      // 3. Fetch J+3 (Post-Soins)
      // We check sejours_actifs with status 'Sortie (Terminé)' or consultations
      const forDate = new Date();
      forDate.setDate(forDate.getDate() - 3);
      const start = new Date(forDate.setHours(0,0,0,0)).toISOString();
      const end = new Date(forDate.setHours(23,59,59,999)).toISOString();

      const { data: qSejours } = await supabase
        .from('sejours_actifs')
        .select('*, patients(nom_complet, telephone)')
        .not('date_sortie', 'is', null)
        .gte('date_sortie', start)
        .lte('date_sortie', end);
      
      const j3 = (qSejours || []).map((s: any) => ({
        id: s.id,
        patient_id: s.patient_id,
        nom_complet: s.patients?.nom_complet || "Inconnu",
        telephone: s.patients?.telephone || "N/A",
        type: "J+3" as const,
        info: `Sortie de clinique il y a 3 jours`
      }));
      setJ3Patients(j3);

      // 4. Fetch Campaigns
      const { data: qCam } = await supabase.from('campagnes_doulia_love').select('*').order('created_at', { ascending: false });
      setCampaigns(qCam || []);

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

  const handleCRMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('crm_suivi')
        .insert([crmForm]);
      if (error) throw error;
      toast.success("Action CRM enregistrée");
      setShowCRMModal(false);
      setCrmForm({ patient_id: "", type_action: "Appel J+3", date_prevue: new Date().toISOString().split('T')[0], notes: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateCRMStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('crm_suivi')
        .update({ statut: status })
        .eq('id', id);
      if (error) throw error;
      toast.success("Action mise à jour");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleGeneratePost = async () => {
    if (!iaForm.theme) return toast.error("Veuillez saisir un thème");
    
    setGeneratingIa(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key NOT FOUND. Configure NEXT_PUBLIC_GEMINI_API_KEY in secrets.");
      
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Génère un post professionnel et engageant pour les réseaux sociaux de la clinique médicale Riverside à Douala.
Thème : ${iaForm.theme}
Plateforme : ${iaForm.plateforme}
Ton : ${iaForm.ton}

Directives :
1. Capture l'attention dès la première ligne.
2. Utilise un langage simple, rassurant et professionnel.
3. Inclus des conseils santé pertinents liés au thème.
4. Ajoute des emojis locaux et professionnels.
5. Termine par un appel à l'action (CTA) invitant à visiter la clinique ou à prendre rendez-vous.
6. Utilise des hashtags comme #RiversideMedicalCenter #SanteDouala #Douala.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setGeneratedPost(response.text || "Erreur de génération : contenu vide.");
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
                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeView === "dashboard" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-rose-600"
              )}
            >
              <Heart size={14} className={activeView === "dashboard" ? "fill-white" : ""} /> Centre de Fidélisation
            </button>
            <button 
              onClick={() => setActiveView("ia")}
              className={cn(
                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeView === "ia" ? "bg-rose-500 text-white shadow-lg" : "text-slate-400 hover:text-rose-600"
              )}
            >
              <Zap size={14} className={activeView === "ia" ? "text-yellow-300" : ""} /> Assistant IA
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
              className="space-y-10"
            >
              {/* INTERNAL TABS */}
              <div className="flex items-center gap-6 bg-white/60 p-2 rounded-[2rem] border border-rose-100/50 backdrop-blur-sm w-fit mx-auto shadow-sm">
                <button 
                  onClick={() => setActiveTab('anniversaires')}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === 'anniversaires' ? "bg-rose-500 text-white shadow-lg" : "text-slate-400 hover:text-rose-500"
                  )}
                >
                  🎂 Anniversaires {birthdayPatients.length > 0 && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                </button>
                <button 
                  onClick={() => setActiveTab('post_soins')}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === 'post_soins' ? "bg-rose-500 text-white shadow-lg" : "text-slate-400 hover:text-rose-500"
                  )}
                >
                  📞 Appels J+3 {j3Patients.length > 0 && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                </button>
                <button 
                  onClick={() => setActiveTab('suivi')}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === 'suivi' ? "bg-rose-500 text-white shadow-lg" : "text-slate-400 hover:text-rose-500"
                  )}
                >
                  💉 Suivi & Rappels {crmTasks.length > 0 && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                </button>
              </div>

              {/* LISTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                  <div className="col-span-full py-20 flex flex-col items-center gap-4">
                     <Loader2 className="animate-spin text-rose-500" size={40} />
                     <p className="text-[10px] font-black uppercase text-slate-300">Synchronisation Riverside CRM...</p>
                  </div>
                ) : (
                  <>
                    {/* ANNIVERSAIRES TAB */}
                    {activeTab === 'anniversaires' && (
                      birthdayPatients.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-rose-50 italic text-slate-300 font-bold uppercase text-xs">
                          Aucun anniversaire ce mois-ci
                        </div>
                      ) : (
                        birthdayPatients.map(p => (
                          <div key={p.id} className="bg-white p-8 rounded-[3rem] border border-rose-50 shadow-xl shadow-rose-100/20 group relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-3xl -translate-y-12 translate-x-12 opacity-50 transition-all group-hover:scale-150" />
                             <div className="flex items-center gap-5 mb-6 relative z-10">
                                <div className="w-14 h-14 bg-rose-100 rounded-[1.5rem] flex items-center justify-center text-rose-600 font-black text-xl shadow-inner uppercase">
                                   {p.nom_complet.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                   <h3 className="text-sm font-black text-slate-900 uppercase truncate tracking-tight">{p.nom_complet}</h3>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.info}</p>
                                </div>
                             </div>

                             <div className="flex gap-3 relative z-10">
                                <button 
                                  onClick={() => markActionDone(p, 'Souhait Anniversaire')}
                                  className="flex-1 py-3 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex items-center justify-center gap-2"
                                  title="Marquer comme fait"
                                >
                                   <CheckCircle2 size={16} />
                                </button>
                                {p.telephone && (
                                   <a 
                                     href={getWhatsAppLink(p.telephone, "ANNIVERSAIRE", p.nom_complet) || "#"}
                                     target="_blank"
                                     onClick={() => markActionDone(p, 'Souhait Anniversaire')}
                                     className="flex-[3] py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                                   >
                                      WhatsApp
                                   </a>
                                )}
                             </div>
                          </div>
                        ))
                      )
                    )}

                    {/* POST-SOINS TAB */}
                    {activeTab === 'post_soins' && (
                      j3Patients.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-blue-50 italic text-slate-300 font-bold uppercase text-xs">
                          Aucun suivi J+3 pour aujourd&apos;hui
                        </div>
                      ) : (
                        j3Patients.map(p => (
                          <div key={p.id} className="bg-white p-8 rounded-[3rem] border border-blue-50 shadow-xl shadow-blue-100/20 group relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-3xl -translate-y-12 translate-x-12 opacity-50" />
                             <div className="flex items-center gap-5 mb-6 relative z-10">
                                <div className="w-14 h-14 bg-blue-100 rounded-[1.5rem] flex items-center justify-center text-blue-600 font-black text-xl shadow-inner uppercase">
                                   {p.nom_complet.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                   <h3 className="text-sm font-black text-slate-900 uppercase truncate tracking-tight">{p.nom_complet}</h3>
                                   <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-black">{p.info}</p>
                                </div>
                             </div>

                             <div className="flex gap-3 relative z-10">
                                <button 
                                  onClick={() => markActionDone(p, 'Appel Suivi J+3')}
                                  className="flex-1 py-3 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                   <CheckCircle2 size={16} />
                                </button>
                                {p.telephone && (
                                   <a 
                                     href={getWhatsAppLink(p.telephone, "J+3", p.nom_complet) || "#"}
                                     target="_blank"
                                     onClick={() => markActionDone(p, 'Appel Suivi J+3')}
                                     className="flex-[3] py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                                   >
                                      WhatsApp
                                   </a>
                                )}
                             </div>
                          </div>
                        ))
                      )
                    )}

                    {/* CRM SUIVI TAB */}
                    {activeTab === 'suivi' && (
                      crmTasks.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-amber-50 italic text-slate-300 font-bold uppercase text-xs">
                          Aucun rappel programmé
                        </div>
                      ) : (
                        crmTasks.map(task => (
                          <div key={task.id} className="bg-white p-8 rounded-[3rem] border border-amber-50 shadow-xl shadow-amber-100/20 group relative overflow-hidden">
                             <div className="flex justify-between items-start mb-4">
                                <span className="text-[9px] font-black bg-amber-500 text-white px-3 py-1 rounded-full uppercase tracking-widest">{task.type_action}</span>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest" suppressHydrationWarning>
                                  {mounted && new Date(task.date_prevue).toLocaleDateString()}
                                </span>
                             </div>
                             <h3 className="text-sm font-black text-slate-900 uppercase truncate mb-2">{task.patients?.nom_complet}</h3>
                             <div className="bg-slate-50 p-4 rounded-2xl text-[10px] font-medium text-slate-600 mb-6 border border-slate-100 min-h-[60px]">
                                {task.notes || "Pas de notes"}
                             </div>

                             <div className="flex gap-3">
                                <button 
                                  onClick={() => markActionDone(task, 'Suivi CRM')}
                                  className="flex-1 py-3 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                   <CheckCircle2 size={16} />
                                </button>
                                {task.patients?.telephone && (
                                   <a 
                                     href={getWhatsAppLink(task.patients.telephone, "CRM", task.patients.nom_complet) || "#"}
                                     target="_blank"
                                     className="flex-[3] py-3 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
                                   >
                                      WhatsApp
                                   </a>
                                )}
                             </div>
                          </div>
                        ))
                      )
                    )}
                  </>
                )}
              </div>

              {/* Broadcast Quick Access */}
              <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-rose-500/10 pointer-events-none" />
                <div className="space-y-4 relative z-10">
                   <div className="flex items-center gap-3">
                      <Megaphone className="text-rose-500" size={24} />
                      <h3 className="text-xl font-black uppercase tracking-tighter">Communication de Masse</h3>
                   </div>
                   <p className="text-xs font-medium text-slate-400 max-w-md">Besoin de diffuser une information à tous vos patients ? Utilisez notre moteur de Broadcast DOULIA Love.</p>
                </div>
                <button 
                  onClick={() => setShowCampaignModal(true)}
                  className="bg-white text-slate-950 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all shadow-xl relative z-10"
                >
                   Lancer une Campagne
                </button>
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

      {/* CRM MODAL */}
      <AnimatePresence>
        {showCRMModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-900" />
              <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <Target size={24} className="text-rose-500" /> Planifier Action CRM
              </h2>

              <form onSubmit={handleCRMSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Patient</label>
                    <select 
                      required
                      value={crmForm.patient_id}
                      onChange={e => setCrmForm({...crmForm, patient_id: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-rose-500 font-bold text-sm"
                    >
                       <option value="">Sélectionner un patient...</option>
                       {patientsList.map(p => <option key={p.id} value={p.id}>{p.nom_complet}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type d&apos;action</label>
                      <select 
                        value={crmForm.type_action}
                        onChange={e => setCrmForm({...crmForm, type_action: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm"
                      >
                         <option>Appel J+3</option>
                         <option>Anniversaire</option>
                         <option>Rappel Vaccin</option>
                         <option>Relance Facture</option>
                         <option>Suivi Chronique</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prévue</label>
                       <input 
                         type="date"
                         required
                         value={crmForm.date_prevue}
                         onChange={e => setCrmForm({...crmForm, date_prevue: e.target.value})}
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes / Instructions</label>
                    <textarea 
                      value={crmForm.notes}
                      onChange={e => setCrmForm({...crmForm, notes: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-medium text-sm min-h-[100px] resize-none"
                    />
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowCRMModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Annuler</button>
                    <button disabled={submitting} className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-rose-500 transition-all">
                       {submitting ? "Planification..." : "Valider l'Action"}
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
