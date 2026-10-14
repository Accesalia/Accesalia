// lib/resumenComercial.ts
//
// "RESUMEN DE COMO ESTAN LAS COSAS" (Monica, 14-oct-2026). Las opps abiertas de un
// comercial, agrupadas por lo que toca hacer, en una lista simple: "opp - lo que
// pasa (construido con datos) - a quien llamar - grabar". "Es casi el flujo
// comercial que ya tenemos, pero mostrado de otra manera, mas masticado."
//
// - Cada opp sale UNA vez, en la seccion de su paso.
// - ALERTAS POR FASE (Monica, 14-oct-2026): cada fase tiene su plazo, contado desde
//   que EMPEZO esa fase -no desde la ultima actividad, que castiga lo heredado-.
//   Las que lo pasan van arriba de su seccion, en rojo, con los dias que llevan.
// - El paso es el de la escalera de "lo que nos bloquea" de la cabecera
//   (lib/cabeceraOpp.ts, falta): mismas reglas, aqui calculadas de golpe.
// - A quien llamar: el administrador de la comunidad; si no, el contacto de la
//   comunidad; si no, quien la trajo. Con el telefono a la vista.

import "server-only";
import { estadoCon, falta, type CierreCrudo, type Datos, type HojaCruda, type Paso } from "./cabeceraOpp";
import { nombreDeOpp } from "./direccionOpp";
import type { EstadoRevision } from "./revisionOferta";

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
/** Por tramos de ids: la lista entera no cabe en una direccion. */
async function porTramos<T>(ids: string[], hacer: (tramo: string) => string): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 80) out.push(...(await leer<T>(hacer(ids.slice(i, i + 80).join(",")))));
  return out;
}

const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const ddmmaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
const dias = (iso: string) => Math.round((Date.parse(hoyISO()) - Date.parse(iso.slice(0, 10))) / 86_400_000);
const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type Seccion = Exclude<Paso, "completado" | "cerrada">;
export const SECCIONES: { clave: Seccion; titulo: string }[] = [
  { clave: "escaneo", titulo: "Pendientes de escaneo" },
  { clave: "sin_hoja", titulo: "Sin hoja enviada" },
  { clave: "hoja_enviada", titulo: "Hoja enviada" },
  { clave: "junta", titulo: "Pendiente de junta" },
  { clave: "firma", titulo: "Votan sí, falta la hoja firmada" },
  { clave: "cobro", titulo: "Firmada, pendiente de cobrar" },
];

export type Llamar = { quien: string; papel: string; telefono: string | null; empresa?: string | null; persona?: string | null };

/** COMO SE DESBLOQUEA (Monica, 15-oct-2026): "cada item no puede ser una
 *  excepcion". Las alertas se agrupan por lo que hay que hacer para moverlas:
 *  - admin: llamar o escribir al administrador. La UNICA que tiene margen: si se
 *    graba un contacto, sale de alertas 5 dias, y si no pasa nada, vuelve.
 *  - interno: preguntar en casa (viabilidad, ok a la oferta, cobro). Sin margen:
 *    "deben responder inmediatamente".
 *  - doc: generar el documento y enviarlo. Sin margen: no depende de nadie.
 *  - polycam: cerrar el escaneo. Sin margen: "si no te dan dia, vas y escaneas".
 *  - perdida: darla por perdida y cerrarla. Al cerrarla, sale. */
export type Accion = "admin" | "interno" | "doc" | "polycam" | "perdida";
export const ACCIONES: { clave: Accion; titulo: string; sub: string }[] = [
  { clave: "admin", titulo: "Llamar o escribir al administrador", sub: "Al grabar lo que te digan, sale de alertas 5 días. Si no se mueve, vuelve." },
  { clave: "interno", titulo: "Preguntar en casa", sub: "Viabilidad, ok a la oferta o cobro: deben responder en el día." },
  { clave: "doc", titulo: "Generar el documento y enviarlo", sub: "Lo tenemos todo: no depende de nadie, hay que hacerlo." },
  { clave: "polycam", titulo: "Hacer el Polycam", sub: "Llama al contacto y cierra fecha. Si no te dan día, vas y escaneas." },
  { clave: "perdida", titulo: "Darla por perdida y cerrarla", sub: "Seis meses sin noticias, o la junta votó que no." },
];

