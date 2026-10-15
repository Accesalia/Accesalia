// lib/fichaCorta.ts
//
// LO QUE SABEMOS DE UNA PERSONA, EN UNA LINEA (Monica, 15-oct-2026): "si la
// agenda menciona a una persona, que se incluyan los datos que tenemos de ella":
//   Juan Antonio Garcia  ·  Presidente · Alfareros de la Villa 78, Fuenlabrada · 682963741
//   Valentin Alcocer     ·  Administracion Alcora · 5 opps abiertas · 658951743
// Es la pista de todos los desplegables de personas (diario, satelite, agenda,
// completar la opp, alta de opp, "nos lo trajo", recepcion de llamadas).
//
// Segun de donde cuelgue su puesto vigente:
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

type Puesto = {
  id: string;
  persona_id: string | null;
  cargo: string | null;
  telefono_empresa: string | null;
  figura_legal_propietaria_id: string | null;
  empresa: { nombre_accesalia: string | null } | null;
  contrata: { nombre: string | null } | null;
  organismo: { nombre: string | null } | null;
  persona: { telefono_personal: string | null } | null;
};

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

const mayuscula = (x: string | null) => (x ? x[0].toUpperCase() + x.slice(1) : x);

export type FichasCortas = {
  /** La pista de cada puesto vigente. */
  porPuesto: Map<string, string>;
  /** La de cada persona: la de su puesto vigente (el primero) o su telefono. */
  porPersona: Map<string, string>;
};

export async function fichasCortas(): Promise<FichasCortas> {
  const [puestos, gestores, abiertasIds, sueltas] = await Promise.all([
    leerTodo<Puesto>(
      "puesto?select=id,persona_id,cargo,telefono_empresa,figura_legal_propietaria_id," +
        "empresa:empresa_id(nombre_accesalia),contrata:contrata_id(nombre),organismo:organismo_id(nombre),persona:persona_id(telefono_personal)" +
        "&hasta=is.null&order=id.asc",
    ),
    // admin_de_oportunidad es una vista: no se puede cruzar con la opp en la
    // misma consulta, se cruza aqui.
    leerTodo<{ puesto_id: string; oportunidad_id: string }>("admin_de_oportunidad?select=puesto_id,oportunidad_id&puesto_id=not.is.null&order=oportunidad_id.asc"),
    leerTodo<{ id: string }>("oportunidades?select=id&estado=eq.abierta&order=id.asc"),
    leerTodo<{ id: string; telefono_personal: string | null }>("persona?select=id,telefono_personal&telefono_personal=not.is.null&order=id.asc"),
  ]);

  // Las comunidades de las que cuelga alguien, de 150 en 150 (la URL no da mas).
  const idsCp = [...new Set(puestos.map((p) => p.figura_legal_propietaria_id).filter((x): x is string => !!x))];
  const comunidad = new Map<string, string>();
  for (let i = 0; i < idsCp.length; i += 150) {
    const trozo = idsCp.slice(i, i + 150);
    for (const c of await leerTodo<{ id: string; nombre: string; municipio: string | null }>(
      `comunidades?select=id,nombre,municipio&id=in.(${trozo.join(",")})&order=id.asc`,
    ))
      comunidad.set(c.id, comunidadConMunicipio(c.nombre, c.municipio));
  }

  const abiertas = new Map<string, number>();
  const esAbierta = new Set(abiertasIds.map((o) => o.id));
  for (const o of gestores.filter((g) => esAbierta.has(g.oportunidad_id))) abiertas.set(o.puesto_id, (abiertas.get(o.puesto_id) ?? 0) + 1);

  const porPuesto = new Map<string, string>();
  const porPersona = new Map<string, string>();
  for (const p of puestos) {
    const tel = p.telefono_empresa ?? p.persona?.telefono_personal ?? null;
    const n = abiertas.get(p.id) ?? 0;
    const trozos = p.empresa?.nombre_accesalia
      ? [p.empresa.nombre_accesalia, n ? `${n} ${n === 1 ? "opp abierta" : "opps abiertas"}` : null]
      : p.contrata?.nombre
        ? [`contrata ${p.contrata.nombre}`, p.cargo]
        : p.organismo?.nombre
          ? [p.organismo.nombre, p.cargo]
          : p.figura_legal_propietaria_id
            ? [mayuscula(p.cargo), comunidad.get(p.figura_legal_propietaria_id)]
            : [p.cargo];
    const pista = [...trozos, tel].filter(Boolean).join(" · ");
    if (!pista) continue;
    porPuesto.set(p.id, pista);
    if (p.persona_id && !porPersona.has(p.persona_id)) porPersona.set(p.persona_id, pista);
  }
  for (const s of sueltas) if (!porPersona.has(s.id) && s.telefono_personal) porPersona.set(s.id, s.telefono_personal);
  return { porPuesto, porPersona };
}
