import { GoogleGenerativeAI } from "@google/generative-ai";
import { tavily } from "@tavily/core";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // 1. Protection par Rôle (Patron uniquement)
    const cookieStore = cookies();
    const role = cookieStore.get('riverside_role')?.value;
    
    if (role !== 'patron') {
      return NextResponse.json({ error: "Accès refusé. Rôle Patron requis." }, { status: 403 });
    }

    const { prompt, clinicData } = await req.json();

    // 2. Validation Clés API
    const geminiKey = process.env.RIVERSIDE_GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) {
      return NextResponse.json({ error: "500: Clé API IA (Gemini) non configurée" }, { status: 500 });
    }

    // 3. Recherche Tavily
    let searchResults = "Aucune donnée de recherche web disponible.";
    if (tavilyKey) {
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
    }

    // 4. Synthèse Gemini
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const context = `
      Tu es "Riverside Intelligence V3", l'IA stratégique du Riverside Medical Center à Douala.
      
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
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Research API Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de l'analyse stratégique." }, { status: 500 });
  }
}