export type FilaResumen = {
  id: string;
  codigo: string | null;
  nombre: string;
  seccion: Seccion;
  /** Lo que pasa, corto y con su fecha: "Hoja enviada el 04/06/25". */
  pasa: string;
  llamar: Llamar[];
  /** La administracion, para agrupar las llamadas: una llamada mueve varias opps. */
  admin: Llamar | null;
  /** Con quien se habla en casa, si es "interno". */
  enCasa: string | null;
  ultima: string | null;
  /** El ultimo contacto grabado (diario, llamadas). */
  contacto: string | null;
  accion: Accion;
  /** Pasado el plazo de su fase (y fuera del margen tras un contacto). */
  alerta: boolean;
  /** Los dias que lleva en la fase (para ordenar: lo mas parado arriba). */
  diasFase: number;
  plazo: number;
};

/** LOS PLAZOS DE CADA FASE (Monica, 14-oct-2026). */
export const PLAZOS = {
  sinFechaEscaneo: 7, // se abre y no hay fecha de Polycam
  visitaSinPolycam: 7, // (de Claude) paso la visita y no llega el Polycam
  polycamSinViabilidad: 10,
  sinHojaEnviada: 30, // un mes DESDE EL ESCANEO: "a veces el presi no da dia hasta semanas despues"
  hojaSinNoticias: 30,
  juntaSinResultado: 5, // "5 por si hay festivos, que si no serian 3"
  aprobadaSinHoja: 7, // votan si y no llega la hoja firmada (Monica, 14-oct)
  firmadaSinCobro: 15,
  /** Tras grabar una llamada o un mail al administrador, sale de alertas estos dias. */
  margenTrasContacto: 5,
  /** (de Claude, a confirmar) hoja enviada sin noticias: pasa a "darla por perdida". */
  darPorPerdida: 180,
};

type OppCruda = {
  id: string;
  codigo: string | null;
  nombre: string | null;
  estado: string;
  fecha_apertura: string | null;
  creado_en: string;
  comunidad_id: string | null;
  contacto_provisional: string | null;
  telefono_provisional: string | null;
  pc: { nombre: string; telefono: string | null; rol: string | null } | null;
  trajo: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null;
  cierres: CierreCrudo[];
  hojas: HojaCruda[];
  portales: { hasta: string | null; acceso: { id: string; municipio: string | null } | null }[];
};

const SEL =
  "id,codigo,nombre,estado,fecha_apertura,creado_en,comunidad_id,contacto_provisional,telefono_provisional," +
  "pc:persona_comunidad_id(nombre,telefono,rol),trajo:quien_lo_trae(nombre,apellidos,telefono_personal)," +
  "cierres:motivo_cierre_oportunidad(fecha_cierre,resultado_final,motivo_perdido,creado_en)," +
  "hojas:hojas_encargo(id,estado,fecha_firma,fecha_estado,versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(numero_version,url_pdf_hoja,fecha_generada,fecha_enviada))," +
  "portales:relacion_oportunidad_accesos(hasta,acceso:acceso_id(id,municipio))";

