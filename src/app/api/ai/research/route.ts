import { GoogleGenerativeAI } from "@google/generative-ai";
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
DIRECTIVES STRICTES DE FORMATAGE DE LA RÉGONSE : 1. INTERDICTION ABSOLUE d'utiliser des balises HTML (pas de <p>, <ul>, <li>, <strong>, etc.). 2. Utilise UNIQUEMENT des listes avec des puces numériques (1., 2., 3.) pour énumérer les étapes ou les niveaux. 3. Mets les titres et les mots-clés importants en gras (avec des doubles astérisques markdown). 4. Sépare chaque paragraphe par un double saut de ligne pour bien aérer le texte.`;

    // 2. Validation Clés API
    const geminiKey = process.env.GEMINI_API_KEY; // Standardized
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
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: "Tu es 'Riverside Intelligence V3', l'IA stratégique du Riverside Medical Center à Douala. " + formattingDirectives
    });

    const context = `
      DONNÉES INTERNES DE LA CLINIQUE:
      ${JSON.stringify(clinicData, null, 2)}
      
      RÉSULTATS DE RECHERCHE WEB (Tavily):
      ${searchResults}
      
      CONSIGNE:
      Analyse la demande du patron en comparant nos données internes avec les réalités du marché (recherche web).
      Produis une réponse structurée en deux parties : 
      1. ANALYSE INTERNE (basée sur nos chiffres)
      2. ANALYSE DU MARCHÉ & RECOMMANDATIONS (basée sur le web)
      
      Sois analytique, précis et suggère des actions concrètes pour améliorer la rentabilité ou la qualité des soins.
      
      QUESTION DU PATRON: ${prompt}
    `;

    const result = await model.generateContent(context);
    const text = result.response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Research API Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de l'analyse stratégique : " + error.message }, { status: 500 });
  }
}
