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
import { bloqueDeFase, pasoDe, type Clave, type Fase } from "./pasosEscalera";

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

// ------------------------------------------------- la reconstruccion

/** RECONSTRUIR lo que no se midio (primera carga, y cada vez que cambie la regla
 *  de la escalera): las opps sin fila o con la entrada RECONSTRUIDA. Su paso se
 *  recalcula, `desde` es la fecha del hecho que abre su paso (fechaEntradaDeMuchas,
 *  la misma regla que todo lo demas) y su historial reconstruido se rehace con
 *  la regla de la escalera (Monica, 15-oct-2026): la FASE es el ULTIMO HITO
 *  ALCANZADO, y se entra en cada una con su hecho:
 *    1 primer contacto  · el alta
 *    2 visita           · se agenda la visita (la cita)
 *    3 polycam          · pasa el dia de la visita
 *    4 viabilidad       · se pide la viabilidad sin Polycam (o llega el Polycam)
 *    5 documentos       · el arquitecto la envia (o, sin ella, la primera hoja)
 *    6 envio            · el primer envio a la comunidad
 *    8 junta            · la primera junta con fecha
 *    9 firma            · la junta vota que si
 *    10 cobro           · llega la hoja firmada
 *  Todo marcado como reconstruido: deducido, no medido. Lo medido no se toca. */
