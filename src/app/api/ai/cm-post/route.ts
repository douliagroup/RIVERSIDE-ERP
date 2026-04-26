import { NextResponse } from 'next/server';
import { generateCMPost } from '@/src/lib/ai-services';
import { supabase } from '@/src/lib/supabase';

export async function POST(req: Request) {
  try {
    // Récupérer les 10 derniers diagnostics/motifs
    const { data: trendData } = await supabase
      .from('consultations')
      .select('motif_visite, diagnostic')
      .order('created_at', { ascending: false })
      .limit(10);

    const trends = trendData?.map(t => `${t.motif_visite} (${t.diagnostic})`) || ["Prévention générale", "Check-up santé"];
    
    const post = await generateCMPost(trends);
    return NextResponse.json({ post });
  } catch (error) {
    console.error('CM Post API Error:', error);
    return NextResponse.json({ error: 'Failed to generate post' }, { status: 500 });
  }
}
