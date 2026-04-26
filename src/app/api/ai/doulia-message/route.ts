import { NextResponse } from 'next/server';
import { generateDouliaMessage } from '@/src/lib/ai-services';

export async function POST(req: Request) {
  try {
    const { patientName, motif, diagnostic } = await req.json();
    const message = await generateDouliaMessage(patientName, motif, diagnostic);
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Doulia Message API Error:', error);
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 });
  }
}
