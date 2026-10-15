// lib/fasesDeEstado.ts
//
// LAS DIEZ FASES, LEIDAS DEL ESTADO DE LA OPP (Monica, 15-oct-2026: "todo lo que
// escriba fases deberia leer de la nueva tabla"). La verdad es estado_oportunidad
// (el paso de la escalera y su fase, lib/estadoOportunidad.ts); aqui solo se
// traduce esa fase actual a los diez hitos que pintan la barra, el panel por
// fases, el carril de la ficha y el listado de consulta:
//   - los de antes de la fase guardada (el ultimo hito alcanzado), hechos (el 3D,
//     ramal, "saltado"); la guardada es donde ESTA, y las de despues, pendientes;
//   - las que NO APLICAN (no necesita Polycam: visita y escaneo; no necesita
//     viabilidad: la 4), "no_aplica", y cuentan como pasadas;
//   - completada (sin fase y en "completado"): todo hecho; perdida: nada.
// La FECHA de cada hito hecho sale del historial: cuando la opp paso por primera
// vez a una fase posterior.
//
// La vista vieja fases_oportunidad deducia cada fase AL SALIR de ella; ya no la
// lee nadie (zz_muerta_fases_oportunidad).

import "server-only";
import { necesidadesDeMuchas } from "./necesidadesOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

export type HitoDeEstado = { hito: string; estado: "hecho" | "saltado" | "pendiente" | "no_aplica"; fecha: string | null };
type HitoCatalogo = { clave: string; orden: number; es_ramal: boolean };
type EstadoGuardado = { oportunidad_id: string; fase: string | null; seccion: string | null };
type PasoHistorial = { oportunidad_id: string; fase: string | null; cuando: string };

let catalogo: Promise<HitoCatalogo[]> | null = null;
/** Los diez hitos (no cambian: se piden una vez por proceso). */
function hitos(): Promise<HitoCatalogo[]> {
  catalogo ??= rest<HitoCatalogo[]>("hitos_comerciales?select=clave,orden,es_ramal&order=orden.asc").catch((e) => {
    catalogo = null;
    throw e;
  });
  return catalogo;
}

/** Que fases no aplican, segun lo que necesita la opp. */
export type NoAplican = { polycam: boolean; viabilidad: boolean };
const NO_APLICA_SIN_POLYCAM = new Set(["visita", "polycam"]);

/** De la fase guardada (el ultimo hito alcanzado) y el historial, para las
 *  fechas, a los diez hitos. */
export function hitosDeFase(
  cat: HitoCatalogo[],
  e: Pick<EstadoGuardado, "fase" | "seccion"> | null,
  pasos: PasoHistorial[] = [],
  necesita: NoAplican = { polycam: true, viabilidad: true },
): HitoDeEstado[] {
  const orden = new Map(cat.map((h) => [h.clave, h.orden]));
  const completada = !!e && !e.fase && e.seccion === "completado";
  const alcanzada = e?.fase ? (orden.get(e.fase) ?? null) : completada ? Infinity : null;
  // Cuando paso por primera vez a una fase de orden mayor que el de cada hito.
  const fechaDe = (o: number) =>
    pasos
      .filter((p) => (p.fase ? (orden.get(p.fase) ?? -1) : completada ? Infinity : -1) > o)
      .map((p) => p.cuando.slice(0, 10))
      .sort()[0] ?? null;
  return cat.map((h) => {
    if (!necesita.polycam && NO_APLICA_SIN_POLYCAM.has(h.clave)) return { hito: h.clave, estado: "no_aplica", fecha: null };
    if (!necesita.viabilidad && h.clave === "viabilidad_arquitecto") return { hito: h.clave, estado: "no_aplica", fecha: null };
    if (alcanzada === null || h.orden >= alcanzada) return { hito: h.clave, estado: "pendiente", fecha: null };
    if (h.es_ramal) return { hito: h.clave, estado: "saltado", fecha: null };
    return { hito: h.clave, estado: "hecho", fecha: fechaDe(h.orden) };
  });
}

/** Los diez hitos de unas cuantas opps, del estado guardado. Con `conFechas`,
 *  ademas la fecha de cada hito hecho (lee el historial: para la barra y la
 *  ficha; el listado de consulta no la necesita). */
export async function hitosDeEstado(ids: string[], conFechas = true): Promise<Map<string, HitoDeEstado[]>> {
  const m = new Map<string, HitoDeEstado[]>();
  if (!ids.length) return m;
  const cat = await hitos();
  const estados: EstadoGuardado[] = [];
  const historial: PasoHistorial[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const trozo = ids.slice(i, i + 150).join(",");
    const [e, h] = await Promise.all([
      rest<EstadoGuardado[]>(`estado_oportunidad?select=oportunidad_id,fase,seccion&oportunidad_id=in.(${trozo})`),
      conFechas
        ? rest<PasoHistorial[]>(`historial_estado_oportunidad?select=oportunidad_id,fase,cuando&oportunidad_id=in.(${trozo})&order=cuando.asc`)
        : Promise.resolve([]),
    ]);
    estados.push(...e);
    historial.push(...h);
  }
  // Lo que necesita cada una (las fases que no aplican), por tramos a la vez.
  const tramos: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) tramos.push(ids.slice(i, i + 150));
  const necesidades = new Map(
    (await Promise.all(tramos.map((t) => necesidadesDeMuchas(t).catch(() => new Map())))).flatMap((mm) => [...mm.entries()]),
  );
  const porOpp = new Map(estados.map((e) => [e.oportunidad_id, e]));
  const pasosDe = new Map<string, PasoHistorial[]>();
  for (const p of historial) pasosDe.set(p.oportunidad_id, [...(pasosDe.get(p.oportunidad_id) ?? []), p]);
  for (const id of ids) {
    const n = necesidades.get(id) as NoAplican | undefined;
    m.set(id, hitosDeFase(cat, porOpp.get(id) ?? null, pasosDe.get(id) ?? [], n ? { polycam: n.polycam, viabilidad: n.viabilidad } : undefined));
  }
  return m;
}
