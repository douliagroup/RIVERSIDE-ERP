import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabaseAdmin';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
      console.error("[ANALYZE API] Clé API GEMINI_API_KEY manquante.");
      return NextResponse.json({ error: 'Configuration IA incomplète' }, { status: 500 });
    }

    const currentDateTime = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' });
    const contextDateHeader = `[CONTEXTE TEMPS RÉEL] Nous sommes le ${currentDateTime} (Heure de Douala).`;

    const appContext = `
CONSTITUTION DE L'ECOSYSTÈME RIVERSIDE (VOTRE CONTEXTE GLOBAL) :
1. **Module ADMISSION** : Triage avec score de gravité IA et monitoring des attentes.
2. **Module MÉDICAL** : Aide au diagnostic et transcription.
3. **Module TRÉSORERIE** : Centre financier. Encaissement et facturation.
4. **Module PATRON** : Dashboard stratégique multi-dimensionnel.
`;

    const formattingDirectives = `
DIRECTIVES STRICTES DE FORMATAGE : 
1. PAS de balises HTML. 
2. Listes numériques uniquement (1., 2.). 
3. Mots-clés importants en **gras markdown**. 
4. Double saut de ligne entre paragraphes.`;

    // 1. Récupération des données Supabase
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0)).toISOString();
    
    // a. Récupération des DETTES réelles (Patients et Assureurs)
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
      montant: d.reste_a_payer,
      assurance: d.hospitalisations?.compagnie_assurance || "Particulier"
    }));

    // b. Finances du jour
    const { data: todayTransactions } = await supabaseAdmin
      .from('transactions_caisse')
      .select('montant_verse')
      .gte('date_transaction', todayStart);

    const caisseJour = (todayTransactions || []).reduce((acc, curr) => acc + (curr.montant_verse || 0), 0);

    // c. Activité Médicale
    const { count: consultsToday } = await supabaseAdmin
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    const { count: triageActive } = await supabaseAdmin
      .from('file_attente')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'En attente');

    // d. Stocks Critiques
    const { data: stocks } = await supabaseAdmin.from('stocks').select('designation, quantite_actuelle, seuil_alerte');
    const criticalStocks = (stocks || []).filter(s => s.quantite_actuelle <= s.seuil_alerte);

    // e. Dépenses récentes
    const { data: expenses } = await supabaseAdmin
      .from('comptabilite_manuelle')
      .select('montant, categorie, libelle')
      .gte('date_operation', todayStart);
    
    const totalExpenses = (expenses || []).reduce((acc, curr) => acc + (curr.montant || 0), 0);

    const prompt = `
      ${contextDateHeader}
      
      [DONNÉES ERP RIVERSIDE - SOURCE DE VÉRITÉ]
      
      1. ÉTAT DES CRÉANCES (DETTES) :
      ${debtorsList.length > 0 
        ? debtorsList.map(d => `- ${d.nom} (${d.assurance}) : ${d.montant.toLocaleString()} FCFA`).join('\n')
        : "Aucune dette active enregistrée dans le système."}
      
      2. FLUX FINANCIER DU JOUR :
      - Encaissements : ${caisseJour.toLocaleString()} FCFA
      - Dépenses décaissées : ${totalExpenses.toLocaleString()} FCFA
      - Net Journalier : ${(caisseJour - totalExpenses).toLocaleString()} FCFA
      
      3. ACTIVITÉ MÉDICALE :
      - Consultations ce jour : ${consultsToday || 0}
      - Patients en file d'attente (Triage) : ${triageActive || 0}
      
      4. ALERTE STOCKS :
      ${criticalStocks.length > 0 
        ? criticalStocks.map(s => `- ${s.designation} (${s.quantite_actuelle} restants)`).join('\n')
        : "Stocks optimaux."}

      QUESTION DU PATRON : ${query || "Fais une analyse stratégique globale."}

      INSTRUCTION CRITIQUE : Tu es l'IA stratégique de l'ERP Riverside. Tu dois te baser STRICTEMENT sur les [DONNÉES ERP] fournies ci-dessus. Si une information financière n'est pas dans ces données, réponds que tu n'as pas l'information, N'INVENTE RIEN. Ne dis surtout pas que nous sommes en Février si la date ci-dessus indique le contraire.
    `;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `Tu es DOULIA Intelligence, l'IA décisionnelle du Riverside Medical Center.
        ${appContext}
        ${formattingDirectives}
        
        RAPPEL : Ton analyse doit être clinique, précise et basée exclusivement sur les faits fournis.`,
      }
    });

    const reportText = response.text;
    const summaryKPIs = { caisseJour, consultsToday, triageActive, totalDebt: debtorsList.reduce((acc, curr) => acc + curr.montant, 0) };

    await supabaseAdmin.from('rapports_ia').insert([{ titre: "Analyse Stratégique - " + currentDateTime, contenu: reportText, metadata: { summaryKPIs, query } }]);

    return NextResponse.json({ report: reportText, kpis: summaryKPIs });
  } catch (error: any) {
    console.error("Erreur API Analyze:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
