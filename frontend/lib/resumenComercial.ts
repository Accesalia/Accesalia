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
import { estadoCon, falta, type CierreCrudo, type Datos, type EstadoOpp, type Falta, type HojaCruda, type Paso } from "./cabeceraOpp";
import { nombreDeOpp } from "./direccionOpp";
import { pasoDe, type Accion } from "./pasosEscalera";
import { necesidadesDeMuchas } from "./necesidadesOpp";
export type { Accion };
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
/** Lo que lee cargar(), de una vez (funcion datos_alertas de la base). */
type DatosAlertas = {
  juntas: { oportunidad_id: string; fecha_junta: string | null; celebrada: boolean; resultado: string | null; creado_en: string }[];
  tres: { oportunidad_id: string; tipo_3d: string | null; estado: string | null; creado_en: string }[];
  citas: { oportunidad_id: string; inicio: string; creado_en: string }[];
  viab: { id: string; oportunidad_id: string; enviada_en: string | null; url_pdf: string | null }[];
  revs: { oportunidad_id: string; numero: number; estado: string; enviada_en: string; resuelta_en: string | null; comentario: string | null; resuelve: { nombre: string } | null }[];
  notas: { oportunidad_id: string; fecha: string | null; creado_en: string }[];
  inter: { oportunidad_id: string; fecha_evento: string | null; creado_en: string }[];
  llam: { donde_oportunidad_id: string; creado_en: string }[];
  admins: { comunidad_id: string; empresa: { nombre_accesalia: string } | null; puesto: { telefono_empresa: string | null; persona: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null } | null }[];
  puestos: { figura_legal_propietaria_id: string; cargo: string | null; persona: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null }[];
  conPoly: { acceso_id: string; polycam: { fecha: string | null; creado_en: string } | null }[];
  cobros: { hoja_encargo_id: string; es_porcentaje: boolean | null; hitos: { estado: string }[] }[];
  polyViab: { fecha: string | null; creado_en: string; v: { oportunidad_id: string } }[];
  solicitudes: { oportunidad_id: string; pedida_en: string }[];
};

async function datosAlertas(opps: string[], comunidades: string[], accesos: string[], hojas: string[]): Promise<DatosAlertas> {
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/datos_alertas`, {
    method: "POST",
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_opps: opps, p_comunidades: comunidades, p_accesos: accesos, p_hojas: hojas }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase datos_alertas ${r.status}: ${await r.text()}`);
  return (await r.json()) as DatosAlertas;
}

/** Por tramos de ids, todos a la vez: la lista entera no cabe en una direccion.
 *  150 por tramo (unos 5.600 caracteres de ids): menos peticiones a la vez. */
async function porTramos<T>(ids: string[], hacer: (tramo: string) => string): Promise<T[]> {
  const tramos: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) tramos.push(ids.slice(i, i + 150));
  return (await Promise.all(tramos.map((t) => leer<T>(hacer(t.join(",")))))).flat();
}

/** El dia de hoy en Madrid. Se recuerda un minuto: formatear con zona horaria
 *  es caro y se pregunta decenas de miles de veces por carga (cada nota, cada
 *  llamada...): con todas las carteras era mas de un segundo solo en esto
 *  (16-oct-2026). */
