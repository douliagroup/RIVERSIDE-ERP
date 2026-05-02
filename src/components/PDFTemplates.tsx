'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface PDFTemplateProps {
  id: string;
  type: 'RAPPORT_GARDE' | 'RAPPORT_REUNION' | 'FACTURE' | 'BILAN_COMPTABLE';
  data: any;
}

const CHAMBRES = ["211", "210", "209", "208", "207", "205", "204", "202", "P4"];
const ESPACES = ["Accueil", "Couloirs", "Toilettes", "Salle Cons. 1/2", "Laboratoire", "Cour", "Cuisine"];

export const PDFTemplates = ({ id, type, data }: PDFTemplateProps) => {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const isGarde = data?.type_rapport === 'GARDE' || type === 'RAPPORT_GARDE';
  const isReunion = data?.type_rapport === 'REUNION' || type === 'RAPPORT_REUNION';
  const c = data?.contenu || {};

  return (
    <div 
      id={id} 
      className="fixed -left-[9999px] top-0 w-[1000px] bg-white p-16 font-sans text-slate-900"
      style={{ minHeight: '1414px' }} // Adjusted for 1000px width scaling
    >
      {/* Header Riverside Official */}
      <div className="text-center mb-16 pb-12 border-b-2 border-red-600 relative">
        <div className="absolute top-0 left-0">
           <ShieldCheck size={60} className="text-red-900 opacity-10" />
        </div>
        <h1 className="text-4xl font-black text-red-600 tracking-[0.2em] mb-2">R I S I M E D</h1>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-900 mb-6">CLINIQUE RIVERSIDE MEDICAL CENTER SARL</h2>
        <div className="w-24 h-1.5 bg-slate-900 mx-auto rounded-full mb-6" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-[0.5em]">
          {isGarde ? "RAPPORT DE GARDE MÉDICALE" : isReunion ? "RAPPORT DE RÉUNION TECHNIQUE" : "DOCUMENT OFFICIEL"}
        </p>
      </div>

      {(isGarde || isReunion) && (
        <div className="space-y-12">
          {/* Header Data */}
          <div className="grid grid-cols-4 gap-8 bg-slate-50 p-8 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Date</p>
              <p className="text-lg font-bold">{c.date || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Heure Début</p>
              <p className="text-lg font-bold">{c.heure_debut || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Heure Fin</p>
              <p className="text-lg font-bold">{c.heure_fin || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Responsable</p>
              <p className="text-lg font-bold">{data?.auteur || 'N/A'}</p>
            </div>
          </div>

          {isGarde ? (
            <div className="space-y-10">
              {/* I - Prise de service */}
              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase bg-slate-900 text-white px-4 py-2 inline-block">I - Prise de service</h3>
                <div className="grid grid-cols-2 gap-8">
                  {c.prise_service?.map((ps: any, idx: number) => (
                    <p key={idx} className="text-lg border-b border-slate-200 pb-2">
                       <span className="font-black text-slate-300 mr-4">{idx+1}.</span>
                       <span className="font-bold">{ps.nom} {ps.prenom}</span>
                    </p>
                  ))}
                </div>
              </section>

              {/* II - Patients */}
              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase bg-slate-900 text-white px-4 py-2 inline-block">II - Patients en salle(s)</h3>
                <table className="w-full border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-50">
                      {CHAMBRES.map(num => <th key={num} className="border border-slate-300 p-3 text-xs font-black uppercase">{num}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {CHAMBRES.map(num => <td key={num} className="border border-slate-300 p-4 text-center font-bold">{c.patients_en_salle?.[num] || '-'}</td>)}
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* III - Soins */}
              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase bg-slate-900 text-white px-4 py-2 inline-block">III - Soins effectués</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase mb-2 italic">1. Surveillance clinique</p>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm min-h-[60px] whitespace-pre-wrap">{c.soins?.surveillance}</div>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase mb-2 italic">2. Soins techniques</p>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm min-h-[60px] whitespace-pre-wrap">{c.soins?.technique}</div>
                  </div>
                </div>
              </section>

              {/* IV - Admissions/Sorties */}
              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase bg-slate-900 text-white px-4 py-2 inline-block">IV - Gestion des admissions et sorties</h3>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead className="bg-slate-50">
                    <tr><th className="border border-slate-300 p-2 text-left">CHAMBRE</th>{CHAMBRES.map(num => <th key={num} className="border border-slate-300 p-2 text-center">{num}</th>)}</tr>
                  </thead>
                   <tbody>
                     <tr><td className="border border-slate-300 p-2 font-black bg-slate-50">NOM PATIENT</td>{CHAMBRES.map(num => <td key={num} className="border border-slate-300 p-2 text-center font-bold">{c.admissions_sorties?.[num]?.patient || '-'}</td>)}</tr>
                     <tr><td className="border border-slate-300 p-2 font-black bg-slate-50">HEURE ADM.</td>{CHAMBRES.map(num => <td key={num} className="border border-slate-300 p-2 text-center">{c.admissions_sorties?.[num]?.heure_adm || '-'}</td>)}</tr>
                   </tbody>
                </table>
              </section>

              {/* Autres */}
              <section className="grid grid-cols-2 gap-12">
                 <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase border-b border-slate-900 pb-1">Transmission Relève</h4>
                    <div className="text-xs leading-relaxed whitespace-pre-wrap">{c.transmissions}</div>
                 </div>
                 <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase border-b border-slate-900 pb-1">Difficultés/Remarques</h4>
                    <div className="text-xs leading-relaxed whitespace-pre-wrap">{c.difficultes}</div>
                 </div>
              </section>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Reunion sections */}
              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase bg-slate-900 text-white px-4 py-2 inline-block">I - Présences</h3>
                <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-lg">
                  {c.presences?.map((p: any, idx: number) => (
                    <p key={idx} className="border-b border-dashed border-slate-300 pb-1">
                       <span className="font-black text-slate-300 mr-4 w-6 inline-block">{idx+1}.</span>
                       <span className="font-bold">{p.nom} {p.prenom}</span>
                    </p>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase bg-slate-900 text-white px-4 py-2 inline-block">II - Rapport veille</h3>
                <div className="p-4 bg-slate-50 rounded-lg text-sm">{c.rapport_veille?.technique}</div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase bg-slate-900 text-white px-4 py-2 inline-block">IV - Planification Salles</h3>
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead className="bg-slate-50">
                    <tr><th className="border border-slate-300 p-2"></th>{CHAMBRES.map(num => <th key={num} className="border border-slate-300 p-2">{num}</th>)}</tr>
                  </thead>
                  <tbody>
                    <tr><td className="border border-slate-300 p-2 font-black">Nom Patient</td>{CHAMBRES.map(num => <td key={num} className="border border-slate-300 p-2 text-center">{c.planification?.patients?.[num]?.nom || '-'}</td>)}</tr>
                    <tr><td className="border border-slate-300 p-2 font-black">Pers. Médical</td>{CHAMBRES.map(num => <td key={num} className="border border-slate-300 p-2 text-center">{c.planification?.personnel_med?.[num] || '-'}</td>)}</tr>
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-32 grid grid-cols-2 gap-24 pt-20 border-t border-slate-100">
             <div className="text-center">
               <p className="text-xs font-black uppercase mb-32 underline underline-offset-8">Médecin/Intervenant</p>
               <div className="h-px bg-slate-900 w-full" />
             </div>
             <div className="text-center">
               <p className="text-xs font-black uppercase mb-32 underline underline-offset-8">Direction Générale</p>
               <div className="h-px bg-slate-900 w-full" />
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
                <p className="text-3xl font-black text-emerald-700">{(data?.recettes || 0).toLocaleString()} <span className="text-xs">FCFA</span></p>
             </div>
             <div className="p-6 bg-red-50 border border-red-100 rounded-3xl">
                <h3 className="text-xs font-black text-red-600 uppercase mb-4">Total Dépenses</h3>
                <p className="text-3xl font-black text-red-700">{(data?.depenses || 0).toLocaleString()} <span className="text-xs">FCFA</span></p>
             </div>
           </div>

           <div className="mt-10 border border-slate-200 rounded-[2rem] overflow-hidden">
             <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
               <h3 className="text-sm font-black uppercase tracking-widest">Résultat Net (Solde)</h3>
               <p className="text-3xl font-black underline">{((data?.recettes || 0) - (data?.depenses || 0)).toLocaleString()} FCFA</p>
             </div>
             <div className="p-8 space-y-4">
               <div className="flex justify-between items-center border-b pb-2">
                 <span className="text-xs font-bold text-slate-500 uppercase">Part en Banque</span>
                 <span className="text-sm font-black text-slate-900">{(data?.banque || 0).toLocaleString()} FCFA</span>
               </div>
               <div className="flex justify-between items-center border-b pb-2">
                 <span className="text-xs font-bold text-slate-500 uppercase">Trésorerie Disponible</span>
                 <span className="text-sm font-black text-emerald-600">{((data?.recettes || 0) - (data?.depenses || 0) - (data?.banque || 0)).toLocaleString()} FCFA</span>
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
                     <td className="p-3 text-right">{(l.prevu || 0).toLocaleString()}</td>
                     <td className="p-3 text-right">{(l.reel || 0).toLocaleString()}</td>
                     <td className="p-3 text-right font-black">{((l.prevu || 0) - (l.reel || 0)).toLocaleString()}</td>
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
