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

    // RAG Interne (Supabase)
    const { supabaseAdmin } = await import('@/src/lib/supabaseAdmin');
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0)).toISOString();

    const { data: debts } = await supabaseAdmin
      .from('transactions_caisse')
      .select(`reste_a_payer, patients(nom_complet), hospitalisations(compagnie_assurance)`)
      .gt('reste_a_payer', 0);
    
    const detailedDebts = (debts || []).map(d => ({
      entite: d.patients?.nom_complet || d.hospitalisations?.compagnie_assurance || "Inconnu",
      montant: d.reste_a_payer
    }));

    const { count: consults } = await supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true }).gte('created_at', todayStart);
    const { data: caData } = await supabaseAdmin.from('transactions_caisse').select('montant_verse').gte('date_transaction', todayStart);
    const caTotal = (caData || []).reduce((acc, curr) => acc + (curr.montant_verse || 0), 0);
    const { data: triage } = await supabaseAdmin.from('file_attente').select('patients(nom_complet), motif_visite, degre_urgence').eq('statut', 'En attente');

    // Recherche Tavily (Uniquement si nécessaire ou pour contexte externe)
    let searchResults = "Recherche externe non sollicitée.";
    if (tavilyKey && (prompt.toLowerCase().includes("marché") || prompt.toLowerCase().includes("concurrence"))) {
      try {
        const tvly = tavily({ apiKey: tavilyKey });
        const res = await tvly.search(prompt, { searchDepth: "advanced", maxResults: 3 });
        searchResults = JSON.stringify(res.results);
      } catch (err) { console.error("Tavily Error:", err); }
    }

    const fullContext = `
      [CONTEXTE TEMPS RÉEL] Nous sommes le : ${currentDateTime} (Heure de Douala).
      
      [SOURCE DE VÉRITÉ - DONNÉES ERP RIVERSIDE]
      
      1. CRÉANCES / DETTES ACTIVES :
      ${detailedDebts.length > 0 
        ? detailedDebts.map(d => `- ${d.entite} : ${d.montant.toLocaleString()} FCFA`).join('\n')
        : "Le système n'indique aucune dette actuelle."}
      
      2. PERFORMANCE DU JOUR :
      - Encaissements : ${caTotal.toLocaleString()} FCFA
      - Nombre de consultations : ${consults || 0}
      
      3. TRIAGE ET FILE D'ATTENTE :
      ${(triage || []).length > 0
        ? (triage || []).map(t => `- ${t.patients?.nom_complet} (${t.motif_visite})`).join('\n')
        : "File d'attente vide."}
      
      [RÉSULTATS RECHERCHE EXTERNE]
      ${searchResults}
      
      [QUESTION DU PATRON] : ${prompt}

      [CONSIGNES IA] :
      Tu es 'Riverside Intelligence V3'. Tu dois te baser EXCLUSIVEMENT sur les [DONNÉES ERP] pour répondre aux questions sur la clinique. 
      Si on te demande "Comment vont les affaires ?", analyse les dettes (${detailedDebts.length}) vs les encaissements (${caTotal}).
      NE DIT JAMAIS que nous sommes en février si la date actuelle indique une autre période.
      Si une donnée interne manque, déclare-le, n'invente rien.
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
        systemInstruction: "Tu es l'IA décisionnelle stratégique de Riverside Medical Center. " + formattingDirectives,
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
