import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

console.log('[Supabase] Initialisation avec URL:', supabaseUrl === 'https://placeholder.supabase.co' ? 'PLACEHOLDER' : 'CONFIGURÉE');

/**
 * Client Supabase sécurisé.
 * Ne fait pas planter l'app si les clés sont manquantes.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
