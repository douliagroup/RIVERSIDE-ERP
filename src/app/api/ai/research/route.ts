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
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    
    const appStructure = `
      CONTEXTE DE L'APPLICATION RIVERSIDE ERP:
      - Modules: Admission, Médical, Trésorerie, Pharmacie, Administration.
      - Tables Clés: patients, sejours_actifs (file d'attente), transactions_caisse (finance), comptabilite_manuelle (dépenses), stocks, consultations, chambres.
      - Système de validation: Les dépenses saisies par le caissier doivent être approuvées par le Patron dans son dashboard.
    `;

    const context = `
      ${appStructure}
      
      DONNÉES TEMPS RÉEL (Stats Dashboard):
      ${JSON.stringify(clinicData, null, 2)}
      
      RÉSULTATS DE RECHERCHE WEB (Tavily):
      ${searchResults}
      
      CONSIGNE:
      Analyse la demande du patron en comparant nos données internes avec les réalités du marché.
      Produis une réponse structurée en deux parties : 
      1. ANALYSE INTERNE (basée sur nos chiffres et structure de l'APP)
      2. ANALYSE DU MARCHÉ & RECOMMANDATIONS (basée sur le web)
      
      Sois analytique, précis et suggère des actions concrètes.
      
      QUESTION DU PATRON: ${prompt}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      systemInstruction: "Tu es 'Riverside Intelligence V3', l'IA stratégique du Riverside Medical Center à Douala. " + formattingDirectives,
      contents: [{ role: 'user', parts: [{ text: context }] }],
      generationConfig: {
        maxOutputTokens: 2000,
      }
    });

    const text = response.text;

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Research API Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de l'analyse stratégique : " + error.message }, { status: 500 });
  }
}
