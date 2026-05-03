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
1. PAS de balises HTML (aucun <b>, <i>, <br>, etc.).
2. INTERDICTION ABSOLUE d'utiliser des astérisques (*) ou des étoiles (**) pour le gras.
3. INTERDICTION ABSOLUE d'utiliser des dièses (#) pour les titres.
4. TITRES : Pour les titres de section, utilise uniquement des LETTRES MAJUSCULES. Sépare chaque section par deux sauts de ligne pour une mise en page aérée.
5. LISTES : Utilise uniquement des listes numérotées au format "1. ", "2. ", etc. (pas de tirets, pas de points).
6. TON ET ANALYSE : Tu es un Conseiller Stratégique. Ne te contente pas de lister les données, ANALYSE-LES. Si les dettes sont élevées, suggère une action. À la fin de chaque réponse, propose une QUESTION STRATÉGIQUE ou une piste de réflexion pour le Patron.
7. LANGUE : Réponds toujours en Français.`;

    const geminiKey = process.env.GEMINI_API_KEY; 
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) return NextResponse.json({ error: 'Configuration API Gemini manquante' }, { status: 500 });

    // RAG Interne Ultra-Complet (Supabase)
    const { supabaseAdmin } = await import('@/src/lib/supabaseAdmin');
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0)).toISOString();

    // 1. Super-Fetch en parallèle pour contexte 360°
    const [
      { data: activeDebtsData },
      { data: recentExpenses },
      { data: queueActivity },
      { data: pharmacyAlerts },
      { data: catalogues },
      { count: consultCount },
      { data: todayRevenue }
    ] = await Promise.all([
      // Dettes & Créances (Priorité 1)
      supabaseAdmin.from('transactions_caisse').select('id, reste_a_payer, description, date_transaction, patients(nom_complet, type_assurance)').gt('reste_a_payer', 0).order('date_transaction', { ascending: false }).limit(50),
      // Dépenses du jour (Priorité 2)
      supabaseAdmin.from('comptabilite_manuelle').select('*').gte('created_at', todayStart).order('created_at', { ascending: false }),
      // Patients en cours
      supabaseAdmin.from('file_attente').select('patients(nom_complet), motif_visite, degre_urgence').eq('statut', 'En attente'),
      // Alertes stocks pharmacie
      supabaseAdmin.from('stocks_pharmacie').select('nom_article, quantite_actuelle, seuil_alerte').lte('quantite_actuelle', 'seuil_alerte'),
      // Catalogue des actes
      supabaseAdmin.from('actes_catalogue').select('nom_acte, prix_cash, prix_assurance'),
      // Stats du jour
      supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabaseAdmin.from('transactions_caisse').select('montant_verse').gte('date_transaction', todayStart)
    ]);

    const caTotal = (todayRevenue || []).reduce((acc, curr) => acc + (curr.montant_verse || 0), 0);

    // Construction du Contexte Structuré
    const contextLines = [
      `[TRESORERIE DU JOUR] : Encaissements totaux = ${caTotal.toLocaleString()} FCFA.`,
      `[DETTES ACTIVES] : ${activeDebtsData?.length ? activeDebtsData.map(d => `${d.patients?.nom_complet} (${d.patients?.type_assurance || 'Cash'}) doit ${d.reste_a_payer.toLocaleString()} FCFA pour ${d.description || 'Soin'}`).join('\n') : "Aucune dette active."}`,
      `[DEPENSES DU JOUR] : ${recentExpenses?.length ? recentExpenses.map(e => `${e.description} : ${e.montant.toLocaleString()} FCFA (${e.statut})`).join('\n') : "Aucun décaissement effectué aujourd'hui."}`,
      `[STOCKS CRITIQUES] : ${pharmacyAlerts?.length ? pharmacyAlerts.map(p => `${p.nom_article} (Reste: ${p.quantite_actuelle})`).join(' | ') : "Stocks OK."}`,
      `[PATIENTS EN ATTENTE] : ${queueActivity?.length || 0} personnes en salle d'attente.`,
      `[CATALOGUE SERVICES] : ${catalogues?.slice(0, 10).map(c => `${c.nom_acte} @ ${c.prix_cash} FCFA`).join(', ')}...`
    ];

    // Recherche Tavily (Si besoin de contexte externe - limité aux innovations ou marché)
    let searchResults = "";
    const needsSearch = prompt.toLowerCase().includes("marché") || 
                       prompt.toLowerCase().includes("innovation") || 
                       prompt.toLowerCase().includes("externe") ||
                       prompt.toLowerCase().includes("concours");

    if (tavilyKey && needsSearch) {
      try {
        const tvly = tavily({ apiKey: tavilyKey });
        const res = await tvly.search(prompt, { searchDepth: "advanced", maxResults: 3 });
        searchResults = JSON.stringify(res.results);
      } catch (err) { console.error("Tavily Error:", err); }
    }

    const fullContext = `
      [DATE/HEURE] : ${currentDateTime} (Douala).
      
      DONNÉES DU RIVERSIDE ERP (SOURCE UNIQUE DE VÉRITÉ) :
      ${contextLines.join('\n\n')}
      
      CONSIGNES POUR L'IA :
      1. Utilise UNIQUEMENT les données ci-dessus pour répondre aux questions sur la clinique.
      2. ANALYSE : Si tu vois que les dettes sont concentrées sur les assurances, recommande une relance. Si les dépenses sont élevées par rapport aux recettes du jour, alerte le patron.
      3. INTERDICTION de formatage spécial (pas de ** pas de #). Utilise l'UPPERCASE pour les titres.
      4. MISSION : Devenir l'omniscience du Patron.
      
      [SANTÉ INTERNE / MARCHÉ EXTERNE] :
      ${searchResults}
      
      QUESTION DU PATRON : ${prompt}
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
