// lib/fichaCorta.ts
//
// LO QUE SABEMOS DE UNA PERSONA, EN UNA LINEA (Monica, 15-oct-2026): "si la
// agenda menciona a una persona, que se incluyan los datos que tenemos de ella":
//   Juan Antonio Garcia  ·  Presidente · Alfareros de la Villa 78, Fuenlabrada · 682963741
//   Valentin Alcocer     ·  Administracion Alcora · 5 opps abiertas · 658951743
// Es la pista de todos los desplegables de personas (diario, satelite, agenda,
// completar la opp, alta de opp, "nos lo trajo", recepcion de llamadas).
//
// Segun de donde cuelgue su puesto vigente (lo calcula la base, en
// directorio_personas_calculo; aqui solo se lee):
//   comunidad      cargo · la comunidad (sin el "CP ", con su municipio) · telefono
//   administracion la administracion · N opps abiertas que lleva · telefono
//   contrata       contrata X · cargo · telefono
//   organismo      el organismo · cargo · telefono
//   sin puesto     su telefono personal
// El telefono es el del PUESTO; si no tiene, el personal.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

/** Todas las filas, de 1000 en 1000 (la base no da mas de una vez). */
async function leerTodo<T>(ruta: string): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${ruta}&limit=1000&offset=${desde}`, { headers: CAB, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
    const filas = (await r.json()) as T[];
    out.push(...filas);
    if (filas.length < 1000) return out;
  }
}

/** "CP MONTESA 27 MADRID" -> "MONTESA 27, MADRID"; si el nombre no lleva el
 *  municipio, se le pone (no hay direcciones sin municipio). */
export function comunidadConMunicipio(nombre: string, municipio: string | null): string {
  // Solo para pintarlo: el nombre guardado no se toca (lista curada a mano).
  const sin = nombre.replace(/^\s*((CP|CDAD\.?\s+PROP|COMUNIDAD\s+DE\s+PROPIETARIOS)\.?\s+)+/i, "").trim();
  const m = (municipio ?? "").trim();
  if (!m) return sin;
  if (sin.toLowerCase().endsWith(" " + m.toLowerCase())) return sin.slice(0, -m.length).trim() + ", " + sin.slice(-m.length);
  return `${sin}, ${m}`;
}

export type FichasCortas = {
  /** La pista de cada puesto vigente. */
  porPuesto: Map<string, string>;
  /** La de cada persona: la de su puesto vigente (el primero) o su telefono. */
  porPersona: Map<string, string>;
};

/** LEIDAS DEL DIRECTORIO DE PERSONAS (Monica, 16-oct-2026: "las cosas que
 *  realmente se usan a menudo en las pantallas, que se cojan de un sitio que las
 *  tenga precalculadas y actualizadas: no MONTARLO cada vez"). La tabla
 *  directorio_personas (migracion 20261016130000) guarda la pista ya calculada,
 *  con las mismas reglas de arriba, y se pone al dia sola. Antes eran cuatro
 *  lecturas enteras mas las comunidades de 150 en 150 (una de ellas, la vista
 *  admin_de_oportunidad, de 400 ms a 2 s); ahora una lectura, en 1 ms. */
export async function fichasCortas(): Promise<FichasCortas> {
  const filas = await leerTodo<{ fila: string; persona_id: string; puesto_id: string | null; pista: string }>(
    "directorio_personas?select=fila,persona_id,puesto_id,pista&vigente=is.true&order=fila.asc",
  );
  const porPuesto = new Map<string, string>();
  const porPersona = new Map<string, string>();
  for (const f of filas) {
    if (!f.pista) continue;
    if (f.puesto_id) porPuesto.set(f.puesto_id, f.pista);
    if (!porPersona.has(f.persona_id)) porPersona.set(f.persona_id, f.pista);
  }
  return { porPuesto, porPersona };
}
