// supabase/functions/_shared/cors.ts
//
// Cabeceras CORS y helpers de respuesta. Las edges se llaman desde el navegador
// (la app Next.js), asi que necesitan CORS y responder al preflight OPTIONS.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Devuelve una Response al preflight OPTIONS, o null si no lo es. */
export function manejarPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return null;
}

/** Respuesta JSON con CORS. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
