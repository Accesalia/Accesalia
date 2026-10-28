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

/** LOS ADMINISTRADORES PARA ELEGIR, al ponerle administrador a una opp desde la
 *  cartera (Monica, 16-oct-2026: "el boton de añadir el admin ahi mismo"). Los
 *  puestos vigentes de administraciones del directorio, con su pista. Se pide al
 *  pulsar, no al cargar la pantalla. */
export async function accionAdminsParaElegir(): Promise<{ valor: string; texto: string; pista?: string }[]> {
  const yo = await quienSoy();
  if (!yo) return [];
  const r = await fetch(
    // TAMBIEN LOS SIN CONSOLIDAR (Oscar, 28-oct-2026: «Antonio Gonzalez y Amador
    // me salen sin consolidar, pero al buscarlos no salen»): el administrador
    // dado de alta suelto, sin su administracion todavia. Se puede elegir ya; la
    // empresa se le pone despues.
    `${URL_BASE}/rest/v1/directorio_personas?select=fila,nombre,pista,donde_tipo&vigente=is.true&nombre=neq.` +
      `&or=${encodeURIComponent("(donde_tipo.eq.administracion,and(donde_tipo.eq.otro,cargo.ilike.administrador*))")}&order=nombre.asc&limit=5000`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) return [];
  const filas = (await r.json()) as { fila: string; nombre: string; pista: string | null; donde_tipo: string }[];
  return filas.map((f) => ({
    valor: f.fila,
    texto: f.nombre,
    pista: f.donde_tipo === "administracion" ? f.pista || undefined : `sin administración todavía${f.pista ? ` · ${f.pista}` : ""}`,
  }));
}
