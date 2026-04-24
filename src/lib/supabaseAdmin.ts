import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

// Le client admin est utilisé uniquement côté serveur pour des opérations privilégiées
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
