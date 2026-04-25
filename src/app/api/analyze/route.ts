import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabaseAdmin';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // 1. Récupération des données Supabase (KPIs internes)
    // On simule ici la récupération de données réelles pour l'exemple
    // Dans un vrai cas, on ferait des agrégations SQL sur les tables factures, patients, etc.
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('statistiques_mensuelles')
      .select('*')
      .order('mois', { ascending: false })
      .limit(1);

    const internalData = stats?.[0] || {
      revenu: 4500000,
      patients: 120,
      depenses: 2800000,
      satisfaction: 4.8
    };

    // 2. Recherche Tavily (Contexte externe)
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: query ? `Marché santé Douala 2024: ${query}` : "Tendances santé Douala Cameroun 2024 et tarifs cliniques",
        search_depth: "advanced"
      })
    });
    
    const externalData = await tavilyResponse.json();
    const searchContext = externalData.results?.map((r: any) => r.content).join('\n') || "Pas de données externes trouvées.";

    // 3. Synthèse Gemini
    const apiKey = process.env.RIVERSIDE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: "500: Clé API IA (Gemini) non configurée" 
      }, { status: 500 });
    }

    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Utilisation de 1.5-flash pour une stabilité accrue

    const prompt = `
      Tu es un expert en stratégie hospitalière pour Riverside Medical Center à Douala.
      Analyse les données internes suivantes et croise-les avec les informations du marché externe.

      DONNÉES INTERNES (Riverside):
      - Revenu mensuel: ${internalData.revenu} FCFA
      - Nombre de patients: ${internalData.patients}
      - Dépenses: ${internalData.depenses} FCFA
      - Taux de satisfaction: ${internalData.satisfaction}/5

      CONTEXTE MARCHE EXTERNE (Recherche Web):
      ${searchContext}

      QUESTION DU PATRON:
      ${query || "Génère un rapport stratégique global pour Riverside."}

      FORMAT DE RÉPONSE:
      - Titre frappant
      - Résumé exécutif (3 lignes)
      - Analyse SWOT rapide
      - 3 Recommandations stratégiques concrètes
      - Ton: Professionnel, direct, ambitieux (Editorial Aesthetic).
    `;

    const result = await model.generateContent(prompt);
    const reportText = result.response.text();

    // 4. Persistence dans Supabase
    const { error: insertError } = await supabaseAdmin
      .from('rapports_ia')
      .insert([
        { 
          titre: "Analyse Stratégique - " + new Date().toLocaleDateString(), 
          contenu: reportText,
          metadata: { internalData, query }
        }
      ]);

    if (insertError) console.error("Erreur insertion rapport:", insertError);

    return NextResponse.json({ report: reportText, kpis: internalData });
  } catch (error: any) {
    console.error("Erreur API Analyze:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