/** El resumen de un comercial (o de todos: null). */
export async function resumenComercial(comercialId: string | null): Promise<{ filas: FilaResumen[] }> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const ops = await leer<OppCruda>(`oportunidades?select=${SEL}&estado=eq.abierta${f}&order=id`);
  const ids = ops.map((o) => o.id);
  if (!ids.length) return { filas: [] };

  const accesoDe = new Map<string, string>(); // acceso -> opp
  for (const o of ops) for (const p of o.portales) if (!p.hasta && p.acceso) accesoDe.set(p.acceso.id, o.id);
  const firmadasDe = new Map<string, string>(); // hoja firmada -> opp
  for (const o of ops) for (const h of o.hojas) if (h.estado === "devuelta_firmada") firmadasDe.set(h.id, o.id);

  const [juntas, tres, citas, viab, revs, notas, inter, llam, admins, puestosCom, conPoly, cobros] = await Promise.all([
    porTramos<{ oportunidad_id: string; fecha_junta: string | null; celebrada: boolean; resultado: string | null; creado_en: string }>(ids,
      (t) => `juntas?select=oportunidad_id,fecha_junta,celebrada,resultado,creado_en&oportunidad_id=in.(${t})`),
    porTramos<{ oportunidad_id: string; tipo_3d: string | null; estado: string | null; creado_en: string }>(ids,
      (t) => `modelos_3d_venta?select=oportunidad_id,tipo_3d,estado,creado_en&oportunidad_id=in.(${t})`),
    porTramos<{ oportunidad_id: string; inicio: string }>(ids,
      (t) => `citas?select=oportunidad_id,inicio&tipo=eq.escaneo_polycam&estado=neq.anulada&oportunidad_id=in.(${t})`).catch(() => []),
    porTramos<{ id: string; oportunidad_id: string; enviada_en: string | null; url_pdf: string | null }>(ids,
      (t) => `viabilidades?select=id,oportunidad_id,enviada_en,url_pdf&oportunidad_id=in.(${t})`),
    porTramos<{ oportunidad_id: string; numero: number; estado: string; enviada_en: string; resuelta_en: string | null; comentario: string | null; resuelve: { nombre: string } | null }>(ids,
      (t) => `revisiones_oferta?select=oportunidad_id,numero,estado,enviada_en,resuelta_en,comentario,resuelve:resuelta_por(nombre)&oportunidad_id=in.(${t})`).catch(() => []),
    porTramos<{ oportunidad_id: string; fecha: string | null; creado_en: string }>(ids, (t) => `notas_oportunidad?select=oportunidad_id,fecha,creado_en&oportunidad_id=in.(${t})`),
    porTramos<{ oportunidad_id: string; fecha_evento: string | null; creado_en: string }>(ids,
      (t) => `interacciones?select=oportunidad_id,fecha_evento,creado_en&oportunidad_id=in.(${t})`).catch(() => []),
    porTramos<{ donde_oportunidad_id: string; creado_en: string }>(ids,
      (t) => `llamadas?select=donde_oportunidad_id,creado_en&donde_oportunidad_id=in.(${t})`).catch(() => []),
    porTramos<{ comunidad_id: string; empresa: { nombre_accesalia: string } | null; puesto: { telefono_empresa: string | null; persona: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null } | null }>(
      [...new Set(ops.map((o) => o.comunidad_id).filter((x): x is string => !!x))],
      (t) => `comunidad_admin_responsable?select=comunidad_id,empresa:empresa_id(nombre_accesalia),puesto:puesto_id(telefono_empresa,persona:persona_id(nombre,apellidos,telefono_personal))&vigente=is.true&comunidad_id=in.(${t})`),
    porTramos<{ figura_legal_propietaria_id: string; cargo: string | null; persona: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null }>(
      [...new Set(ops.map((o) => o.comunidad_id).filter((x): x is string => !!x))],
      (t) => `puesto?select=figura_legal_propietaria_id,cargo,persona:persona_id(nombre,apellidos,telefono_personal)&hasta=is.null&figura_legal_propietaria_id=in.(${t})`),
    porTramos<{ acceso_id: string; polycam: { fecha: string | null; creado_en: string } | null }>([...accesoDe.keys()],
      (t) => `relacion_polycam_acceso?select=acceso_id,polycam:polycam_id(fecha,creado_en)&acceso_id=in.(${t})`).catch(() => []),
    porTramos<{ hoja_encargo_id: string; es_porcentaje: boolean | null; hitos: { estado: string }[] }>([...firmadasDe.keys()],
      (t) => `lineas_facturacion?select=hoja_encargo_id,es_porcentaje,hitos:hitos_cobro(estado)&quitada_en=is.null&hoja_encargo_id=in.(${t})`),
  ]);
  // El Polycam tambien puede colgar de una viabilidad suya (la mesa).
  const polyViab = viab.length
    ? await porTramos<{ viabilidad_id: string; fecha: string | null; creado_en: string }>(viab.map((v) => v.id),
        (t) => `escaneados_polycam?select=viabilidad_id,fecha,creado_en&viabilidad_id=in.(${t})`).catch(() => [])
    : [];
  const viabDe = new Map(viab.map((v) => [v.id, v.oportunidad_id]));

  const grupo = <T,>(xs: T[], k: (x: T) => string | null | undefined) => {
    const m = new Map<string, T[]>();
    for (const x of xs) { const key = k(x); if (key) m.set(key, [...(m.get(key) ?? []), x]); }
    return m;
  };
  const juntasDe = grupo(juntas, (x) => x.oportunidad_id);
  const tresDe = grupo(tres, (x) => x.oportunidad_id);
  const citaDe = grupo(citas, (x) => x.oportunidad_id);
  const revDe = grupo(revs, (x) => x.oportunidad_id);
  const adminDe = grupo(admins, (x) => x.comunidad_id);
  const comDe = grupo(puestosCom, (x) => x.figura_legal_propietaria_id);
  // el Polycam de cada opp, con el dia que llego (el primero)
  const polyFecha = new Map<string, string>();
  const llega = (opp: string | undefined, f: string | null | undefined) => {
    if (!opp || !f) return;
    const d = f.slice(0, 10);
    if (!polyFecha.has(opp) || d < polyFecha.get(opp)!) polyFecha.set(opp, d);
  };
  for (const p of conPoly) llega(accesoDe.get(p.acceso_id), p.polycam?.fecha ?? p.polycam?.creado_en);
  for (const p of polyViab) llega(viabDe.get(p.viabilidad_id), p.fecha ?? p.creado_en);
  const polyOpp = new Set(polyFecha.keys());
  const arquitecto = new Set(viab.filter((v) => v.enviada_en || v.url_pdf).map((v) => v.oportunidad_id));
  const cobrosDe = new Map<string, { alguno: boolean; todos: boolean }>();
  const hitosDe = grupo(cobros.filter((l) => !l.es_porcentaje).flatMap((l) => l.hitos.filter((h) => h.estado !== "anulado").map((h) => ({ opp: firmadasDe.get(l.hoja_encargo_id)!, h }))), (x) => x.opp);
  for (const [opp, hs] of hitosDe) {
    const hechos = hs.filter((x) => x.h.estado === "completado").length;
    cobrosDe.set(opp, { alguno: hechos > 0, todos: hs.length > 0 && hechos === hs.length });
  }
  // la ultima actividad: cualquier rastro con fecha
  const ultima = new Map<string, string>();
  const toca = (opp: string | null | undefined, f: string | null | undefined) => {
    if (!opp || !f) return;
    const d = f.slice(0, 10);
    if (d <= hoyISO() && d > (ultima.get(opp) ?? "")) ultima.set(opp, d);
  };
  for (const n of notas) toca(n.oportunidad_id, n.fecha);
  for (const n of inter) toca(n.oportunidad_id, n.fecha_evento ?? n.creado_en);
  for (const l of llam) toca(l.donde_oportunidad_id, l.creado_en);
  // el ultimo CONTACTO grabado: diario y llamadas, nada mas
  const contacto = new Map<string, string>();
  const habla = (opp: string | null | undefined, f: string | null | undefined) => {
    if (!opp || !f) return;
    const d = f.slice(0, 10);
    if (d <= hoyISO() && d > (contacto.get(opp) ?? "")) contacto.set(opp, d);
  };
  for (const n of notas) habla(n.oportunidad_id, n.fecha ?? n.creado_en);
  for (const n of inter) habla(n.oportunidad_id, n.fecha_evento ?? n.creado_en);
  for (const l of llam) habla(l.donde_oportunidad_id, l.creado_en);
  for (const j of juntas) toca(j.oportunidad_id, j.fecha_junta);
  for (const o of ops) {
    toca(o.id, o.fecha_apertura ?? o.creado_en);
    for (const h of o.hojas) { toca(o.id, h.fecha_firma); for (const v of h.versiones) { toca(o.id, v.fecha_generada); toca(o.id, v.fecha_enviada); } }
  }

  const filas: FilaResumen[] = [];
  for (const o of ops) {
    const hojas = o.hojas.filter((h) => h.estado !== "anulada");
    const estado = estadoCon(o, hojas, cobrosDe.get(o.id) ?? { alguno: false, todos: false });
    const r = [...(revDe.get(o.id) ?? [])].sort((a, b) => b.numero - a.numero)[0];
    const generadoTras = (f: string | null) => !!f && hojas.some((h) => h.versiones.some((v) => v.fecha_generada && v.fecha_generada > f.slice(0, 10)));
    const revision = r
      ? ({ ultima: { numero: r.numero, estado: r.estado, enviadaEn: r.enviada_en, resueltaEn: r.resuelta_en, comentario: r.comentario, resueltaPor: r.resuelve?.nombre ?? null },
           okVigente: r.estado === "ok" && !generadoTras(r.resuelta_en), okCaducado: r.estado === "ok" && generadoTras(r.resuelta_en) } as unknown as EstadoRevision)
      : null;
    const tresd = [...(tresDe.get(o.id) ?? [])].sort((a, b) => b.creado_en.localeCompare(a.creado_en))[0] ?? null;
    const d: Datos = {
      estado, hojas, juntas: juntasDe.get(o.id) ?? [], tresd, cita: citaDe.get(o.id)?.[0] ?? null,
      polycam: polyOpp.has(o.id), arquitecto: arquitecto.has(o.id), revision,
    };
    const fa = falta(d);
    if (fa.paso === "completado" || fa.paso === "cerrada" || !fa.paso) continue;

    // LO QUE PASA, corto y con su fecha.
    const enviada = hojas.flatMap((h) => h.versiones.map((v) => v.fecha_enviada)).filter(Boolean).sort().at(-1) as string | undefined;
    const juntaSi = (juntasDe.get(o.id) ?? []).filter((j) => j.resultado === "favorable").map((j) => j.fecha_junta).filter(Boolean).sort().at(-1) as string | undefined;
    const u0 = ultima.get(o.id) ?? null;
    const c0 = contacto.get(o.id) ?? null;
    const abierta = (o.fecha_apertura ?? o.creado_en).slice(0, 10);
    const ultJunta = [...(juntasDe.get(o.id) ?? [])].filter((j) => j.fecha_junta).sort((a, b) => a.fecha_junta!.localeCompare(b.fecha_junta!)).at(-1);
    const el = (iso: string | null | undefined) => (iso ? ` el ${ddmmaa(iso)}` : "");

    // EL PLAZO DE SU FASE, contado desde que empezo la fase; y COMO SE DESBLOQUEA.
    let desde = abierta, plazo = PLAZOS.sinHojaEnviada, accion: Accion = "doc", enCasa: string | null = null, pasa = fa.texto;
    if (fa.paso === "escaneo") {
      accion = "polycam";
      if (d.cita) { desde = d.cita.inicio.slice(0, 10); plazo = PLAZOS.visitaSinPolycam; pasa = `Visita${el(desde)}, falta el Polycam`; }
      else { plazo = PLAZOS.sinFechaEscaneo; pasa = `Abierta${el(abierta)}, sin fecha para escanear`; }
    } else if (fa.paso === "sin_hoja") {
      desde = polyFecha.get(o.id) ?? abierta;
      if (d.polycam && !d.arquitecto) { plazo = PLAZOS.polycamSinViabilidad; accion = "interno"; enCasa = "quien hace la viabilidad"; pasa = `Polycam${el(desde)}, falta la viabilidad`; }
      else if (/ok a la/.test(fa.texto)) { accion = "interno"; enCasa = "quien revisa la oferta"; }
      else pasa = fa.texto + (fa.extra ? ` · ${fa.extra}` : "");
    } else if (fa.paso === "hoja_enviada") {
      desde = enviada ?? abierta; plazo = PLAZOS.hojaSinNoticias; accion = "admin";
      pasa = /nueva oferta/.test(fa.texto) ? `Nueva oferta enviada${el(enviada)}, sin respuesta` : `Hoja enviada${el(enviada)}, sin fecha de junta`;
      // Seis meses sin saber nada: ya no es llamar, es cerrarla.
      const ultimaNoticia = [enviada, c0].filter(Boolean).sort().at(-1) ?? abierta;
      if (dias(ultimaNoticia) > PLAZOS.darPorPerdida) { accion = "perdida"; pasa += `; nada desde${el(ultimaNoticia)}`; }
    } else if (fa.paso === "junta") {
      desde = ultJunta?.fecha_junta ?? abierta; plazo = PLAZOS.juntaSinResultado; accion = "admin";
      if (/votó que no/.test(fa.texto)) { accion = "perdida"; plazo = 0; pasa = `La junta votó que no${el(ultJunta?.fecha_junta)}`; }
      else if (desde > hoyISO()) pasa = `Junta${el(desde)}`;
      else pasa = `Junta${el(desde)}, no sabemos qué votaron`;
    } else if (fa.paso === "firma") {
      desde = juntaSi ?? ultJunta?.fecha_junta ?? abierta; plazo = PLAZOS.aprobadaSinHoja; accion = "admin";
      pasa = `Votaron sí${el(juntaSi)}, falta la hoja firmada`;
    } else if (fa.paso === "cobro") {
      desde = estado.fechaGanada ?? abierta; plazo = PLAZOS.firmadaSinCobro; accion = "interno"; enCasa = "facturación";
      pasa = `Firmada${el(estado.fechaGanada)}, sin cobrar la primera parte`;
    }
    const diasFase = desde <= hoyISO() ? dias(desde) : 0; // una junta futura no cuenta
    let alerta = diasFase > plazo;
    // EL MARGEN, solo para el administrador: grabado un contacto en la fase, sale
    // de alertas 5 dias; si no se mueve, vuelve (Monica, 15-oct-2026).
    if (alerta && accion === "admin" && c0 && c0 >= desde && dias(c0) <= PLAZOS.margenTrasContacto) alerta = false;

    // A QUIEN LLAMAR
    const llamar: Llamar[] = [];
    const a = adminDe.get(o.comunidad_id ?? "")?.[0];
    if (a) {
      const pe = a.puesto?.persona;
      llamar.push({
        quien: [pe ? [pe.nombre, pe.apellidos].filter(Boolean).join(" ") : null, a.empresa?.nombre_accesalia].filter(Boolean).join(" · "),
        papel: "administración",
        telefono: a.puesto?.telefono_empresa ?? pe?.telefono_personal ?? null,
        empresa: a.empresa?.nombre_accesalia ?? null,
        persona: pe ? [pe.nombre, pe.apellidos].filter(Boolean).join(" ") : null,
      });
    }
    const PESO: Record<string, number> = { presidente: 0, vicepresidente: 1, secretario: 2 };
    const com = [...(comDe.get(o.comunidad_id ?? "") ?? [])].filter((p) => p.persona).sort((x, y) => (PESO[x.cargo ?? ""] ?? 9) - (PESO[y.cargo ?? ""] ?? 9))[0];
    if (com) llamar.push({ quien: [com.persona!.nombre, com.persona!.apellidos].filter(Boolean).join(" "), papel: com.cargo ?? "comunidad", telefono: com.persona!.telefono_personal });
    else if (o.pc) llamar.push({ quien: o.pc.nombre, papel: o.pc.rol ?? "comunidad", telefono: o.pc.telefono });
    else if (o.contacto_provisional) llamar.push({ quien: o.contacto_provisional, papel: "contacto", telefono: o.telefono_provisional });
    if (!llamar.length && o.trajo) llamar.push({ quien: [o.trajo.nombre, o.trajo.apellidos].filter(Boolean).join(" "), papel: "la trajo", telefono: o.trajo.telefono_personal });

    // EL NOMBRE, SIEMPRE CON MUNICIPIO (Monica, 14-oct-2026: "no pones el municipio casi nunca").
    let nombre = nombreDeOpp(o);
    const muni = o.portales.map((p) => p.acceso?.municipio).find(Boolean);
    if (muni && !limpio(nombre).includes(limpio(muni))) nombre = `${nombre}, ${muni.charAt(0) + muni.slice(1).toLowerCase()}`;

    filas.push({
      id: o.id, codigo: o.codigo, nombre, seccion: fa.paso as Seccion, pasa, llamar,
      admin: llamar.find((l) => l.papel === "administración") ?? null, enCasa,
      ultima: u0, contacto: c0, accion, alerta, diasFase, plazo,
    });
  }
  // Lo mas parado primero.
  filas.sort((x, y) => y.diasFase - x.diasFase);
  return { filas };
}

