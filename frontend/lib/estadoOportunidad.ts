// lib/estadoOportunidad.ts
//
// EL ESTADO DE CADA OPP, UNA SOLA VERDAD (Monica, 15-oct-2026). La escalera de
// copys manda: su paso (la CLAVE, de faltaDeMuchas en lib/resumenComercial.ts) da
// la fase, el bloque, la seccion de alertas y como se desbloquea (PASOS, en
// lib/pasosEscalera.ts). Aqui solo se GUARDA, en `estado_oportunidad`, para que
// las pantallas lo lean rapido, y cada CAMBIO de paso queda con su fecha en
// `historial_estado_oportunidad`.
//
// Las reglas viven en el codigo, en un solo sitio; no hay disparadores en la
// base. Se recalcula:
//   - tras cada accion que toca una opp (recalcularLuego), origen "accion";
//   - al abrir su ficha, origen "ficha";
//   - en el BARRIDO nocturno de seguridad, que dice cuantas corrigio ("barrido");
//   - tras una carga por script ("carga"): lo que se cambia por fuera de la app
//     no avisa, y hay que recalcularlo a mano.

import "server-only";
import { after } from "next/server";
import { BLOQUES, bloqueDeFase, pasoDe, type Clave, type Fase } from "./pasosEscalera";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}
/** Todas las filas, de 1.000 en 1.000 (PostgREST corta en 1.000 y no lo dice). */
async function todo<T>(ruta: string, orden: string): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const t = await pedir<T[]>(`${ruta}${ruta.includes("?") ? "&" : "?"}order=${orden}`, { headers: { Range: `${desde}-${desde + 999}` } });
    out.push(...t);
    if (t.length < 1000) return out;
  }
}

export type Origen = "accion" | "ficha" | "barrido" | "carga";
type Fila = { oportunidad_id: string; clave: string; fase: string | null; desde: string };

/** Recalcula estas opps y lo guarda. Si una cambia de paso (o no tenia fila),
 *  nueva fecha de entrada y una linea en el historial; si sigue en el mismo,
 *  solo se refrescan el texto y la hora del calculo. Devuelve cuantas cambiaron. */
export async function recalcularMuchas(ids: string[], origen: Origen): Promise<{ total: number; cambiadas: number }> {
  const unicos = [...new Set(ids.filter((x) => /^[0-9a-f-]{36}$/.test(x)))];
  if (!unicos.length) return { total: 0, cambiadas: 0 };
  let total = 0;
  let cambiadas = 0;
  for (let i = 0; i < unicos.length; i += 150) {
    const trozo = unicos.slice(i, i + 150);
    // Se importa aqui: la escalera lee hojas, revisiones, citas... y esos libs
    // avisan a este, asi que cargarla arriba haria un circulo.
    const { faltaDeMuchas, fechaEntradaDeMuchas } = await import("./resumenComercial");
    const [faltas, antes] = await Promise.all([
      faltaDeMuchas(trozo),
      pedir<Fila[]>(`estado_oportunidad?select=oportunidad_id,clave,fase,desde&oportunidad_id=in.(${trozo.join(",")})`),
    ]);
    const previo = new Map(antes.map((f) => [f.oportunidad_id, f]));
    const ahora = new Date().toISOString();
    // LA FECHA DEL HECHO, SI LA HAY (Monica, 15-oct-2026): "apuntemos la fecha
    // del hecho si la hay, y si no, la de cuando se supo". Si hoy se apunta un
    // Polycam que se hizo en marzo, el paso empezo en marzo: si no, pareceria que
    // la hoja salio antes del escaneo. La fecha la deduce la misma regla que las
    // alertas (fechaEntradaDeMuchas); si no hay, ahora.
    const cambian = [...faltas].filter(([id, f]) => previo.get(id)?.clave !== f.clave).map(([id]) => id);
    const hechos = cambian.length ? await fechaEntradaDeMuchas(cambian).catch(() => new Map<string, string>()) : new Map<string, string>();
    const entrada = (id: string) => (hechos.get(id) ? `${hechos.get(id)}T12:00:00Z` : ahora);
    const filas: Record<string, unknown>[] = [];
    const historial: Record<string, unknown>[] = [];
    for (const [id, f] of faltas) {
      const p = pasoDe(f.clave);
      const ya = previo.get(id);
      const cambia = !ya || ya.clave !== f.clave;
      filas.push({
        oportunidad_id: id,
        clave: f.clave,
        texto: f.texto,
        extra: f.extra,
        fase: p.fase,
        bloque: bloqueDeFase(p.fase),
        seccion: p.seccion,
        accion: p.accion,
        desde: cambia ? entrada(id) : ya!.desde,
        ...(cambia ? { desde_reconstruido: false } : {}),
        calculado_en: ahora,
      });
      if (cambia) {
        cambiadas++;
        // cuando = la fecha del hecho; creado_en (de la base) = cuando lo supo la app.
        historial.push({ oportunidad_id: id, clave_antes: ya?.clave ?? null, clave: f.clave, fase_antes: ya?.fase ?? null, fase: p.fase, cuando: entrada(id), origen });
      }
      total++;
    }
    // Todas las filas del lote con las mismas columnas (las que no cambian no
    // llevan desde_reconstruido: se parten en dos envios).
    const con = filas.filter((f) => "desde_reconstruido" in f);
    const sin = filas.filter((f) => !("desde_reconstruido" in f));
    for (const lote of [con, sin])
      if (lote.length)
        await pedir("estado_oportunidad?on_conflict=oportunidad_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(lote),
        });
    if (historial.length)
      await pedir("historial_estado_oportunidad", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(historial) });
  }
  return { total, cambiadas };
}

