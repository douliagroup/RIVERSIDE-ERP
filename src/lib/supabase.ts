import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

/**
 * Client Supabase initialisé avec les variables d'environnement.
 * Note: Des valeurs de remplacement sont utilisées si les variables sont manquantes
 * pour éviter les erreurs lors du build Vercel/Next.js.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
