// supabase/functions/mantener-resumen/index.ts
//
// EDGE "prompt anexo": (re)genera el resumen IA vivo de Sali para un ambito
// (administrador-persona o comunidad). Salta al crear una interaccion que toca a
// ese sujeto; tambien sirve para backfill/regenerar a mano. Motor en _shared/resumir.ts.
//
// Body (JSON): { ambito: 'administrador'|'comunidad', ambito_id: uuid, fase?: string, actor_id?: uuid }

import { resumirAmbito, type Ambito } from "../_shared/resumir.ts";
import { json, manejarPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pre = manejarPreflight(req);
  if (pre) return pre;

  try {
    const body = await req.json().catch(() => ({}));
    const { ambito, ambito_id, fase, actor_id = null } = body ?? {};
    if (!ambito || !ambito_id) return json({ error: "faltan ambito/ambito_id" }, 400);
    if (ambito !== "administrador" && ambito !== "comunidad") return json({ error: "ambito invalido" }, 400);

    const r = await resumirAmbito({ ambito: ambito as Ambito, ambitoId: ambito_id, fase, actorId: actor_id });
    return json(r, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