/** Una opp. */
export async function recalcular(oppId: string, origen: Origen): Promise<void> {
  await recalcularMuchas([oppId], origen);
}

/** TRAS UNA ACCION: se recalcula cuando la respuesta ya ha salido, para no hacer
 *  esperar a nadie. Si falla, no tumba la accion: el barrido de la noche lo arregla. */
export function recalcularLuego(...oppIds: (string | null | undefined)[]): void {
  const ids = oppIds.filter((x): x is string => !!x);
  if (!ids.length) return;
  const hacer = () => recalcularMuchas(ids, "accion").then(() => undefined).catch((e) => console.error("[estado] recalcular", ids, e));
  try {
    after(hacer);
  } catch {
    void hacer();
  }
}

/** Lo que cuelga de unos ACCESOS (un Polycam se vincula a accesos, no a una opp):
 *  sus opps vivas. */
export function recalcularPorAccesosLuego(accesoIds: string[]): void {
  if (!accesoIds.length) return;
  const hacer = async () => {
    const rel = await pedir<{ opp_id: string }[]>(
      `relacion_oportunidad_accesos?select=opp_id&hasta=is.null&acceso_id=in.(${[...new Set(accesoIds)].slice(0, 150).join(",")})`,
    );
    await recalcularMuchas(rel.map((r) => r.opp_id), "accion");
  };
  try {
    after(() => hacer().catch((e) => console.error("[estado] por accesos", e)));
  } catch {
    void hacer().catch((e) => console.error("[estado] por accesos", e));
  }
}

/** EL BARRIDO NOCTURNO: todas las opps. "cambiadas" son las que estaban mal: si
 *  sale alguna, una accion se olvido de avisar. */
export async function barrido(origen: Origen = "barrido"): Promise<{ total: number; cambiadas: number }> {
  const ids = (await todo<{ id: string }>("oportunidades?select=id", "id")).map((o) => o.id);
  return recalcularMuchas(ids, origen);
}

// ------------------------------------------------- la primera carga

/** LA PRIMERA CARGA, con el historial hacia atras RECONSTRUIDO. Las fechas de
 *  entrada en cada fase se deducen de lo que ya hay en la base (el alta, la
 *  primera hoja, el primer envio, la junta, la firma, el cierre) y quedan
 *  marcadas como reconstruidas: deducidas, no medidas. Solo para opps que aun no
 *  tienen fila. */
