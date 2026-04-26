import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    // Initialisation Gemini
    const geminiKey = process.env.RIVERSIDE_GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Clé manquante' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // Simulation de recherche Tavily contextuelle (puisque nous n'avons pas la clé de l'utilisateur ici)
    // Dans une version de production, nous ferions un appel fetch à https://api.tavily.com/search
    
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
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse stratégique" }, { status: 500 });
  }
}
