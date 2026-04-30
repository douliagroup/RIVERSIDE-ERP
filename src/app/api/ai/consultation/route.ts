import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60; // Prevent timeouts

export async function POST(req: Request) {
  try {
    const { transcription } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("[IA ROUTE] ERREUR : Clé API manquante (GEMINI_API_KEY).");
      return NextResponse.json({ error: "Configuration IA incomplète. Contactez l'administrateur." }, { status: 500 });
    }

    const ai = new GoogleGenAI(apiKey);
    const genModel = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const formattingDirectives = `
DIRECTIVES STRICTES DE FORMATAGE DE LA RÉPONSE : 
1. INTERDICTION ABSOLUE d'utiliser des balises HTML (pas de <p>, <ul>, <li>, <strong>, etc.). 
2. Utilise UNIQUEMENT des listes avec des puces numériques (1., 2., 3.) pour énumérer les étapes ou les niveaux. 
3. Mets les titres et les mots-clés importants en gras (avec des doubles astérisques markdown). 
4. Sépare chaque paragraphe par un double saut de ligne pour bien aérer le texte.`;

    const promptText = `
      Tu es un copilote médical expert pour Riverside Medical Center à Douala.
      Analyse cette transcription brute d'une consultation médicale et extrais les informations structurées.
      
      Transcription : "${transcription}"
      
      Retourne OBLIGATOIREMENT un objet JSON valide avec cette structure stricte (n'ajoute aucun texte avant ou après le JSON) :
      {
        "constantes": "résumé des constantes si mentionnées sinon vide",
        "notes_cliniques": "résumé clair et professionnel des observations",
        "diagnostic_suggere": "diagnostic probable basé sur les notes",
        "examens_recommandes": "examens complémentaires à prévoir",
        "ordonnance_proposee": "médicaments et posologie suggérés"
      }

      Chaque champ textuel à l'intérieur du JSON doit respecter ces consignes :
      ${formattingDirectives}
    `;

    try {
      const result = await genModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          maxOutputTokens: 2000,
        }
      });
      
      const responseText = result.response.text();
      
      if (!responseText) {
        throw new Error("Réponse vide de l'IA");
      }

      // Nettoyage de la réponse pour extraire le JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Format JSON non détecté dans la réponse IA");
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return NextResponse.json(analysis);
    } catch (apiError: any) {
      console.error("Gemini API Call Failed:", apiError);
      return NextResponse.json({ 
        error: "Le service IA a rencontré une erreur technique." 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("AI Consultation Error:", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse IA : " + error.message }, { status: 500 });
  }
}
