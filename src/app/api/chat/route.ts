import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const formattingDirectives = `
DIRECTIVES STRICTES DE FORMATAGE DE LA RÉPONSE : 
1. INTERDICTION ABSOLUE d'utiliser des balises HTML (pas de <p>, <ul>, <li>, <strong>, etc.). 
2. Utilise UNIQUEMENT des listes avec des puces numériques (1., 2., 3.) pour énumérer les étapes ou les niveaux. 
3. Mets les titres et les mots-clés importants en gras (avec des doubles astérisques markdown). 
4. Sépare chaque paragraphe par un double saut de ligne pour bien aérer le texte.`;

    if (!apiKey) {
      console.error("[CHAT API] Clé API GEMINI_API_KEY manquante.");
      return NextResponse.json({ error: "Configuration IA incomplète. Contactez l'administrateur." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: message,
      config: {
        systemInstruction: "Tu es DOULIA Insight, un assistant médical expert conçu pour aider les médecins de la clinique Riverside au Cameroun. Tu fournis des informations concises, basées sur les preuves cliniques. Tu aides au diagnostic, au calcul de posologie et à la vérification des interactions médicamenteuses. Termine toujours tes conseils critiques par un rappel que le médecin garde la responsabilité finale. " + formattingDirectives,
      }
    });

    if (!response.text) {
      throw new Error("Réponse vide de l'IA");
    }

    return NextResponse.json({ response: response.text });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de la communication avec l'assistant." }, { status: 500 });
  }
}