export async function cargaInicial(): Promise<{ opps: number; historial: number }> {
  const [opps, hojas, versiones, juntas, cierres, existentes] = await Promise.all([
    todo<{ id: string; fecha_apertura: string | null; creado_en: string }>("oportunidades?select=id,fecha_apertura,creado_en", "id"),
    todo<{ id: string; oportunidad_id: string | null; fecha_creacion: string | null; fecha_firma: string | null; estado: string }>(
      "hojas_encargo?select=id,oportunidad_id,fecha_creacion,fecha_firma,estado&estado=neq.anulada",
      "id",
    ),
    todo<{ hoja_encargo_id: string; fecha_enviada: string | null }>("versiones_hoja?select=hoja_encargo_id,fecha_enviada&fecha_enviada=not.is.null", "id"),
    todo<{ oportunidad_id: string | null; fecha_junta: string | null; resultado: string | null }>("juntas?select=oportunidad_id,fecha_junta,resultado", "id"),
    todo<{ oportunidad_id: string; fecha_cierre: string | null; creado_en: string }>("motivo_cierre_oportunidad?select=oportunidad_id,fecha_cierre,creado_en", "id"),
    todo<{ oportunidad_id: string }>("estado_oportunidad?select=oportunidad_id", "oportunidad_id"),
  ]);
  const ya = new Set(existentes.map((e) => e.oportunidad_id));
  const nuevas = opps.filter((o) => !ya.has(o.id));
  if (!nuevas.length) return { opps: 0, historial: 0 };

  const hojaDe = new Map(hojas.map((h) => [h.id, h]));
  const min = (xs: (string | null | undefined)[]) => xs.filter((x): x is string => !!x).map((x) => x.slice(0, 10)).sort()[0] ?? null;
  const porOpp = <T extends { oportunidad_id: string | null }>(xs: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of xs) if (x.oportunidad_id) m.set(x.oportunidad_id, [...(m.get(x.oportunidad_id) ?? []), x]);
    return m;
  };
  const hojasDe = porOpp(hojas);
  const juntasDe = porOpp(juntas);
  const cierreDe = porOpp(cierres);
  const enviosDe = new Map<string, string[]>();
  for (const v of versiones) {
    const o = hojaDe.get(v.hoja_encargo_id)?.oportunidad_id;
    if (o && v.fecha_enviada) enviosDe.set(o, [...(enviosDe.get(o) ?? []), v.fecha_enviada]);
  }
  // El orden de las fases, para no apuntar una entrada "despues" de la actual.
  const ORDEN = BLOQUES.flatMap((b) => b.hitos);
  const pos = (f: Fase | null) => (f ? ORDEN.indexOf(f) : ORDEN.length);
  // La clave que representa la entrada en cada fase, para el historial.
  const ENTRADA: [Fase, Clave][] = [
    ["visita", "cerrar_visita"],
    ["preparacion_documentos", "preparar_docs"],
    ["junta", "falta_fecha_junta"],
    ["firma", "junta_si_falta_firmada"],
    ["cobro", "falta_ok_cobro_primera"],
  ];

  let nHist = 0;
  for (let i = 0; i < nuevas.length; i += 150) {
    const trozo = nuevas.slice(i, i + 150);
    const { faltaDeMuchas } = await import("./resumenComercial");
    const faltas = await faltaDeMuchas(trozo.map((o) => o.id));
    const filas: Record<string, unknown>[] = [];
    const historial: Record<string, unknown>[] = [];
    for (const o of trozo) {
      const f = faltas.get(o.id);
      if (!f) continue;
      const p = pasoDe(f.clave);
      const hs = hojasDe.get(o.id) ?? [];
      const js = juntasDe.get(o.id) ?? [];
      // Cuando entro en cada fase, segun lo que hay.
      const fechas: Partial<Record<Fase, string | null>> = {
        visita: min([o.fecha_apertura, o.creado_en]),
        preparacion_documentos: min(hs.map((h) => h.fecha_creacion)),
        junta: min(enviosDe.get(o.id) ?? []),
        firma: min(js.filter((j) => j.resultado === "favorable").map((j) => j.fecha_junta)),
        cobro: min(hs.filter((h) => h.estado === "devuelta_firmada").map((h) => h.fecha_firma)),
      };
      const cierre = min((cierreDe.get(o.id) ?? []).map((c) => c.fecha_cierre ?? c.creado_en));
      // Las entradas anteriores o iguales a la fase actual, en orden y sin fechas que retrocedan.
      const pasos: { fase: Fase | null; clave: Clave; cuando: string }[] = [];
      for (const [fase, clave] of ENTRADA) {
        const cuando = fechas[fase];
        if (!cuando || pos(fase) > pos(p.fase)) continue;
        if (pasos.length && cuando < pasos[pasos.length - 1].cuando) continue;
        pasos.push({ fase, clave, cuando });
      }
      // La actual: perdida/completado con su cierre; si no, la entrada de su fase.
      const actual = p.fase ? (pasos.findLast((x) => x.fase === p.fase)?.cuando ?? null) : cierre;
      const desde = actual ?? pasos.at(-1)?.cuando ?? min([o.fecha_apertura, o.creado_en]) ?? o.creado_en.slice(0, 10);
      // El historial: las entradas de fase, y al final el paso actual si es otro.
      const lineas = pasos.filter((x) => x.cuando <= desde);
      if (!lineas.length || lineas.at(-1)!.clave !== f.clave) lineas.push({ fase: p.fase, clave: f.clave, cuando: desde });
      lineas.forEach((x, k) =>
        historial.push({
          oportunidad_id: o.id,
          clave_antes: k ? lineas[k - 1].clave : null,
          clave: x.clave,
          fase_antes: k ? lineas[k - 1].fase : null,
          fase: x.fase,
          cuando: `${x.cuando}T12:00:00Z`,
          origen: "reconstruido",
          reconstruido: true,
        }),
      );
      filas.push({
        oportunidad_id: o.id,
        clave: f.clave,
        texto: f.texto,
        extra: f.extra,
        fase: p.fase,
        bloque: bloqueDeFase(p.fase),
        seccion: p.seccion,
        accion: p.accion,
        desde: `${desde}T12:00:00Z`,
        desde_reconstruido: true,
        calculado_en: new Date().toISOString(),
      });
    }
    if (filas.length)
      await pedir("estado_oportunidad?on_conflict=oportunidad_id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(filas),
      });
    if (historial.length) await pedir("historial_estado_oportunidad", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(historial) });
    nHist += historial.length;
  }
  return { opps: nuevas.length, historial: nHist };
}
