import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("[CHAT API] Clé API GEMINI_API_KEY manquante.");
      return NextResponse.json({ error: "Configuration IA incomplète. Contactez l'administrateur." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: "Tu es DOULIA Insight, un assistant médical expert conçu pour aider les médecins de la clinique Riverside au Cameroun. Tu fournis des informations concises, basées sur les preuves cliniques. Tu aides au diagnostic, au calcul de posologie et à la vérification des interactions médicamenteuses. Termine toujours tes conseils critiques par un rappel que le médecin garde la responsabilité finale.",
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