let hoyCache = { dia: "", en: 0 };
const hoyISO = () => {
  const ahora = Date.now();
  if (ahora - hoyCache.en > 60_000) hoyCache = { dia: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }), en: ahora };
  return hoyCache.dia;
};
const ddmmaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
/** Una fecha con hora, al dia de Madrid; una fecha sola, tal cual. */
const aDia = (v: string) => (v.length <= 10 ? v : new Date(v).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
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
export const ACCIONES: { clave: Accion; titulo: string; sub: string }[] = [
  { clave: "admin", titulo: "Llamar o escribir al administrador", sub: "Al grabar lo que te digan, sale de alertas 5 días. Si no se mueve, vuelve." },
  { clave: "interno", titulo: "Preguntar en casa", sub: "Viabilidad, ok a la oferta o cobro: deben responder en el día." },
  { clave: "doc", titulo: "Generar el documento y enviarlo", sub: "Lo tenemos todo: no depende de nadie, hay que hacerlo." },
  { clave: "polycam", titulo: "Hacer el Polycam", sub: "Llama al contacto y cierra fecha. Si no te dan día, vas y escaneas." },
  { clave: "perdida", titulo: "Darla por perdida y cerrarla", sub: "Tres meses sin noticias, o la junta votó que no." },
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
  /** Hoja enviada sin noticias: pasa a "darla por perdida". "Un dia a dia normal,
   *  si en 2 meses no sabes nada, es mala cosa; con fiestas y vacaciones, 3"
   *  (Monica, 15-oct-2026). Solo decide si sale en alertas. */
  darPorPerdida: 90,
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
  trajo: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null;
  cierres: CierreCrudo[];
  hojas: HojaCruda[];
  portales: { hasta: string | null; acceso: { id: string; municipio: string | null } | null }[];
};

const SEL =
  "id,codigo,nombre,estado,fecha_apertura,creado_en,comunidad_id,contacto_provisional,telefono_provisional," +
  "trajo:quien_lo_trae(nombre,apellidos,telefono_personal)," +
  "cierres:motivo_cierre_oportunidad(fecha_cierre,resultado_final,motivo_perdido,creado_en)," +
  "hojas:hojas_encargo(id,estado,fecha_firma,fecha_estado,versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(numero_version,url_pdf_hoja,fecha_generada,fecha_enviada))," +
  "portales:relacion_oportunidad_accesos(hasta,acceso:acceso_id(id,municipio))";

/** TODO LO QUE HACE FALTA PARA LA ESCALERA DE MUCHAS OPPS, por tramos: unas
 *  quince consultas para todas, no ocho por opp. Lo usan el resumen y
 *  faltaDeMuchas (el barrido de estado_oportunidad). */
async function cargar(ops: OppCruda[]) {
  const ids = ops.map((o) => o.id);
  const accesoDe = new Map<string, string>(); // acceso -> opp
  for (const o of ops) for (const p of o.portales) if (!p.hasta && p.acceso) accesoDe.set(p.acceso.id, o.id);
  const firmadasDe = new Map<string, string>(); // hoja firmada -> opp
  for (const o of ops) for (const h of o.hojas) if (h.estado === "devuelta_firmada") firmadasDe.set(h.id, o.id);

  const hoy = hoyISO();
  // TODO DE UNA VEZ (16-oct-2026): una sola llamada a la base (datos_alertas)
  // con las mismas filas y la misma forma que las 14 consultas por tramos de
  // antes. Con todas las carteras eran ~170 peticiones a la vez y la base las
  // atendia en cola: 3 s. Lo de las funciones y las necesidades va a la vez.
  const comunidades = [...new Set(ops.map((o) => o.comunidad_id).filter((x): x is string => !!x))];
  const [datos, funciones, necesidades] = await Promise.all([
    datosAlertas(ids, comunidades, [...accesoDe.keys()], [...firmadasDe.keys()]),
    // PREGUNTAR EN CASA: el puesto, con quien lo ejerce hoy al lado (Monica,
    // 15-oct-2026: "Viabilidades (Alex)", "Facturacion (Alexandra)"). De las
    // funciones vigentes del equipo: si cambia la persona, cambia sola.
    leer<{ desde: string | null; hasta: string | null; funcion: { clave: string } | null; equipo: { nombre: string } | null }>(
      `equipo_funciones?select=desde,hasta,funcion:funciones(clave),equipo(nombre)&funciones.clave=in.(viabilidades,facturacion,revision_ofertas)`,
    ).catch(() => []),
    // Lo que necesita (Polycam, viabilidad) y si se pidio la viabilidad sin Polycam.
    necesidadesDeMuchas(ids),
  ]);
  const { juntas, tres, citas, viab, revs, notas, inter, llam, admins, puestos: puestosCom, conPoly, cobros, polyViab, solicitudes } = datos;
  // la primera solicitud de cada opp
  const solicitudDe = new Map<string, string>();
  for (const x of solicitudes) if (!solicitudDe.has(x.oportunidad_id) || x.pedida_en < solicitudDe.get(x.oportunidad_id)!) solicitudDe.set(x.oportunidad_id, x.pedida_en);
  const enCasaDe = (clave: string, puesto: string) => {
    const quien = funciones
      .filter((x) => x.funcion?.clave === clave && (!x.desde || x.desde <= hoy) && (!x.hasta || x.hasta >= hoy) && x.equipo)
      .map((x) => x.equipo!.nombre);
    return quien.length ? `${puesto} (${[...new Set(quien)].join(", ")})` : puesto;
  };

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
  for (const p of polyViab) llega(p.v?.oportunidad_id, p.fecha ?? p.creado_en);
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

  /** Los datos de la escalera de una opp, ya leidos. */
  const datosDe = (o: OppCruda) => {
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
      necesita: { polycam: necesidades.get(o.id)?.polycam ?? true, viabilidad: necesidades.get(o.id)?.viabilidad ?? true, tresd: necesidades.get(o.id)?.tresd ?? false },
      solicitud: solicitudDe.get(o.id) ?? null,
    };
    return { d, estado, hojas };
  };

  /** Las fechas de lo que ha pasado en una opp: de ellas sale la entrada en su
   *  paso y el texto de "lo que pasa". */
  const fechasDe = (o: OppCruda, hojas: HojaCruda[]) => ({
    abierta: (o.fecha_apertura ?? o.creado_en).slice(0, 10),
    enviada: (hojas.flatMap((h) => h.versiones.map((v) => v.fecha_enviada)).filter(Boolean).sort().at(-1) ?? null) as string | null,
    juntaSi: ((juntasDe.get(o.id) ?? []).filter((j) => j.resultado === "favorable").map((j) => j.fecha_junta).filter(Boolean).sort().at(-1) ?? null) as string | null,
    ultJunta: [...(juntasDe.get(o.id) ?? [])].filter((j) => j.fecha_junta).sort((a, b) => a.fecha_junta!.localeCompare(b.fecha_junta!)).at(-1)?.fecha_junta ?? null,
    polycam: polyFecha.get(o.id) ?? null,
    solicitud: solicitudDe.has(o.id) ? aDia(solicitudDe.get(o.id)!) : null,
    agendada: citaDe.get(o.id)?.[0] ? aDia(citaDe.get(o.id)![0].creado_en) : null,
  });

  /** LA FECHA DE ENTRADA EN EL PASO (Monica, 15-oct-2026: UNA sola fecha). Es la
   *  del HECHO que abre el paso, no la del dia en que la app se entero:
   *  - A y C' (pedir la viabilidad): el alta;
   *  - B: el dia en que se agendo la visita; C: el dia de la visita;
   *  - D y E-L (sin hoja enviada): el Polycam o la solicitud, lo primero
   *    ("un mes desde el escaneo"); corregir o pedir el ok no reinicia el reloj.
   *    Si no hubo ni Polycam ni solicitud (no aplican), el alta;
   *  - M-N: el ultimo envio; Q-R-S: el dia de la junta (futura en Q: aun no cuenta);
   *  - T: la junta favorable; U-V: la firma; W-X: el cierre. */
  const entradaDe = (o: OppCruda, fa: Falta, d: Datos, estado: EstadoOpp, hojas: HojaCruda[]): string => {
    const f = fechasDe(o, hojas);
    const primero = [f.polycam, f.solicitud].filter((x): x is string => !!x).sort()[0] ?? null;
    switch (fa.clave) {
      case "cerrar_visita":
      case "pedir_viabilidad":
        return f.abierta;
      case "esperando_visita":
        return f.agendada ?? f.abierta;
      case "enviar_polycam":
        return d.cita ? aDia(d.cita.inicio) : f.abierta;
    }
    switch (fa.paso) {
      case "escaneo": return f.abierta;
      case "sin_hoja": return primero ?? f.abierta;
      case "hoja_enviada": return f.enviada ?? f.abierta;
      case "junta": return f.ultJunta ?? f.abierta;
      case "firma": return f.juntaSi ?? f.ultJunta ?? f.abierta;
      case "cobro": return estado.fechaGanada ?? f.abierta;
      case "completado": return fa.clave === "primera_parte_cobrada" ? (estado.fechaGanada ?? f.abierta) : (estado.fechaCierre ? aDia(estado.fechaCierre) : (estado.fechaGanada ?? f.abierta));
      default: return estado.fechaCierre ? aDia(estado.fechaCierre) : f.abierta;
    }
  };
  return { datosDe, fechasDe, entradaDe, ultima, contacto, polyFecha, juntasDe, adminDe, comDe, enCasaDe };
}