// ---------------------------------------------------------------- el mapa

/** EL MAPA DEBAJO DEL RESUMEN (Daniel, 14-oct-2026): "un punto por direccion:
 *  cerradas perdidas en rojo, ganadas en verde, en curso en azul". Todas las
 *  opps del comercial, tambien las cerradas. La posicion, de su comunidad; si no
 *  la tiene, de la ficha de Catastro de sus portales. */
export type PuntoOpp = { id: string; nombre: string; lat: number; lng: number; estado: "ganada" | "perdida" | "en_curso" };

export async function puntosMapa(comercialId: string | null): Promise<{ puntos: PuntoOpp[]; sinPosicion: number }> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const ops = await leer<{
    id: string;
    nombre: string | null;
    codigo: string | null;
    estado: string;
    comunidad: { lat: number | null; lng: number | null } | null;
    hojas: { estado: string }[];
    portales: { hasta: string | null; acceso: { portal: { ficha: { lat: number | null; lng: number | null } | null } | null } | null }[];
  }>(
    `oportunidades?select=id,nombre,codigo,estado,comunidad:comunidad_id(lat,lng),hojas:hojas_encargo(estado),` +
      `portales:relacion_oportunidad_accesos(hasta,acceso:acceso_id(portal:ficha_catastro_portal_id(ficha:ficha_id(lat,lng))))${f}&order=id`,
  );
  const puntos: PuntoOpp[] = [];
  let sinPosicion = 0;
  for (const o of ops) {
    const ficha = o.portales.map((p) => p.acceso?.portal?.ficha).find((x) => x?.lat != null && x?.lng != null);
    const lat = o.comunidad?.lat ?? ficha?.lat ?? null;
    const lng = o.comunidad?.lng ?? ficha?.lng ?? null;
    if (lat == null || lng == null) { sinPosicion++; continue; }
    const ganada = o.hojas.some((h) => h.estado === "devuelta_firmada");
    puntos.push({ id: o.id, nombre: nombreDeOpp(o), lat, lng, estado: ganada ? "ganada" : o.estado === "cerrada" ? "perdida" : "en_curso" });
  }
  return { puntos, sinPosicion };
}
