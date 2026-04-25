"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  Facebook, 
  Layout, 
  Loader2,
  Copy,
  BrainCircuit,
  Megaphone
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";

export default function CMPage() {
  const { userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userRole !== 'patron' && userRole !== 'comptable') {
      router.push('/');
    }
  }, [userRole, router]);

  const [idea, setIdea] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePost = async () => {
    if (!idea) return;
    setGenerating(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Tu es le Community Manager de la clinique Riverside à Douala. 
          Optimise cette idée de post pour Facebook. Le ton doit être rassurant, professionnel et humain. 
          Inclus des emojis pertinents et des hashtags locaux comme #RiversideDouala #SanteCameroun.
          IDÉE : ${idea}`
        })
      });

      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      setOutput(data.text);
    } catch (err: any) {
      console.error("Erreur IA Social:", err);
      setOutput("Erreur : Impossible de contacter Riverside Intelligence. Vérifiez votre configuration.");
    } finally {
      setGenerating(false);
    }
  };

  const PRESETS = [
    { label: "Pédiatrie", text: "Nouveau service de pédiatrie avec des experts bienveillants." },
    { label: "Gynécologie", text: " Riverside célèbre la femme : consultations gynécologiques de pointe." },
    { label: "Plateau Technique", text: "Riverside investit dans l'avenir avec un nouveau scanner haute résolution." }
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-riverside-red rounded-2xl flex items-center justify-center text-white shadow-lg shadow-riverside-red/20">
            <Megaphone size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Social Media Assistant</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Propulsé par Riverside Intelligence AI</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Briefing du Post</h2>
              
              <div className="flex flex-wrap gap-2 mb-6">
                 {PRESETS.map(p => (
                   <button 
                    key={p.label}
                    onClick={() => setIdea(p.text)}
                    className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-riverside-red hover:text-riverside-red transition-all"
                   >
                     {p.label}
                   </button>
                 ))}
              </div>

              <textarea 
                rows={6}
                value={idea}
                onChange={e => setIdea(e.target.value)}
                placeholder="ex: Nouveau plateau technique disponible pour la cardiologie..."
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red transition-all text-sm font-medium resize-none mb-6"
              />
              <button 
                onClick={generatePost}
                disabled={generating || !idea}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {generating ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                Générer pour Facebook
              </button>
            </div>
          </div>

          <div className="relative">
             <AnimatePresence mode="wait">
               {output ? (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 min-h-[400px] flex flex-col"
                 >
                   <div className="flex items-center justify-between mb-6">
                     <span className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase italic">
                       <Facebook size={12} /> Aperçu Optimisé
                     </span>
                     <button 
                       onClick={copyToClipboard}
                       className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-slate-900"
                     >
                       {copied ? <span className="text-[10px] font-black text-emerald-500 uppercase">Copie !</span> : <Copy size={16} />}
                     </button>
                   </div>
                   <div className="flex-1 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-medium overflow-y-auto max-h-[300px] pr-2 scrollbar-hide">
                     {output}
                   </div>
                   <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
                      <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter">Généré le {new Date().toLocaleDateString()}</p>
                   </div>
                 </motion.div>
               ) : (
                 <div className="bg-slate-100/50 border border-dashed border-slate-200 rounded-[40px] min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-8 text-center italic">
                   <Sparkles className="mb-4 opacity-20" size={48} />
                   Le texte optimisé apparaîtra ici après génération...
                 </div>
               )}
             </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
