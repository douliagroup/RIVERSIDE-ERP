import { GoogleGenAI } from "@google/genai";
import { tavily } from "@tavily/core";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const role = cookieStore.get('riverside_role')?.value;
    
    if (role !== 'patron') {
      return NextResponse.json({ error: "Accès refusé. Rôle Patron requis." }, { status: 403 });
    }

    const { prompt } = await req.json();
    const currentDateTime = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' });

    const formattingDirectives = `
DIRECTIVES STRICTES DE FORMATAGE : 
1. PAS de balises HTML. 
2. Listes numériques uniquement (1., 2.). 
3. Titres et mots-clés en **gras markdown**. 
4. Double saut de ligne entre paragraphes.`;

    const geminiKey = process.env.GEMINI_API_KEY; 
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) return NextResponse.json({ error: 'Configuration API Gemini manquante' }, { status: 500 });

    // RAG Interne Ultra-Complet (Supabase)
    const { supabaseAdmin } = await import('@/src/lib/supabaseAdmin');
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0)).toISOString();

    // 1. Super-Fetch en parallèle pour contexte 360°
    const [
      { data: activeDebts },
      { data: recentExpenses },
      { data: queueActivity },
      { data: pharmacyAlerts },
      { data: lastShiftReport },
      { count: consultCount },
      { data: todayRevenue }
    ] = await Promise.all([
      // Dettes intemporelles (OMNISCIENT)
      supabaseAdmin.from('transactions_caisse').select('reste_a_payer, patients(nom_complet)').gt('reste_a_payer', 0).limit(20),
      // Dernières dépenses
      supabaseAdmin.from('comptabilite_manuelle').select('*').order('created_at', { ascending: false }).limit(5),
      // Patients en cours
      supabaseAdmin.from('file_attente').select('patients(nom_complet), motif_visite, degre_urgence').eq('statut', 'En attente'),
      // Alertes stocks pharmacie
      supabaseAdmin.from('stocks_pharmacie').select('nom_article, quantite_actuelle, seuil_alerte').lte('quantite_actuelle', 'seuil_alerte'),
      // Dernier rapport de garde (Équipe)
      supabaseAdmin.from('rapports_clinique').select('*').order('created_at', { ascending: false }).limit(1),
      // Stats du jour
      supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabaseAdmin.from('transactions_caisse').select('montant_verse').gte('date_transaction', todayStart)
    ]);

    const caTotal = (todayRevenue || []).reduce((acc, curr) => acc + (curr.montant_verse || 0), 0);

    // Construction du Contexte Structuré
    const contextLines = [
      `[CRÉANCES & DETTES] : ${activeDebts?.length ? activeDebts.map(d => `${d.patients?.nom_complet} doit ${d.reste_a_payer.toLocaleString()} FCFA`).join(', ') : "Aucun impayé majeur."}`,
      `[DÉPENSES RÉCENTES] : ${recentExpenses?.length ? recentExpenses.map(e => `${e.libelle} (${e.montant.toLocaleString()} FCFA)`).join(', ') : "Pas de sorties de fonds récentes."}`,
      `[PHARMACIE - ALERTES RUPTURE] : ${pharmacyAlerts?.length ? pharmacyAlerts.map(p => `STOCK CRITIQUE: ${p.nom_article} (${p.quantite_actuelle} restants)`).join(' | ') : "Stocks conformes."}`,
      `[FILE D'ATTENTE] : ${queueActivity?.length ? queueActivity.length + " patients attendent (" + queueActivity.map(q => q.patients?.nom_complet).join(', ') + ")" : "Aucun patient en attente."}`,
      `[DERNIER RAPPORT DE GARDE] : ${lastShiftReport?.[0]?.auteur || "Inconnu"} signale : ${lastShiftReport?.[0]?.contenu?.transmissions?.substring(0, 100) || "RAS"}`
    ];

    // Recherche Tavily (Si besoin de contexte externe)
    let searchResults = "";
    if (tavilyKey && (prompt.toLowerCase().includes("marché") || prompt.toLowerCase().includes("innovation") || prompt.toLowerCase().includes("douala"))) {
      try {
        const tvly = tavily({ apiKey: tavilyKey });
        const res = await tvly.search(prompt, { searchDepth: "advanced", maxResults: 3 });
        searchResults = JSON.stringify(res.results);
      } catch (err) { console.error("Tavily Error:", err); }
    }

    const fullContext = `
      [CONTEXTE TEMPS RÉEL] Nous sommes le : ${currentDateTime} (Heure de Douala).
      
      VOICI LA PHOTOGRAPHIE EXACTE DE LA CLINIQUE RIVERSIDE À LA SECONDE ACTUELLE :
      
      STATISTIQUES DU JOUR :
      - Encaissements : ${caTotal.toLocaleString()} FCFA
      - Consultations : ${consultCount || 0}
      
      ANALYSE MULTI-DÉPARTEMENTALE :
      ${contextLines.join('\n')}
      
      [CONSIGNES STRATÉGIQUES] :
      Tu es 'Riverside Strategic Intelligence'. Tu as désormais accès à tous les départements. 
      Analyse ces données de manière croisée pour répondre au Directeur. 
      Exemple : Si les dettes augmentent alors que les stocks diminuent, signale une tension possible sur la trésorerie.
      Sois précis, factuel et adopte un ton de conseiller de haut niveau.
      
      [RESULTATS EXTERNES (SANTÉ/MARCHÉ)] :
      ${searchResults}
      
      [INTERFACE DIRECTEUR] : ${prompt}
    `;

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    // Sauvegarde du Message Utilisateur (Optionnel: pour historique)
    try {
      await supabaseAdmin.from('conversations_patron').insert([
        { role: 'user', content: prompt }
      ]);
    } catch (saveErr) {
      console.error("Erreur sauvegarde message utilisateur:", saveErr);
    }

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: fullContext,
      config: {
        systemInstruction: "Tu es l'IA décisionnelle stratégique omnisciente de Riverside Medical Center. Ton rôle est d'analyser les données RH, financières, médicales et logistiques pour une gestion optimale. " + formattingDirectives,
      }
    });

    const assistantText = result.text;

    // Sauvegarde de la Réponse Assistant
    try {
      await supabaseAdmin.from('conversations_patron').insert([
        { role: 'assistant', content: assistantText }
      ]);
    } catch (saveErr) {
      console.error("Erreur sauvegarde réponse assistant:", saveErr);
    }

    return NextResponse.json({ text: assistantText });
  } catch (error: any) {
    console.error("Research API Error:", error);
    return NextResponse.json({ error: "Erreur stratégique : " + error.message }, { status: 500 });
  }
}