/** EL PASO DE MUCHAS OPPS DE GOLPE, en cualquier estado (ganadas y cerradas
 *  tambien): para estado_oportunidad, una fila por opp. */
export async function faltaDeMuchas(ids: string[]): Promise<Map<string, Falta>> {
  const ops = await porTramos<OppCruda>(ids, (t) => `oportunidades?select=${SEL}&id=in.(${t})`);
  const out = new Map<string, Falta>();
  if (!ops.length) return out;
  const { datosDe } = await cargar(ops);
  for (const o of ops) out.set(o.id, falta(datosDe(o).d));
  return out;
}

/** LA FECHA DE ENTRADA EN EL PASO ACTUAL de muchas opps (YYYY-MM-DD), por
 *  lotes: la que guarda estado_oportunidad.desde. Una sola fecha para todo. */
export async function fechaEntradaDeMuchas(ids: string[]): Promise<Map<string, string>> {
  const ops = await porTramos<OppCruda>(ids, (t) => `oportunidades?select=${SEL}&id=in.(${t})`);
  const out = new Map<string, string>();
  if (!ops.length) return out;
  const { datosDe, entradaDe } = await cargar(ops);
  for (const o of ops) {
    const { d, estado, hojas } = datosDe(o);
    out.set(o.id, entradaDe(o, falta(d), d, estado, hojas));
  }
  return out;
}

