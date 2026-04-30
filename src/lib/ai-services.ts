import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
});

const formattingDirectives = `
DIRECTIVES STRICTES DE FORMATAGE DE LA RÉPONSE : 
1. INTERDICTION ABSOLUE d'utiliser des balises HTML (pas de <p>, <ul>, <li>, <strong>, etc.). 
2. Utilise UNIQUEMENT des listes avec des puces numériques (1., 2., 3.) pour énumérer les étapes ou les niveaux. 
3. Mets les titres et les mots-clés importants en gras (avec des doubles astérisques markdown). 
4. Sépare chaque paragraphe par un double saut de ligne pour bien aérer le texte.`;

export async function generateDouliaMessage(patientName: string, motif: string, diagnostic: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Tu es l'assistant DOULIA Love de la clinique RIVERSIDE MEDICAL CENTER à Douala. 
Rédige un message WhatsApp chaleureux, court et professionnel pour prendre des nouvelles du patient : "${patientName}".
Sa consultation concernait : "${motif}" avec comme diagnostic : "${diagnostic}".
Le ton doit être attentionné mais respectueux. 
Propose de contacter la clinique en cas de besoin. 
NE DONNE PAS d'avis médical ou de conseils thérapeutiques spécifiques.
Garde le message en français.
Ajoute des emojis pertinents.

${formattingDirectives}`,
  });

  return response.text;
}

export async function generateCMPost(trends: string[]) {
  const trendsStr = trends.join(", ");
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Tu es le Community Manager de la clinique RIVERSIDE MEDICAL CENTER à Douala.
Voici les tendances sanitaires récentes basées sur les motifs de consultation : [${trendsStr}].
Analyse ces tendances et rédige un post Facebook engageant de prévention sanitaire basé sur la tendance la plus pertinente.
L'objectif est d'éduquer la population locale de Douala tout en promouvant les services de la clinique.
Inclus un Call-to-Action invitant à venir faire un check-up ou prendre rendez-vous.
Ajoute des emojis pertinents et des hashtags comme #RiversideMedical #SanteDouala #Prevention.
Le post doit être professionnel, dynamique et rassurant.

${formattingDirectives}`,
  });

  return response.text;
}
