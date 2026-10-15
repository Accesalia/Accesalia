"use server";

// LA CARTERA DE ADMINISTRADORES (Monica, 15-oct-2026): al desplegar un
// administrador, de que iba cada una de sus opps. Se pide al abrirlo, no al
// cargar la pantalla: un comercial puede tener cientos.

import { quienSoy } from "../../lib/sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export async function accionQuierenDe(ids: string[]): Promise<Record<string, string[]>> {
  const yo = await quienSoy();
  if (!yo) return {};
  const limpios = ids.filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 300);
  if (!limpios.length) return {};
  const r = await fetch(
    `${URL_BASE}/rest/v1/oportunidad_tipos?select=oportunidad_id,tipo:tipo_id(nombre)&oportunidad_id=in.(${limpios.join(",")})`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) return {};
  const filas = (await r.json()) as { oportunidad_id: string; tipo: { nombre: string } | null }[];
  const de: Record<string, string[]> = {};
  for (const f of filas) if (f.tipo) (de[f.oportunidad_id] ??= []).push(f.tipo.nombre);
  return de;
}
