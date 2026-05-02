import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("[CHAT API] Clé API GEMINI_API_KEY manquante.");
      return NextResponse.json({ error: "Configuration IA incomplète." }, { status: 500 });
    }

    const currentDateTime = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' });
    
    const formattingDirectives = `
DIRECTIVES DE FORMATAGE : 
1. PAS de balises HTML. 
2. Listes numériques pour les étapes. 
3. Mots-clés en **gras markdown**. 
4. Double saut de ligne entre paragraphes.`;

    const ai = new GoogleGenAI({ apiKey });
    
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `[CONTEXTE TEMPS RÉEL] Nous sommes le : ${currentDateTime} (Heure de Douala).\n\nMESSAGE DU MÉDECIN : ${message}` }] }],
      config: {
        systemInstruction: `Tu es DOULIA Insight, l'assistant médical expert du Riverside Medical Center à Douala. 
        Tu fournis des conseils basés sur les preuves cliniques les plus récentes. 
        IMPORTANT : Nous ne sommes pas en février 2026 si la date du contexte indique le contraire. 
        Si on te demande des données sur les patients, précise que tu n'as accès qu'aux connaissances médicales générales dans ce module de chat.
        ${formattingDirectives}
        Termine toujours par : "Le médecin traitant conserve l'entière responsabilité clinique."`,
        maxOutputTokens: 1000,
      },
    });

    const text = result.text;
    if (!text) throw new Error("Réponse vide de l'IA");

    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Erreur IA : " + error.message }, { status: 500 });
  }
}
