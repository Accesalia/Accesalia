// supabase/functions/revisar-edicion/index.ts
//
// EDGE TRANSVERSAL: decide si una edicion de texto es COSMETICA (no tocar lo
// procesado) o RELEVANTE (reprocesar). Reutilizable por CUALQUIER punto de entrada
// por texto natural (comercial hoy; proyecto/obra/etc. mañana). Motor en
// _shared/revisarEdicion.ts. Modelo barato (Mistral, no el top).
//
// Body (JSON): { antes: string, despues: string, actor_id?: uuid }

import { revisarEdicion } from "../_shared/revisarEdicion.ts";
import { json, manejarPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pre = manejarPreflight(req);
  if (pre) return pre;

  try {
    const body = await req.json().catch(() => ({}));
    const { antes = "", despues = "", actor_id = null } = body ?? {};
    if (!despues) return json({ error: "falta 'despues'" }, 400);

    const r = await revisarEdicion({ antes, despues, actorId: actor_id });
    return json(r, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
