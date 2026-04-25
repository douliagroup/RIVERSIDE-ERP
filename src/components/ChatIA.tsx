"use client";

import React, { useState } from "react";
import { Send, Bot, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ChatIA() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt && !e) return;
    
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || "Fais un audit stratégique rapide de Riverside." }),
      });
      const data = await res.json();
      setResponse(data.text);
    } catch (err) {
      setResponse("Désolé, une erreur est survenue lors de l'analyse.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col h-[500px]">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
        <div className="p-2 bg-red-500/20 text-red-500 rounded-lg">
          <Bot size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">Assistant Stratégique Riverside</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Propulsé par Gemini 3 Flash</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 scrollbar-hide">
        {response ? (
          <div className="prose prose-invert prose-xs text-slate-300 max-w-none">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <Sparkles size={40} className="mb-4 text-slate-600" />
            <p className="text-xs text-slate-500">Posez une question sur la rentabilité ou lancez l&apos;audit stratégique.</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ex: Comment optimiser la marge sur la biologie ?"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-red-500 outline-none transition-all"
        />
        <button 
          disabled={loading}
          type="submit"
          className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
