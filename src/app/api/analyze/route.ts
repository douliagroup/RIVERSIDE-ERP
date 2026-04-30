import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabaseAdmin';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY; // Using standardized key

    if (!apiKey) {
      console.error("[ANALYZE API] Clé API GEMINI_API_KEY manquante.");
      return NextResponse.json({ error: 'Configuration IA incomplète' }, { status: 500 });
    }

    const formattingDirectives = `
DIRECTIVES STRICTES DE FORMATAGE DE LA RÉPONSE : 
1. INTERDICTION ABSOLUE d'utiliser des balises HTML (pas de <p>, <ul>, <li>, <strong>, etc.). 
2. Utilise UNIQUEMENT des listes avec des puces numériques (1., 2., 3.) pour énumérer les étapes ou les niveaux. 
3. Mets les titres et les mots-clés importants en gras (avec des doubles astérisques markdown). 
4. Sépare chaque paragraphe par un double saut de ligne pour bien aérer le texte.`;

    // 1. Récupération des données Supabase (KPIs internes)
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
    let searchContext = "Pas de données externes trouvées.";
    if (process.env.TAVILY_API_KEY) {
      try {
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
        searchContext = externalData.results?.map((r: any) => r.content).join('\n') || searchContext;
      } catch (err) {
        console.error("Tavily Error:", err);
      }
    }

    // 3. Synthèse Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: "Tu es un expert en stratégie hospitalière pour Riverside Medical Center à Douala. " + formattingDirectives 
    });

    const prompt = `
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

      FORMAT DE RÉPONSE ATTENDU :
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
