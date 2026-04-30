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

    const appContext = `
CONSTITUTION DE L'ECOSYSTÈME RIVERSIDE (VOTRE CONTEXTE GLOBAL) :
1. **Module ADMISSION** (/admission) : Gestion critique du flux entrant. Triage avec score de gravité (IA), monitoring des temps d'attente, et orientation intelligente vers les box de soins.
2. **Module MÉDICAL** (/medical) : Le cœur clinique. Système de consultation assisté par IA (Transcription et aide au diagnostic), calculateurs pédiatriques dynamiques, et assistant DOULIA Insight pour la pharmacovigilance.
3. **Module TRÉSORERIE** (/tresorerie) : Centre névralgique financier. Encaissement des soins, facturation hospitalisation, suivi des flux de caisse en temps réel et réconciliation.
4. **Module PATRON** (/patron) : Tour de contrôle stratégique. Intègre toutes les données pour une analyse SWOT multi-dimensionnelle (RH, Finance, Médical).
5. **Module DOULIA LOVE** (/doulia-love) : Gestion de la relation patient et marketing communautaire. Génération de messages empathiques et éducation thérapeutique.
6. **Module ADMINISTRATION/RH** : Gestion du planning des gardes, des stocks pharmacie et des archives.
`;

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
      systemInstruction: `Tu es DOULIA Intelligence, le cerveau stratégique omniscient du Riverside Medical Center à Douala. 
      Tu as une connaissance absolue de toutes les fonctionnalités et modules de l'application ERP Riverside. 
      Ton rôle est d'analyser les performances de chaque page (Admission, Médical, Trésorerie) pour conseiller le Directeur (le Patron).
      
      ${appContext}
      
      ${formattingDirectives}`
    });

    const prompt = `
      ANALYSE STRATÉGIQUE TRANSVERSALE POUR LE PATRON.
      
      DONNÉES FINANCIÈRES & OPÉRATIONNELLES (Temps Réel):
      - Revenu mensuel: ${internalData.revenu} FCFA
      - Nombre de patients: ${internalData.patients}
      - Dépenses: ${internalData.depenses} FCFA
      - Taux de satisfaction: ${internalData.satisfaction}/5
      - Goulot d'étranglement potentiel: Patient flux admission élevé.

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