/** El paso de UNA opp: el mismo calculo que el de muchas, para que nunca
 *  difieran. */
export async function faltaDeOpp(oppId: string): Promise<Falta | null> {
  return (await faltaDeMuchas([oppId])).get(oppId) ?? null;
}

/** LAS ALERTAS de un comercial (o de todos: null). Rapido (Monica, 15-oct-2026:
 *  "10 segundos es inviable"): PRIMERO se filtra con estado_oportunidad -las
 *  que estan en una seccion con alerta y llevan en su paso mas que el plazo mas
 *  corto de esa seccion- y solo de esas se carga lo demas. */
export async function resumenComercial(comercialId: string | null): Promise<{ filas: FilaResumen[] }> {
  const corte = (n: number) => new Date(Date.parse(hoyISO()) - n * 86_400_000).toISOString().slice(0, 10);
  const MINIMO: Record<Seccion, number> = {
    escaneo: Math.min(PLAZOS.sinFechaEscaneo, PLAZOS.visitaSinPolycam),
    sin_hoja: Math.min(PLAZOS.polycamSinViabilidad, PLAZOS.sinHojaEnviada),
    hoja_enviada: PLAZOS.hojaSinNoticias,
    junta: 0, // "votaron que no" no tiene plazo; la junta futura se descarta abajo
    firma: PLAZOS.aprobadaSinHoja,
    cobro: PLAZOS.firmadaSinCobro,
  };
  const o_r = (Object.keys(MINIMO) as Seccion[]).map((k) => `and(seccion.eq.${k},desde.lt.${corte(MINIMO[k])})`).join(",");
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  // Una sola consulta: las opps y su estado guardado, ya filtradas.
  const ops = await leer<OppCruda & { est: { desde: string } }>(
    `oportunidades?select=${SEL},est:estado_oportunidad!inner(desde)&estado=eq.abierta${f}&est.or=(${o_r})&order=id`,
  );
  if (!ops.length) return { filas: [] };
  const desdeDe = new Map(ops.map((o) => [o.id, aDia(o.est.desde)]));

  const { datosDe, fechasDe, entradaDe, contacto, adminDe, comDe, enCasaDe } = await cargar(ops);

  const filas: FilaResumen[] = [];
  for (const o of ops) {
    const { d, estado, hojas } = datosDe(o);
    const fa = falta(d);
    if (fa.paso === "completado" || fa.paso === "cerrada" || !fa.paso) continue;

    // LO QUE PASA, corto y con su fecha.
    const { abierta, enviada, juntaSi, ultJunta, polycam } = fechasDe(o, hojas);
    const c0 = contacto.get(o.id) ?? null;
    const el = (iso: string | null | undefined) => (iso ? ` el ${ddmmaa(iso)}` : "");
    // LA FECHA: la de estado_oportunidad, una sola para todo.
    const desde = desdeDe.get(o.id) ?? entradaDe(o, fa, d, estado, hojas);

    // EL PLAZO DE SU FASE y COMO SE DESBLOQUEA: de la CLAVE (lib/pasosEscalera.ts), nunca del texto.
    let plazo = PLAZOS.sinHojaEnviada, accion: Accion = pasoDe(fa.clave).accion ?? "doc", enCasa: string | null = null, pasa = fa.texto;
    if (fa.paso === "escaneo") {
      if (fa.clave === "esperando_visita") { plazo = Infinity; pasa = fa.texto; } // B: esperando el dia, no hay nada que mover
      else if (fa.clave === "enviar_polycam") { plazo = PLAZOS.visitaSinPolycam; pasa = `Visita${el(d.cita ? aDia(d.cita.inicio) : null)}, falta el Polycam`; }
      else if (fa.clave === "pedir_viabilidad") { plazo = PLAZOS.sinFechaEscaneo; pasa = `Abierta${el(abierta)}, sin Polycam: falta pedir la viabilidad al arquitecto`; }
      else { plazo = PLAZOS.sinFechaEscaneo; pasa = `Abierta${el(abierta)}, sin fecha para escanear`; }
    } else if (fa.paso === "sin_hoja") {
      if (fa.clave === "arquitecto_viabilidad") { plazo = PLAZOS.polycamSinViabilidad; enCasa = enCasaDe("viabilidades", "Viabilidades"); pasa = d.polycam ? `Polycam${el(polycam)}, falta la viabilidad` : `Viabilidad pedida${el(fechasDe(o, hojas).solicitud)} sin Polycam, falta que la haga`; }
      else if (fa.clave === "falta_ok_oferta" || fa.clave === "nueva_oferta_ok") enCasa = enCasaDe("revision_ofertas", "Revisión de ofertas");
      else pasa = fa.texto + (fa.extra ? ` · ${fa.extra}` : "");
    } else if (fa.paso === "hoja_enviada") {
      plazo = PLAZOS.hojaSinNoticias;
      pasa = fa.clave === "nueva_oferta_decision" ? `Nueva oferta enviada${el(enviada)}, sin respuesta` : `Hoja enviada${el(enviada)}, sin fecha de junta`;
      // Tres meses sin saber nada: ya no es llamar, es cerrarla.
      const ultimaNoticia = [enviada, c0].filter(Boolean).sort().at(-1) ?? abierta;
      if (dias(ultimaNoticia) > PLAZOS.darPorPerdida) { accion = "perdida"; pasa += `; nada desde${el(ultimaNoticia)}`; }
    } else if (fa.paso === "junta") {
      plazo = PLAZOS.juntaSinResultado;
      if (fa.clave === "junta_no") { plazo = 0; pasa = `La junta votó que no${el(ultJunta)}`; }
      else if ((ultJunta ?? "") > hoyISO()) pasa = `Junta${el(ultJunta)}`;
      else pasa = `Junta${el(ultJunta)}, no sabemos qué votaron`;
    } else if (fa.paso === "firma") {
      plazo = PLAZOS.aprobadaSinHoja;
      pasa = `Votaron sí${el(juntaSi)}, falta la hoja firmada`;
    } else if (fa.paso === "cobro") {
      plazo = PLAZOS.firmadaSinCobro; enCasa = enCasaDe("facturacion", "Facturación");
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
    else if (o.contacto_provisional) llamar.push({ quien: o.contacto_provisional, papel: "contacto", telefono: o.telefono_provisional });
    if (!llamar.length && o.trajo) llamar.push({ quien: [o.trajo.nombre, o.trajo.apellidos].filter(Boolean).join(" "), papel: "la trajo", telefono: o.trajo.telefono_personal });

    // EL NOMBRE, SIEMPRE CON MUNICIPIO (Monica, 14-oct-2026: "no pones el municipio casi nunca").
    let nombre = nombreDeOpp(o);
    const muni = o.portales.map((p) => p.acceso?.municipio).find(Boolean);
    if (muni && !limpio(nombre).includes(limpio(muni))) nombre = `${nombre}, ${muni.charAt(0) + muni.slice(1).toLowerCase()}`;

    filas.push({
      id: o.id, codigo: o.codigo, nombre, seccion: fa.paso as Seccion, pasa, llamar,
      admin: llamar.find((l) => l.papel === "administración") ?? null, enCasa,
      ultima: c0, contacto: c0, accion, alerta, diasFase, plazo,
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
