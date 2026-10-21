"use server";

import { quienSoy } from "../../../lib/sesion";
import { clienteSesion } from "../../../lib/auth/servidor";

// PREGUNTARLE A SALI (Monica, 21-oct-2026). La pregunta va a la edge sali-dinero con el pase de quien pregunta: alli
// se comprueba que es direccion, y Sali consulta la base (solo leer) y contesta.

export type Consulta = { sql: string; para_que?: string; filas?: number; error?: string };
export type RespuestaSali = { ok: true; respuesta: string; consultas: Consulta[] } | { ok: false; error: string };

export async function accionPreguntarSali(mensajes: { role: "user" | "assistant"; content: string }[], pantalla: string): Promise<RespuestaSali> {
  const yo = await quienSoy();
  if (!yo?.veTodo) return { ok: false, error: "Solo dirección puede preguntarle a Sali aquí." };
  const supabase = await clienteSesion();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "No encuentro tu sesión: vuelve a entrar." };
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sali-dinero`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mensajes, pantalla }),
      cache: "no-store",
    });
    const j = await r.json().catch(() => ({ error: `Sali respondió ${r.status}` }));
    if (!r.ok || j.error) return { ok: false, error: j.error ?? `Sali respondió ${r.status}` };
    return { ok: true, respuesta: j.respuesta, consultas: j.consultas ?? [] };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
