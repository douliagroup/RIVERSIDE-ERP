import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const currentDateTime = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' });
    
    // Initialisation Gemini
    const geminiKey = process.env.GEMINI_API_KEY; 
    if (!geminiKey) {
      console.error("[AI API] Clé API GEMINI_API_KEY manquante.");
      return NextResponse.json({ error: 'Configuration IA incomplète' }, { status: 500 });
    }

    const formattingDirectives = `
DIRECTIVES STRICTES DE FORMATAGE : 1. PAS d'HTML. 2. Listes numériques. 3. Gras markdown. 4. Double saut de ligne.`;

    const context = `
      [DATE ACTUELLE] : ${currentDateTime} (Douala).
      CONTEXTE CLINIQUE RIVERSIDE MEDICAL CENTER (DOUALA, CAMEROUN) :
      - Localisation : Douala, quartier d'affaires. Propose des services premium.
      
      ANALYSE DEMANDÉE : ${prompt}
      
      FORMAT DE RÉPONSE : Conseil en Stratégie. Ton sérieux et factuel. N'invente rien si les données manquent.
    `;

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: context,
      config: {
        systemInstruction: `Tu es DOULIA Intelligence. ${formattingDirectives}`,
      }
    });

    return NextResponse.json({ text: result.text });
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json({ error: "Erreur IA : " + error.message }, { status: 500 });
  }
}
