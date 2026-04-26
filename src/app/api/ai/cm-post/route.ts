import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé AI manquante' }, { status: 500 });
    }

    // 1. Fetch last 10 medical reports (rapports_garde)
    const { data: reports } = await supabase
      .from('rapports_garde')
      .select('contenu_rapport, date_rapport')
      .order('date_rapport', { ascending: false })
      .limit(10);

    const reportsText = reports?.map(r => r.contenu_rapport).join("\n---\n") || "Pas de données récentes.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      Tu es le Community Manager de "Riverside Medical Center" à Douala.
      Analyse ces derniers rapports de garde de la clinique :
      
      ${reportsText}
      
      Ta mission :
      1. Identifie les tendances de santé actuelles (ex: recrudescence de palu, typhoïde, etc.).
      2. Rédige un post Facebook ENGAGEANT pour acquérir de nouveaux patients.
      3. Le post doit être préventif mais inciter à la consultation à Riverside.
      4. Utilise des emojis, un ton professionnel et rassurant.
      5. Ajoute un Call To Action (Ex: "Prenez RDV au 6XX XX XX XX" ou "Passez nous voir à Douala").
      6. Ne mentionne jamais de noms de patients.
    `;

    const result = await model.generateContent(prompt);
    const postContent = result.response.text().trim();

    return NextResponse.json({ postContent });

  } catch (error) {
    console.error("CM Post AI Error:", error);
    return NextResponse.json({ error: "Erreur lors de la génération du post" }, { status: 500 });
  }
}
