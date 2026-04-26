import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { patient_id } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé AI manquante' }, { status: 500 });
    }

    // 1. Fetch patient and last consultation
    const { data: patient } = await supabase
      .from('patients')
      .select('nom_complet')
      .eq('id', patient_id)
      .single();

    const { data: consultation } = await supabase
      .from('consultations')
      .select('diagnostic, notes')
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const diagnostic = consultation?.diagnostic || "une visite de routine";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      Tu es l'âme de Riverside Medical Center. Rédige un message WhatsApp très court (max 2 phrases), 
      chaleureux, empathique et professionnel pour prendre des nouvelles du patient ${patient?.nom_complet}.
      
      Contexte médical récent : ${diagnostic}.
      
      Directives :
      - Utilise un ton bienveillant.
      - Ne donne JAMAIS de diagnostic médical direct ou de conseil thérapeutique.
      - Termine par "L'équipe Riverside à votre écoute."
      - Le message doit être prêt à envoyer par WhatsApp.
    `;

    const result = await model.generateContent(prompt);
    const message = result.response.text().trim();

    return NextResponse.json({ message });

  } catch (error) {
    console.error("Doulia Message AI Error:", error);
    return NextResponse.json({ error: "Erreur lors de la génération du message" }, { status: 500 });
  }
}
