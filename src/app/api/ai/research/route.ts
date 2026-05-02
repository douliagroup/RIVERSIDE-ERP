import { GoogleGenAI } from "@google/genai";
import { tavily } from "@tavily/core";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 1. Protection par Rôle (Patron uniquement)
    const cookieStore = cookies();
    const role = cookieStore.get('riverside_role')?.value;
    
    if (role !== 'patron') {
      return NextResponse.json({ error: "Accès refusé. Rôle Patron requis." }, { status: 403 });
    }

    const { prompt, clinicData } = await req.json();

    const formattingDirectives = `
DIRECTIVES STRICTES DE FORMATAGE DE LA RÉPONSE : 1. INTERDICTION ABSOLUE d'utiliser des balises HTML (pas de <p>, <ul>, <li>, <strong>, etc.). 2. Utilise UNIQUEMENT des listes avec des puces numériques (1., 2., 3.) pour énumérer les étapes ou les niveaux. 3. Mets les titres et les mots-clés importants en gras (avec des doubles astérisques markdown). 4. Sépare chaque paragraphe par un double saut de ligne pour bien aérer le texte.`;

    // 2. Validation Clés API
    const geminiKey = process.env.GEMINI_API_KEY; 
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey || !tavilyKey) {
      return NextResponse.json({ error: 'Configuration API manquante' }, { status: 500 });
    }

    // 2b. Récupération du contexte Réel de la Clinique (Supabase)
    const { supabaseAdmin } = await import('@/src/lib/supabaseAdmin');
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0)).toISOString();

    // Dettes détaillées
    const { data: debts } = await supabaseAdmin
      .from('transactions_caisse')
      .select(`
        reste_a_payer,
        patients (nom_complet),
        hospitalisations (compagnie_assurance)
      `)
      .gt('reste_a_payer', 0);
    
    const detailedDebts = (debts || []).map(d => ({
      entite: d.patients?.nom_complet || d.hospitalisations?.compagnie_assurance || "Inconnu",
      montant: d.reste_a_payer,
      type: d.hospitalisations?.compagnie_assurance ? "Assurance" : "Patient"
    }));

    // Activité du jour
    const { count: consults } = await supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true }).gte('created_at', todayStart);
    const { data: caData } = await supabaseAdmin.from('transactions_caisse').select('montant_verse').gte('date_transaction', todayStart);
    const caTotal = (caData || []).reduce((acc, curr) => acc + (curr.montant_verse || 0), 0);

    // Triage
    const { data: triage } = await supabaseAdmin.from('file_attente').select('patients(nom_complet), motif_visite, degre_urgence').eq('statut', 'En attente');

    // 3. Recherche Tavily
    let searchResults = "Aucune donnée de recherche web disponible.";
    try {
      const tvly = tavily({ apiKey: tavilyKey });
      const searchResponse = await tvly.search(prompt, {
        searchDepth: "advanced",
        maxResults: 5,
      });
      searchResults = JSON.stringify(searchResponse.results);
    } catch (tavErr) {
      console.error("Tavily Search Error:", tavErr);
    }

    // 4. Synthèse Gemini
    const ai = new GoogleGenAI(geminiKey);
    const model = ai.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      systemInstruction: "Tu es 'Riverside Intelligence V3', l'IA stratégique du Riverside Medical Center à Douala. " + formattingDirectives,
    });
    
    const appStructure = `
      CONTEXTE DE L'APPLICATION RIVERSIDE ERP:
      - Modules: Admission, Médical, Trésorerie, Pharmacie, Administration.
      - Tables Clés: patients, sejours_actifs (file d'attente), transactions_caisse (finance), comptabilite_manuelle (dépenses), stocks, consultations, chambres.
      - Système de validation: Les dépenses saisies par le caissier doivent être approuvées par le Patron dans son dashboard.
    `;

    const fullContext = `
      ${appStructure}
      
      --- DONNÉES TEMPS RÉEL (BASE DE DONNÉES RIVERSIDE) ---
      
      1. LISTE DÉTAILLÉE DES DETTES (PATIENTS & ASSURANCES) :
      ${detailedDebts.length > 0 
        ? detailedDebts.map(d => `- ${d.entite} [${d.type}] : ${d.montant.toLocaleString()} FCFA`).join('\n')
        : "Aucune dette."}
      
      2. PERFORMANCE DU JOUR (${new Date().toLocaleDateString()}) :
      - Chiffre d'affaires encaissé : ${caTotal.toLocaleString()} FCFA
      - Consultations effectuées : ${consults}
      
      3. PATIENTS EN ATTENTE AU TRIAGE :
      ${(triage || []).length > 0
        ? (triage || []).map(t => `- ${t.patients?.nom_complet} : ${t.motif_visite} (Urgence: ${t.degre_urgence})`).join('\n')
        : "File d'attente vide."}
      
      -------------------------------------------------------
      
      RÉSULTATS DE RECHERCHE WEB (Tavily - Contexte Marché):
      ${searchResults}
      
      CONSIGNE:
      Tu es l'IA stratégique du Patron. Réponds de manière précise en citant les noms des patients ou assurances si nécessaire.
      Si le patron demande "Comment se portent les activités ?", fais une synthèse entre les finances, le flux médical (triage/consults) et les risques (dettes).
      
      QUESTION DU PATRON: ${prompt}
    `;

    const result = await model.generateContent(fullContext);
    const text = result.response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Research API Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de l'analyse stratégique : " + error.message }, { status: 500 });
  }
}