export async function reconstruir(): Promise<{ opps: number; historial: number }> {
  const hoyISO = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const [opps, hojas, versiones, juntas, cierres, citas, viabs, solicitudes, estados] = await Promise.all([
    todo<{ id: string; fecha_apertura: string | null; creado_en: string }>("oportunidades?select=id,fecha_apertura,creado_en", "id"),
    todo<{ id: string; oportunidad_id: string | null; fecha_creacion: string | null; fecha_firma: string | null; estado: string }>(
      "hojas_encargo?select=id,oportunidad_id,fecha_creacion,fecha_firma,estado&estado=neq.anulada",
      "id",
    ),
    todo<{ hoja_encargo_id: string; fecha_enviada: string | null }>("versiones_hoja?select=hoja_encargo_id,fecha_enviada&fecha_enviada=not.is.null", "id"),
    todo<{ oportunidad_id: string | null; fecha_junta: string | null; resultado: string | null }>("juntas?select=oportunidad_id,fecha_junta,resultado", "id"),
    todo<{ oportunidad_id: string; fecha_cierre: string | null; creado_en: string }>("motivo_cierre_oportunidad?select=oportunidad_id,fecha_cierre,creado_en", "id"),
    todo<{ oportunidad_id: string | null; creado_en: string; inicio: string }>("citas?select=oportunidad_id,creado_en,inicio&tipo=eq.escaneo_polycam&estado=neq.anulada", "id"),
    todo<{ oportunidad_id: string | null; enviada_en: string | null }>("viabilidades?select=oportunidad_id,enviada_en&enviada_en=not.is.null", "id"),
    todo<{ oportunidad_id: string; pedida_en: string }>("solicitudes_viabilidad?select=oportunidad_id,pedida_en&estado=neq.anulada", "id"),
    todo<{ oportunidad_id: string; desde_reconstruido: boolean }>("estado_oportunidad?select=oportunidad_id,desde_reconstruido", "oportunidad_id"),
  ]);
  const medidas = new Set(estados.filter((e) => !e.desde_reconstruido).map((e) => e.oportunidad_id));
  const aRehacer = opps.filter((o) => !medidas.has(o.id));
  if (!aRehacer.length) return { opps: 0, historial: 0 };

  const dia = (x: string | null | undefined) => (x ? x.slice(0, 10) : null);
  const min = (xs: (string | null | undefined)[]) => xs.map(dia).filter((x): x is string => !!x).sort()[0] ?? null;
  const porOpp = <T extends { oportunidad_id: string | null }>(xs: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of xs) if (x.oportunidad_id) m.set(x.oportunidad_id, [...(m.get(x.oportunidad_id) ?? []), x]);
    return m;
  };
  const hojaDe = new Map(hojas.map((h) => [h.id, h]));
  const [hojasDe, juntasDe, cierreDe, citasDe, viabsDe, solDe] = [porOpp(hojas), porOpp(juntas), porOpp(cierres), porOpp(citas), porOpp(viabs), porOpp(solicitudes)];
  const enviosDe = new Map<string, string[]>();
  for (const v of versiones) {
    const o = hojaDe.get(v.hoja_encargo_id)?.oportunidad_id;
    if (o && v.fecha_enviada) enviosDe.set(o, [...(enviosDe.get(o) ?? []), v.fecha_enviada]);
  }
  // Las fases en su orden (las de FASES, sin el 3D, que es un ramal), con la
  // clave que representa la entrada en cada una.
  const ENTRADA: [Fase, Clave][] = [
    ["primer_contacto", "cerrar_visita"],
    ["visita", "esperando_visita"],
    ["polycam", "enviar_polycam"],
    ["viabilidad_arquitecto", "arquitecto_viabilidad"],
    ["preparacion_documentos", "preparar_docs"],
    ["envio_documentos", "falta_fecha_junta"],
    ["junta", "junta_por_celebrar"],
    ["firma", "junta_si_falta_firmada"],
    ["cobro", "falta_ok_cobro_primera"],
  ];
  const pos = (f: Fase | null) => (f ? ENTRADA.findIndex(([x]) => x === f) : ENTRADA.length);

  const { faltaDeMuchas, fechaEntradaDeMuchas } = await import("./resumenComercial");
  let nHist = 0;
  const tramos: (typeof aRehacer)[] = [];
  for (let i = 0; i < aRehacer.length; i += 150) tramos.push(aRehacer.slice(i, i + 150));
  for (const trozo of tramos) {
    const ids = trozo.map((o) => o.id);
    const [faltas, fechas] = await Promise.all([faltaDeMuchas(ids), fechaEntradaDeMuchas(ids)]);
    const filas: Record<string, unknown>[] = [];
    const historial: Record<string, unknown>[] = [];
    for (const o of trozo) {
      const f = faltas.get(o.id);
      if (!f) continue;
      const p = pasoDe(f.clave);
      const cita = citasDe.get(o.id)?.[0] ?? null;
      const visitaPasada = cita && dia(cita.inicio)! <= hoyISO ? dia(cita.inicio) : null;
      const hs = hojasDe.get(o.id) ?? [];
      const js = juntasDe.get(o.id) ?? [];
      const hecho: Partial<Record<Fase, string | null>> = {
        primer_contacto: min([o.fecha_apertura, o.creado_en]),
        visita: cita ? dia(cita.creado_en) : null,
        polycam: visitaPasada,
        viabilidad_arquitecto: min((solDe.get(o.id) ?? []).map((s) => s.pedida_en)),
        preparacion_documentos: min((viabsDe.get(o.id) ?? []).map((v) => v.enviada_en)) ?? min(hs.map((h) => h.fecha_creacion)),
        envio_documentos: min(enviosDe.get(o.id) ?? []),
        junta: min(js.map((j) => j.fecha_junta)),
        firma: min(js.filter((j) => j.resultado === "favorable").map((j) => j.fecha_junta)),
        cobro: min(hs.filter((h) => h.estado === "devuelta_firmada").map((h) => h.fecha_firma)),
      };
      // La fecha de entrada del paso actual: la del hecho que lo abre, con la
      // misma regla que las alertas; si no hay, la de la fase; si no, el alta.
      const cierre = min((cierreDe.get(o.id) ?? []).map((c) => c.fecha_cierre ?? c.creado_en));
      const desde = fechas.get(o.id) ?? (p.fase ? hecho[p.fase] : cierre) ?? hecho.primer_contacto ?? o.creado_en.slice(0, 10);
      // El historial: las entradas en cada fase hasta la actual, en orden y sin
      // fechas que vuelvan atras ni pasen de la entrada actual.
      const lineas: { fase: Fase | null; clave: Clave; cuando: string }[] = [];
      for (const [fase, clave] of ENTRADA) {
        const cuando = hecho[fase];
        if (!cuando || pos(fase) > pos(p.fase) || cuando > desde) continue;
        if (lineas.length && cuando < lineas[lineas.length - 1].cuando) continue;
        lineas.push({ fase, clave, cuando });
      }
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
    // Fuera lo reconstruido de estas opps, y dentro lo nuevo.
    await pedir(`historial_estado_oportunidad?reconstruido=is.true&oportunidad_id=in.(${ids.join(",")})`, { method: "DELETE" });
    if (filas.length)
      await pedir("estado_oportunidad?on_conflict=oportunidad_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(filas),
      });
    if (historial.length) await pedir("historial_estado_oportunidad", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(historial) });
    nHist += historial.length;
  }
  return { opps: aRehacer.length, historial: nHist };
}
