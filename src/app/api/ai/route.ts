import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    // Initialisation Gemini
    const geminiKey = process.env.GEMINI_API_KEY; // Standardized
    if (!geminiKey) {
      console.error("[AI API] Clé API GEMINI_API_KEY manquante.");
      return NextResponse.json({ error: 'Configuration IA incomplète' }, { status: 500 });
    }

    const formattingDirectives = `
DIRECTIVES STRICTES DE FORMATAGE DE LA RÉPONSE : 1. INTERDICTION ABSOLUE d'utiliser des balises HTML (pas de <p>, <ul>, <li>, <strong>, etc.). 2. Utilise UNIQUEMENT des listes avec des puces numériques (1., 2., 3.) pour énumérer les étapes ou les niveaux. 3. Mets les titres et les mots-clés importants en gras (avec des doubles astérisques markdown). 4. Sépare chaque paragraphe par un double saut de ligne pour bien aérer le texte.`;

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: formattingDirectives
    });

    const context = `
      CONTEXTE CLINIQUE RIVERSIDE MEDICAL CENTER (DOUALA, CAMEROUN):
      - Localisation: Douala, quartier d'affaires.
      - Cible: Patients premium et assurés (Ascoma, Chanas, etc.).
      - Concurrents: Polyclinique IDIMED, Clinique de l'Aéroport.
      - Tarifs moyens du marché à Douala: Consultation (15k-25k), Accouchement (150k-300k).
      
      ANALYSE DEMANDÉE: ${prompt}
      
      FORMAT DE RÉPONSE: Structuré, ton de Conseil en Stratégie, focus sur la rentabilité et l'excellence clinique.
    `;

    const result = await model.generateContent(context);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse stratégique : " + error.message }, { status: 500 });
  }
}
