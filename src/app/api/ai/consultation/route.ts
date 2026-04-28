import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { transcription } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("[IA ROUTE] ERREUR : Clé API manquante (GEMINI_API_KEY) dans les secrets/environnement.");
      return NextResponse.json({ error: "Service IA temporairement indisponible (clé manquante), saisie manuelle requise" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Tu es un copilote médical expert pour Riverside Medical Center à Douala.
      Analyse cette transcription brute d'une consultation médicale et extrais les informations structurées.
      
      Transcription : "${transcription}"
      
      Retourne OBLIGATOIREMENT un objet JSON valide avec cette structure stricte (n'ajoute aucun texte avant ou après le JSON) :
      {
        "constantes": "résumé des constantes si mentionnées sinon vide",
        "notes_cliniques": "résumé clair et professionnel des observations",
        "diagnostic_suggere": "diagnostic probable basé sur les notes",
        "examens_recommandes": "examens complémetaires à prévoir",
        "ordonnance_proposee": "médicaments et posologie suggérés"
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Nettoyage de la réponse pour extraire le JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Format JSON non détecté dans la réponse IA");
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return NextResponse.json(analysis);
    } catch (apiError) {
      console.error("Gemini API Call Failed:", apiError);
      return NextResponse.json({ 
        error: "Service IA temporairement indisponible, saisie manuelle requise" 
      }, { status: 503 });
    }

  } catch (error) {
    console.error("AI Consultation Error:", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse IA" }, { status: 500 });
  }
}
