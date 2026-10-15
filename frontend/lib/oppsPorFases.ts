// lib/oppsPorFases.ts
//
// "OPPS POR FASES" (Monica, 15-oct-2026): TODAS las opps abiertas, con o sin
// alerta, como un indice: fase > copy > opps. El paso de cada opp sale de
// estado_oportunidad (la escalera de copys, la unica verdad); aqui solo se le
// suma lo que se ve en cada linea:
//   nombre (con municipio) · dias en esta fase · ultimo contacto · administrador
// y la posicion, para el mapa de al lado.

import "server-only";
import { nombreDeOpp } from "./direccionOpp";
import type { Clave, Fase } from "./pasosEscalera";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Range: `${d}-${d + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const x = (await r.json()) as T[];
    out.push(...x);
    if (x.length < 1000) return out;
  }
}
async function porTramos<T>(ids: string[], hacer: (tramo: string) => string): Promise<T[]> {
  const tramos: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) tramos.push(ids.slice(i, i + 150));
  return (await Promise.all(tramos.map((t) => leer<T>(hacer(t.join(",")))))).flat();
}

const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const aDia = (v: string) => (v.length <= 10 ? v : new Date(v).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type FilaFase = {
  id: string;
  nombre: string;
  clave: Clave;
  fase: Fase;
  /** Dias en el paso actual (0 si la fecha es futura: una junta por celebrar). */
  dias: number;
  /** El ultimo contacto grabado (diario, llamadas). */
  contacto: string | null;
  /** "Persona · EMPRESA" y su telefono; null = falta completar. */
  admin: { quien: string; telefono: string | null } | null;
  lat: number | null;
  lng: number | null;
};

type Cruda = {
  id: string;
  nombre: string | null;
  codigo: string | null;
  comunidad_id: string | null;
  comunidad: { lat: number | null; lng: number | null } | null;
  est: { clave: Clave; fase: Fase | null; desde: string };
  portales: { hasta: string | null; acceso: { municipio: string | null; portal: { ficha: { lat: number | null; lng: number | null } | null } | null } | null }[];
};

/** Las opps abiertas de un comercial (o de todos: null), con su paso guardado. */
export async function oppsPorFases(comercialId: string | null): Promise<FilaFase[]> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const ops = await leer<Cruda>(
    `oportunidades?select=id,nombre,codigo,comunidad_id,comunidad:comunidad_id(lat,lng),` +
      `est:estado_oportunidad!inner(clave,fase,desde),` +
      `portales:relacion_oportunidad_accesos(hasta,acceso:acceso_id(municipio,portal:ficha_catastro_portal_id(ficha:ficha_id(lat,lng))))` +
      `&estado=eq.abierta${f}&est.fase=not.is.null&order=id`,
  );
  if (!ops.length) return [];
  const ids = ops.map((o) => o.id);
  const comunidades = [...new Set(ops.map((o) => o.comunidad_id).filter((x): x is string => !!x))];

  const [notas, inter, llam, admins] = await Promise.all([
    porTramos<{ oportunidad_id: string; fecha: string | null; creado_en: string }>(ids,
      (t) => `notas_oportunidad?select=oportunidad_id,fecha,creado_en&oportunidad_id=in.(${t})`),
    porTramos<{ oportunidad_id: string; fecha_evento: string | null; creado_en: string }>(ids,
      (t) => `interacciones?select=oportunidad_id,fecha_evento,creado_en&oportunidad_id=in.(${t})`).catch(() => []),
    porTramos<{ donde_oportunidad_id: string; creado_en: string }>(ids,
      (t) => `llamadas?select=donde_oportunidad_id,creado_en&donde_oportunidad_id=in.(${t})`).catch(() => []),
    porTramos<{ comunidad_id: string; empresa: { nombre_accesalia: string } | null; puesto: { telefono_empresa: string | null; persona: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null } | null }>(
      comunidades,
      (t) => `comunidad_admin_responsable?select=comunidad_id,empresa:empresa_id(nombre_accesalia),puesto:puesto_id(telefono_empresa,persona:persona_id(nombre,apellidos,telefono_personal))&vigente=is.true&comunidad_id=in.(${t})`),
  ]);

  const hoy = hoyISO();
  const contacto = new Map<string, string>();
  const habla = (opp: string | null | undefined, v: string | null | undefined) => {
    if (!opp || !v) return;
    const d = v.slice(0, 10);
    if (d <= hoy && d > (contacto.get(opp) ?? "")) contacto.set(opp, d);
  };
  for (const n of notas) habla(n.oportunidad_id, n.fecha ?? n.creado_en);
  for (const n of inter) habla(n.oportunidad_id, n.fecha_evento ?? n.creado_en);
  for (const l of llam) habla(l.donde_oportunidad_id, l.creado_en);
  const adminDe = new Map<string, (typeof admins)[number]>();
  for (const a of admins) if (!adminDe.has(a.comunidad_id)) adminDe.set(a.comunidad_id, a);

  return ops.map((o) => {
    // EL NOMBRE, SIEMPRE CON MUNICIPIO.
    let nombre = nombreDeOpp(o);
    const muni = o.portales.map((p) => p.acceso?.municipio).find(Boolean);
    if (muni && !limpio(nombre).includes(limpio(muni))) nombre = `${nombre}, ${muni.charAt(0) + muni.slice(1).toLowerCase()}`;
    const a = o.comunidad_id ? adminDe.get(o.comunidad_id) : undefined;
    const pe = a?.puesto?.persona;
    const quien = a ? [pe ? [pe.nombre, pe.apellidos].filter(Boolean).join(" ") : null, a.empresa?.nombre_accesalia].filter(Boolean).join(" · ") : "";
    const ficha = o.portales.map((p) => p.acceso?.portal?.ficha).find((x) => x?.lat != null && x?.lng != null);
    const desde = aDia(o.est.desde);
    return {
      id: o.id,
      nombre,
      clave: o.est.clave,
      fase: o.est.fase!,
      dias: desde <= hoy ? Math.round((Date.parse(hoy) - Date.parse(desde)) / 86_400_000) : 0,
      contacto: contacto.get(o.id) ?? null,
      admin: quien ? { quien, telefono: a?.puesto?.telefono_empresa ?? pe?.telefono_personal ?? null } : null,
      lat: o.comunidad?.lat ?? ficha?.lat ?? null,
      lng: o.comunidad?.lng ?? ficha?.lng ?? null,
    };
  });
}
