'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface PDFTemplateProps {
  id: string;
  type: 'RAPPORT_GARDE' | 'FACTURE' | 'BILAN_COMPTABLE';
  data: any;
}

export const PDFTemplates = ({ id, type, data }: PDFTemplateProps) => {
  return (
    <div 
      id={id} 
      className="fixed -left-[9999px] top-0 w-[800px] bg-white p-10 font-sans"
      style={{ minHeight: '1122px' }} // A4 height approx
    >
      {/* Header Riverside */}
      <div className="flex items-center justify-between border-b-4 border-red-600 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white">
            <ShieldCheck size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">RIVERSIDE MEDICAL CENTER</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Excellence Clinique & Innovation</p>
            <p className="text-[9px] text-slate-400 mt-1">Douala, Cameroun | BP: 1234 | Tel: +237 6XX XXX XXX</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-slate-900 text-white px-4 py-1 text-[10px] font-black uppercase mb-2 inline-block">
            Document Officiel
          </div>
          <p className="text-xs font-bold text-slate-500 italic">Réf: {Math.random().toString(36).substring(7).toUpperCase()}</p>
        </div>
      </div>

      {type === 'RAPPORT_GARDE' && (
        <div className="space-y-8">
          <div className="text-center bg-slate-50 py-4 rounded-xl">
            <h2 className="text-xl font-black uppercase text-slate-800">Rapport de Garde Clinique</h2>
            <p className="text-sm font-bold text-slate-500">Date: {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="p-4 border border-slate-100 rounded-xl">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-2">Médecin Responsable</h3>
              <p className="text-base font-bold text-slate-900">{data?.auteur || 'N/A'}</p>
            </div>
            <div className="p-4 border border-slate-100 rounded-xl">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-2">Service</h3>
              <p className="text-base font-bold text-slate-900">Urgences / Médecine Générale</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase border-b pb-1">Évènements Majeurs</h3>
            <div className="p-6 bg-slate-50 rounded-2xl text-sm leading-relaxed min-h-[100px]">
              {data?.contenu?.evenements || 'Aucun évènement majeur signalé.'}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase border-b pb-1">Transmissions Clés</h3>
            <div className="p-6 bg-white border border-slate-100 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap min-h-[300px]">
              {data?.contenu?.transmissions || 'Aucune transmission particulière.'}
            </div>
          </div>

          <div className="mt-20 flex justify-between pt-10 border-t border-slate-100">
            <div className="text-center w-48">
              <p className="text-[10px] font-black uppercase mb-16 underline">Signature Médecin</p>
              <div className="h-px w-full bg-slate-200" />
            </div>
            <div className="text-center w-48">
              <p className="text-[10px] font-black uppercase mb-16 underline">Visa Direction</p>
              <div className="h-px w-full bg-slate-200" />
            </div>
          </div>
        </div>
      )}

      {type === 'FACTURE' && (
        <div className="space-y-8">
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-900 mt-4">FACTURE</h2>
            <p className="text-sm font-bold text-red-600">N° {data?.id?.substring(0, 8).toUpperCase()}</p>
          </div>

          <div className="grid grid-cols-2 gap-12 mt-10">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-2">Facturé à:</h3>
              <p className="text-lg font-black text-slate-900">{data?.patients?.nom_complet || 'Patient'}</p>
              <p className="text-xs text-slate-500 mt-1">Régime: {data?.patients?.type_assurance || 'Cash'}</p>
            </div>
            <div className="text-right">
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-2">Date d&apos;émission:</h3>
              <p className="text-base font-bold text-slate-900">{new Date(data?.created_at || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>

          <table className="w-full mt-10 border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase">Prestation / Acte</th>
                <th className="py-3 px-4 text-right text-[10px] font-black uppercase">Prix Unitaire</th>
                <th className="py-3 px-4 text-center text-[10px] font-black uppercase">Qté</th>
                <th className="py-3 px-4 text-right text-[10px] font-black uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-white">
                <td className="py-4 px-4 text-sm font-bold text-slate-800">{data?.description || 'Prestations médicales'}</td>
                <td className="py-4 px-4 text-right text-sm font-medium">{(data?.montant_total || 0).toLocaleString()}</td>
                <td className="py-4 px-4 text-center text-sm font-medium">1</td>
                <td className="py-4 px-4 text-right text-sm font-black text-slate-900">{(data?.montant_total || 0).toLocaleString()} FCFA</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-10 ml-auto w-64 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-xs font-bold text-slate-500 uppercase">Sous-total</span>
              <span className="text-sm font-bold text-slate-900">{(data?.montant_total || 0).toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center py-4 bg-red-600 text-white px-4 rounded-xl">
              <span className="text-sm font-black uppercase">TOTAL NET</span>
              <span className="text-xl font-black">{(data?.montant_total || 0).toLocaleString()} FCFA</span>
            </div>
          </div>

          <div className="mt-20 p-6 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Notes & Conditions</p>
            <p className="text-[9px] text-slate-500 leading-relaxed italic">
              Cette facture est une pièce officielle de Riverside Medical Center. Tout paiement doit être effectué contre reçu sécurisé. 
              En cas de prise en charge assurance, le reliquat facturé au patient est payable immédiatement.
            </p>
          </div>
        </div>
      )}

      {type === 'BILAN_COMPTABLE' && (
        <div className="space-y-8">
           <div className="text-center border-y-2 border-slate-900 py-6 mb-10">
              <h2 className="text-2xl font-black uppercase tracking-widest">Rapport de Situation Financière</h2>
              <p className="text-sm font-bold text-slate-500 mt-2">Mois de {data?.mois} {data?.annee}</p>
           </div>

           <div className="grid grid-cols-2 gap-8">
             <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                <h3 className="text-xs font-black text-emerald-600 uppercase mb-4">Total Recettes</h3>
                <p className="text-3xl font-black text-emerald-700">{data?.recettes?.toLocaleString()} <span className="text-xs">FCFA</span></p>
             </div>
             <div className="p-6 bg-red-50 border border-red-100 rounded-3xl">
                <h3 className="text-xs font-black text-red-600 uppercase mb-4">Total Dépenses</h3>
                <p className="text-3xl font-black text-red-700">{data?.depenses?.toLocaleString()} <span className="text-xs">FCFA</span></p>
             </div>
           </div>

           <div className="mt-10 border border-slate-200 rounded-[2rem] overflow-hidden">
             <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
               <h3 className="text-sm font-black uppercase tracking-widest">Résultat Net (Solde)</h3>
               <p className="text-3xl font-black underline">{(data?.recettes - data?.depenses).toLocaleString()} FCFA</p>
             </div>
             <div className="p-8 space-y-4">
               <div className="flex justify-between items-center border-b pb-2">
                 <span className="text-xs font-bold text-slate-500 uppercase">Part en Banque</span>
                 <span className="text-sm font-black text-slate-900">{data?.banque?.toLocaleString()} FCFA</span>
               </div>
               <div className="flex justify-between items-center border-b pb-2">
                 <span className="text-xs font-bold text-slate-500 uppercase">Trésorerie Disponible</span>
                 <span className="text-sm font-black text-emerald-600">{(data?.recettes - data?.depenses - data?.banque).toLocaleString()} FCFA</span>
               </div>
             </div>
           </div>

           <div className="mt-20">
             <h3 className="text-xs font-black text-slate-950 uppercase border-b pb-1 mb-4">Détail des principales lignes budgétaires</h3>
             <table className="w-full text-xs">
               <thead>
                 <tr className="bg-slate-50">
                    <th className="p-3 text-left">Poste de Dépense</th>
                    <th className="p-3 text-right">Budget Prévu</th>
                    <th className="p-3 text-right">Réalisé</th>
                    <th className="p-3 text-right">Écart</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {data?.lignes?.map((l: any, i: number) => (
                   <tr key={i}>
                     <td className="p-3 font-bold uppercase">{l.titre}</td>
                     <td className="p-3 text-right">{l.prevu?.toLocaleString()}</td>
                     <td className="p-3 text-right">{l.reel?.toLocaleString()}</td>
                     <td className="p-3 text-right font-black">{(l.prevu - l.reel).toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           <div className="mt-32 border-t pt-10 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase italic">Document généré automatiquement par le Riverside ERP le {new Date().toLocaleString()}</p>
           </div>
        </div>
      )}
    </div>
  );
};
