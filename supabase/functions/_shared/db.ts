// supabase/functions/_shared/db.ts
//
// Cliente Supabase con service role, compartido por las edges y por los
// escritores de infra (uso_llm, bitacora_ia). Service role: acceso pleno,
// SOLO backend, nunca en el cliente.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function clienteServicio(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export type { SupabaseClient };
