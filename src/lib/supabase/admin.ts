import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente com a SERVICE ROLE — ignora RLS. Só para jobs de servidor sem
// sessão de usuário (hoje: os agentes de /api/agentes-eletricos). Nunca
// importar em componente "use client": a chave não pode ir pro browser.
export function createAdminClient() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) return null;

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
