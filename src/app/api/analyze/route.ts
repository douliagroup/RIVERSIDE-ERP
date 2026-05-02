import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabaseAdmin';
import { GoogleGenAI } from '@google/genai';

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

    // 1. Récupération des données Supabase en temps réel
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0)).toISOString();
    
    // a. Récupération des DETTES (Noms exacts patients + assurances)
    const { data: debts } = await supabaseAdmin
      .from('transactions_caisse')
      .select(`
        reste_a_payer,
        patient_id,
        patients (nom_complet, telephone),
        stay_id,
        hospitalisations (compagnie_assurance)
      `)
      .gt('reste_a_payer', 0);

    const debtorsList = (debts || []).map(d => ({
      nom: d.patients?.nom_complet || "Inconnu",
      telephone: d.patients?.telephone || "N/A",
      montant: d.reste_a_payer,
      assurance: d.hospitalisations?.compagnie_assurance || "Particulier"
    }));

    // b. Activité du jour (Finances)
    const { data: todayTransactions } = await supabaseAdmin
      .from('transactions_caisse')
      .select('montant_verse, mode_paiement')
      .gte('date_transaction', todayStart);

    const caisseJour = (todayTransactions || []).reduce((acc, curr) => acc + (curr.montant_verse || 0), 0);

    // c. Activité Médicale (Consultations & Triage)
    const { count: consultsToday } = await supabaseAdmin
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    const { count: triageActive } = await supabaseAdmin
      .from('file_attente')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'En attente');

    // d. Alertes Stocks
    const { data: stocks } = await supabaseAdmin.from('stocks').select('designation, quantite_actuelle, seuil_alerte');
    const criticalStocks = (stocks || []).filter(s => s.quantite_actuelle <= s.seuil_alerte);

    // e. Dépenses (Comptabilité Manuelle)
    const { data: expenses } = await supabaseAdmin
      .from('comptabilite_manuelle')
      .select('montant, categorie, libelle')
      .gte('date_operation', todayStart);
    
    const totalExpenses = (expenses || []).reduce((acc, curr) => acc + (curr.montant || 0), 0);

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

    const prompt = `
      ANALYSE STRATÉGIQUE TRANSVERSALE POUR LE PATRON.
      
      DONNÉES EN TEMPS RÉEL (BASE DE DONNÉES RIVERSIDE) :
      
      1. ÉTAT DES DETTES (RECUPÉRATION ET RECOUVREMENT) :
      Voici la liste exacte des débiteurs (Patients et Compagnies d'Assurance) :
      ${debtorsList.length > 0 
        ? debtorsList.map(d => `- ${d.nom} (${d.assurance}) : ${d.montant.toLocaleString()} FCFA [Tel: ${d.telephone}]`).join('\n')
        : "Aucune dette active détectée."}
      
      2. ACTIVITÉ FINANCIÈRE DE CE JOUR (${new Date().toLocaleDateString()}) :
      - Encaissements totaux : ${caisseJour.toLocaleString()} FCFA
      - Dépenses décaissées : ${totalExpenses.toLocaleString()} FCFA
      - Solde journalier : ${(caisseJour - totalExpenses).toLocaleString()} FCFA
      
      3. ACTIVITÉ MÉDICALE DU JOUR :
      - Consultations terminées : ${consultsToday || 0}
      - Patients actuellement en attente au Triage : ${triageActive || 0}
      
      4. ALERTES STOCKS CRITIQUES :
      ${criticalStocks.length > 0 
        ? criticalStocks.map(s => `- ${s.designation} : ${s.quantite_actuelle} restants (Seuil: ${s.seuil_alerte})`).join('\n')
        : "Stocks optimaux."}

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

    // 3. Synthèse Gemini
    const ai = new GoogleGenAI(apiKey);
    const model = ai.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      systemInstruction: `Tu es DOULIA Intelligence, le cerveau stratégique omniscient du Riverside Medical Center à Douala. 
        Tu as une connaissance absolue de toutes les fonctionnalités et modules de l'application ERP Riverside. 
        Ton rôle est d'analyser les performances de chaque page (Admission, Médical, Trésorerie) pour conseiller le Directeur (le Patron).
        
        ${appContext}
        
        ${formattingDirectives}`,
    });

    const result = await model.generateContent(prompt);
    const reportText = result.response.text();

    const summaryKPIs = { 
      caisseJour, 
      consultsToday, 
      triageActive, 
      debtorsCount: debtorsList.length,
      totalDebt: debtorsList.reduce((acc, curr) => acc + curr.montant, 0)
    };

    // 4. Persistence dans Supabase
    const { error: insertError } = await supabaseAdmin
      .from('rapports_ia')
      .insert([
        { 
          titre: "Analyse Stratégique - " + new Date().toLocaleDateString(), 
          contenu: reportText,
          metadata: { summaryKPIs, query }
        }
      ]);

    if (insertError) console.error("Erreur insertion rapport:", insertError);

    return NextResponse.json({ report: reportText, kpis: summaryKPIs });
  } catch (error: any) {
    console.error("Erreur API Analyze:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
