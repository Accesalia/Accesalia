// lib/cabeceraOpp.ts
//
// LA CABECERA COMUN DE LA PAGINA DE BLOQUES (Monica, 14-oct-2026, sobre su
// maqueta "CABECERA COMUN PAGINA BLOQUES"). Lo que la cabecera CALCULA; la
// pantalla solo lo pinta. Tres cosas:
//
//   - EL ESTADO, en dos ejes: ganada / perdida, y abierta / cerrada.
//       abierta  = no hay hoja firmada y no se marco cerrada
//       ganada   = hay hoja firmada (cobrada o no); sigue ABIERTA hasta que
//                  facturacion da el total por cobrado (sin los % a exito)
//       perdida  = se cierra a mano, con su motivo; perdida siempre es cerrada
//     Con hoja firmada y dinero pendiente no se puede ni cerrar ni pausar.
//
//   - LO QUE QUIEREN, detras del nombre: "Mayor 25 Madrid SATE + SUBV" le da al
//     comercial muchisima informacion, y el dato es gratis. SOLO LO QUE SE
//     COBRA: lo que por defecto va "se cobra" en el catalogo de bloques, y las
//     obras (que siempre llevan su proyecto). Fuera 3 presupuestos,
//     financiacion, la DF... En las ganadas, lo que se firmo.
//
//   - DE QUE ESTAMOS PENDIENTES: el paso que bloquea, en la fase en que esta.
//     Lo escribe la APP, nunca el comercial, y SOLO UNO: el que corresponde.
//     Sale de los datos que ya hay, del mas avanzado hacia atras: un dato de
//     una fase posterior manda sobre lo que falte antes.
//
// Y las OTRAS OPPS DE LA MISMA DIRECCION (clave DIR): la direccion no se ve en
// la cabecera, solo sirve para esto.

import "server-only";
import { bonito } from "./direccionNombre";
import { nombreDeOpp } from "./direccionOpp";
import { pasoDe, type Clave, type Paso } from "./pasosEscalera";
import { BLOQUE_DE, OBRAS, SUBVENCION } from "./hojaBase";
import { COLUMNAS_INTERES } from "./columnasInteres";
import { aHoraMadrid } from "./citas";
import { cobrosDeVersiones, estaFirmada, hojasCrudasDe, type HojaCruda } from "./hojasOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);
/** 2026-03-14 -> 14/03/2026 */
const fecha = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// ------------------------------------------------------------ lo que quieren

/** Como se escribe cada interes en poco sitio. Lo que no esta, en mayusculas. */
const CORTO: Record<string, string> = {
  Ascensor: "ASC",
  Subvenciones: "SUBV",
  "Doc técnica subv (IEE+CEE+LEE)": "DOC. SUBV",
  "SATE envolvente completa": "SATE",
  "Memoria técnica valorada": "MEMORIA",
  "Consulta urbanística": "CONSULTA URB.",
  "Otros - proyecto técnico": "PROYECTO",
  "Sustitución de ascensor": "SUST. ASC",
};
const corto = (nombre: string) => CORTO[nombre] ?? nombre.toUpperCase();

/** El catalogo de bloques: que se cobra por defecto. */
async function desgloses(): Promise<Map<string, string>> {
  const filas = await leer<{ codigo: string; desglose: string }[]>("bloques?select=codigo,desglose");
  return new Map(filas.map((f) => [f.codigo, f.desglose]));
}

/** "ASC Y COTA CERO + SUBV": las obras unidas con "y", y lo demas con "+". */
// En el orden del alta: Ascensor antes que Cota cero, las obras antes que la subvencion.
const ORDEN = COLUMNAS_INTERES.flatMap((c) => c.nombres);
const enOrden = (xs: string[]) => [...new Set(xs)].sort((a, b) => (ORDEN.indexOf(a) + 1 || 99) - (ORDEN.indexOf(b) + 1 || 99));

function enUnaLinea(obras: string[], resto: string[]): string | null {
  const o = [...new Set(enOrden(obras).map(corto))];
  const r = [...new Set(enOrden(resto).map(corto))];
  const linea = [o.join(" Y "), ...r].filter(Boolean).join(" + ");
  return linea || null;
}

/** De los intereses marcados, solo lo que SE COBRA por defecto. */
function cobrables(nombres: string[], desglose: Map<string, string>): string | null {
  const obras = nombres.filter((n) => OBRAS.has(n));
  const resto = nombres.filter((n) => {
    if (OBRAS.has(n)) return false;
    const codigo = SUBVENCION[n] ?? BLOQUE_DE[n];
    return codigo ? desglose.get(codigo) === "se_cobra" : false;
  });
  return enUnaLinea(obras, resto);
}

/** Lo que se FIRMO: lo que se cobra en las hojas firmadas (sus versiones, he_lineas_compromisos). Los tipos de los
 *  proyectos son las obras; los bloques cobrados, lo demas. */
async function loFirmado(versionIds: string[]): Promise<string | null> {
  if (!versionIds.length) return null;
  const filas = await leer<{ se_cobra: boolean; tipo: { nombre: string } | null; bloque: { codigo: string } | null }[]>(
    `he_lineas_compromisos?select=se_cobra,tipo:desglose_id(nombre),bloque:bloque_id(codigo)&version_id=in.(${versionIds.join(",")})`,
  );
  const deCodigo = new Map<string, string>();
  for (const [n, c] of [...Object.entries(BLOQUE_DE), ...Object.entries(SUBVENCION)]) deCodigo.set(c, n);
  const seCobra = (f: (typeof filas)[number]) => f.se_cobra;
  // La obra es el tipo de un PROYECTO (el de una subvencion dice de que es la ayuda, no la obra).
  const obras = filas.filter((f) => f.bloque?.codigo === "REDACCION PROYECTO" && f.tipo && OBRAS.has(f.tipo.nombre)).map((f) => f.tipo!.nombre);
  const resto = filas
    .filter(seCobra)
    .map((f) => (f.bloque ? deCodigo.get(f.bloque.codigo) : null))
    .filter((n): n is string => !!n && !OBRAS.has(n));
  return enUnaLinea(obras, resto);
}

// ------------------------------------------------------------------ el estado

// LA HOJA CRUDA (25-oct-2026, sistema nuevo): una por version, del lector unico (lib/hojasOpp.ts): su fase y la primera
// vez que paso por cada momento. El ok y los cambios de Daniel son POR HOJA: ya no hay paquete de la opp.
export type { HojaCruda } from "./hojasOpp";

export type EstadoOpp = {
  /** Anulada por duplicada (16-oct-2026): no cuenta como nada, ni perdida. */
  anulada: boolean;
  ganada: boolean;
  cerrada: boolean;
  perdida: boolean;
  pausada: boolean;
  /** Firmada y con dinero pendiente: no se puede cerrar ni pausar. */
  porCobrar: boolean;
  /** Todo cobrado (sin los % a exito). */
  cobrada: boolean;
  /** Algo cobrado ya: la primera parte. */
  primerCobro: boolean;
  fechaGanada: string | null;
  fechaCierre: string | null;
  motivoCierre: string | null;
};

const cobrosDe = cobrosDeVersiones;

export type CierreCrudo = { fecha_cierre: string | null; resultado_final: string | null; motivo_perdido: string | null; creado_en: string };

async function estadoDe(op: { estado: string; cierres: CierreCrudo[] }, hojas: HojaCruda[]): Promise<EstadoOpp> {
  const firmadas = hojas.filter(estaFirmada);
  return estadoCon(op, hojas, await cobrosDe(firmadas.map((h) => h.id)));
}

/** El estado con los cobros ya leidos (para calcular muchas opps de golpe). */
export function estadoCon(
  op: { estado: string; cierres: CierreCrudo[] },
  hojas: HojaCruda[],
  c: { alguno: boolean; todos: boolean },
): EstadoOpp {
  const firmadas = hojas.filter(estaFirmada);
  const ganada = firmadas.length > 0;
  const cierre = [...op.cierres].sort((a, b) => b.creado_en.localeCompare(a.creado_en))[0];
  const anulada = op.estado === "anulada";
  // Una anulada se trata como cerrada (sin pasos, sin pausar ni cerrar) pero
  // NO es perdida: un duplicado no es una venta perdida.
  const cerrada = op.estado === "cerrada" || anulada;
  return {
    anulada,
    ganada,
    cerrada,
    perdida: cerrada && !ganada && !anulada,
    pausada: op.estado === "pausada",
    porCobrar: ganada && !c.todos,
    cobrada: c.todos,
    primerCobro: c.alguno,
    fechaGanada: firmadas.map((h) => h.firmada?.slice(0, 10)).filter((x): x is string => !!x).sort()[0] ?? null,
    fechaCierre: cerrada ? (cierre?.fecha_cierre ?? cierre?.creado_en ?? null) : null,
    motivoCierre: cerrada ? (cierre?.motivo_perdido ?? null) : null,
  };
}

// ------------------------------------------------- de que estamos pendientes

/** LA SECCION del "Resumen de como estan las cosas" (Monica, 14-oct-2026): el
 *  paso que bloquea, agrupado en lo que el comercial tiene que hacer. */
export type { Paso } from "./pasosEscalera";
/** El paso que bloquea: su CLAVE fija (lib/pasosEscalera.ts) y su copy. */
export type Falta = { clave: Clave; texto: string; extra: string | null; paso?: Paso };

export type Datos = {
  estado: EstadoOpp;
  hojas: HojaCruda[];
  juntas: { fecha_junta: string | null; celebrada: boolean; resultado: string | null; creado_en: string }[];
  tresd: { tipo_3d: string | null; estado: string | null } | null;
  cita: { inicio: string } | null;
  /** El Polycam ha llegado (buzon o mesa de viabilidades): polycamDe. */
  polycam: boolean;
  /** El arquitecto termino la viabilidad: la envio desde la mesa (enviada_en),
   *  o el comercial ya la remato (url_pdf). */
  arquitecto: boolean;
  /** LO QUE NECESITA (lib/necesidadesOpp.ts, 15-oct-2026): sin Polycam se saltan
   *  A-B-C; sin viabilidad, D. Automatico segun lo que quieren, o a mano. */
  necesita: { polycam: boolean; viabilidad: boolean; tresd: boolean };
  /** Se pidio la viabilidad al arquitecto sin Polycam (solicitudes_viabilidad):
   *  hace de Polycam. El dia en que se pidio. */
  solicitud: string | null;
  /** Alguna FACTURA de la opp (facturas.oportunidad_id) tiene justificante de cobro (Monica, 26-oct-2026: «todo lo que
   *  tenemos con factura o cobro deberia desaparecer»): las opps antiguas cuya hoja no esta en la app, pero su factura si. */
  facturaCobrada?: boolean;
};

/** Lo que dijo la junta que obliga a MODIFICAR LA OFERTA (Monica, 14-oct-2026:
 *  "si piden mas presupuestos, retrasan, etc., es decision modificar oferta"). */
const MODIFICAR = new Set(["piden_mas_presupuestos", "aplazada", "complicacion"]);

/** EL PASO QUE BLOQUEA. Del dato mas avanzado hacia atras: el primero que se
 *  cumple decide el texto. Los textos son de Monica (14-oct-2026).
 *
 *  OJO: es la escalera de LO QUE NOS BLOQUEA, no la de fases comerciales: lee
 *  sus propios datos, nunca fases_oportunidad. */
/** El paso y su seccion. La seccion sale de la CLAVE (lib/pasosEscalera.ts),
 *  nunca del texto: el 15-oct una expresion /cobro/ metio en alertas las que ya
 *  tenian la primera parte cobrada. */
export function falta(d: Datos): Falta {
  const f = faltaTexto(d);
  return { ...f, paso: pasoDe(f.clave).seccion };
}

function faltaTexto(d: Datos): Falta {
  const e = d.estado;
  // EL OK DE DANIEL ES POR HOJA (25-oct-2026): generada = paso por «pendiente del ok»; los cambios de Daniel y el ok,
  // los de la fase en que esta cada version.
  const generada = d.hojas.some((h) => h.generada);
  const enviada = d.hojas.some((h) => h.enviada);
  const conCambiosDaniel = (desde: string | null) =>
    d.hojas.filter((h) => h.cambiosDaniel && (!desde || (h.generada ?? "").slice(0, 10) >= desde)).sort((a, b) => b.cambiosDaniel!.fecha.localeCompare(a.cambiosDaniel!.fecha))[0] ?? null;
  const conOk = (desde: string | null) => d.hojas.some((h) => h.fase === "ok_daniel" && (!desde || (h.okDaniel ?? "").slice(0, 10) >= desde));
  // La revision pidio cambios: con lo que dijo quien reviso.
  const cambiosRevision = (enBucle: boolean, h: (typeof d.hojas)[number]): Falta => ({
    clave: enBucle ? "nueva_oferta_cambios" : "revision_cambios",
    texto: "La revisión pidió cambios: corregir la oferta antes de enviarla",
    extra: h.cambiosDaniel?.nota ? `${h.cambiosDaniel.quien ? h.cambiosDaniel.quien + ": " : ""}${h.cambiosDaniel.nota}` : null,
  });

  if (e.perdida) return { clave: "perdida", texto: "Perdida" + (e.motivoCierre ? `: ${e.motivoCierre}` : ""), extra: null };
  // COBRADA POR SU FACTURA aunque su hoja no este en la app: la escalera va de atras adelante, y un cobro manda sobre todo.
  if (!e.ganada && d.facturaCobrada)
    return { clave: "primera_parte_cobrada", texto: "Cobrada: tiene factura con justificante", extra: "Su hoja no está en la app" };
  if (e.ganada) {
    if (e.cobrada) return { clave: "completado", texto: "Todo completado", extra: null };
    if (e.primerCobro || d.facturaCobrada) return { clave: "primera_parte_cobrada", texto: "Primera parte cobrada: falta el resto", extra: "Ya es de facturación" };
    return { clave: "falta_ok_cobro_primera", texto: "Pendiente de que nos den el ok al cobro de la primera parte", extra: null };
  }

  // La junta: la ultima que se apunto.
  const junta =
    [...d.juntas].sort((a, b) => (a.fecha_junta ?? a.creado_en).localeCompare(b.fecha_junta ?? b.creado_en)).at(-1) ?? null;
  if (junta?.resultado === "favorable") return { clave: "junta_si_falta_firmada", texto: "La junta votó sí: pendiente de que nos envíen la hoja firmada", extra: null };
  if (junta?.resultado === "desfavorable") return { clave: "junta_no", texto: "La junta votó que no: cerrarla como perdida", extra: null };

  // EL BUCLE DE MODIFICAR LA OFERTA: lo pide la junta, o la comunidad o el comercial pidieron cambios en una hoja (y
  // nace su version siguiente). Desde ese momento, lo que se mueve es la NUEVA oferta.
  const hojaCambios = d.hojas.filter((h) => h.cambiosPedidos).sort((a, b) => b.cambiosPedidos!.localeCompare(a.cambiosPedidos!))[0] ?? null;
  const desde =
    junta && junta.resultado && MODIFICAR.has(junta.resultado)
      ? (junta.fecha_junta ?? junta.creado_en.slice(0, 10))
      : hojaCambios
        ? hojaCambios.cambiosPedidos!.slice(0, 10)
        : null;
  if (desde !== null) {
    const despues = (f: string | null | undefined) => !!f && f.slice(0, 10) >= desde;
    const nuevaGenerada = d.hojas.some((h) => despues(h.generada));
    if (!nuevaGenerada) return { clave: "nueva_oferta_elaborar", texto: "Pidieron modificar la oferta: pendiente de elaborar la nueva oferta", extra: null };
    if (d.hojas.some((h) => despues(h.enviada)))
      return { clave: "nueva_oferta_decision", texto: "Pendientes de la decisión sobre la nueva oferta", extra: null };
    const cambios = conCambiosDaniel(desde);
    if (cambios) return cambiosRevision(true, cambios);
    if (conOk(desde)) return { clave: "nueva_oferta_enviar", texto: "Falta enviar la nueva oferta a la comunidad", extra: null };
    return { clave: "nueva_oferta_ok", texto: "Falta el ok a la nueva oferta", extra: null };
  }

  if (junta) {
    if (junta.fecha_junta && junta.fecha_junta >= hoyISO() && !junta.celebrada) {
      // La segunda linea, el 3D: solo si necesita 3D para la junta o ya hay uno
      // pedido (Monica, 15-oct-2026: casilla expresa "¿Necesita 3D?").
      const a_medida = d.tresd && d.tresd.tipo_3d !== "generico_escalera";
      const extra = a_medida
        ? d.tresd!.estado === "listo" || d.tresd!.estado === "entregado" ? "3D específico listo" : "Falta el 3D específico"
        : d.necesita.tresd && !d.tresd ? "Falta el 3D específico" : null;
      return { clave: "junta_por_celebrar", texto: `Falta que se celebre la junta (el ${ddmm(junta.fecha_junta)})`, extra };
    }
    if (junta.fecha_junta || junta.celebrada) return { clave: "junta_que_votaron", texto: "Pendientes de que confirmen qué votaron", extra: null };
  }

  if (enviada) return { clave: "falta_fecha_junta", texto: "Falta que confirmen la fecha de la junta", extra: null };
  const cambios = conCambiosDaniel(null);
  if (cambios) return cambiosRevision(false, cambios);
  if (conOk(null)) return { clave: "falta_enviar_doc", texto: "Falta enviar la doc a la comunidad", extra: null };
  if (generada) return { clave: "falta_ok_oferta", texto: "Falta el ok a la oferta", extra: null };
  // D -> E: Alex la dio por hecha.
  if (d.arquitecto) return { clave: "preparar_docs", texto: "Preparar la HE, la VB y el presupuesto", extra: null };
  // A, B, C: solo si necesita Polycam y aun no hay ni Polycam ni solicitud. Si
  // el Polycam llega sin visita agendada, salta de A a D.
  if (d.necesita.polycam && !d.polycam && !d.solicitud) {
    if (d.cita) {
      const [dia, hora] = aHoraMadrid(d.cita.inicio).split("T");
      if (dia >= hoyISO()) return { clave: "esperando_visita", texto: `Visita el ${fecha(dia)} a las ${hora}: esperando el día`, extra: null };
      return { clave: "enviar_polycam", texto: "Enviar el Polycam para la viabilidad", extra: `Visita el ${fecha(dia)} a las ${hora}` };
    }
    return { clave: "cerrar_visita", texto: "Cerrar la visita para el escaneo con Polycam", extra: null };
  }
  // Sin viabilidad, la fase 4 no aplica: directa a E.
  if (!d.necesita.viabilidad) return { clave: "preparar_docs", texto: "Preparar la HE, la VB y el presupuesto", extra: null };
  // D: con el Polycam o con la solicitud, le toca al arquitecto.
  if (d.polycam || d.solicitud) return { clave: "arquitecto_viabilidad", texto: "Que el arquitecto defina la viabilidad", extra: d.polycam ? null : "Pedida sin Polycam" };
  // C': no necesita Polycam y aun no se le ha pedido.
  return { clave: "pedir_viabilidad", texto: "Pedir la viabilidad y los costes al arquitecto", extra: null };
}

// ------------------------------------------------------------------ juntarlo

const SEL_OPP =
  "id,nombre,codigo,estado,creado_en,fecha_apertura," +
  "cierres:motivo_cierre_oportunidad(fecha_cierre,resultado_final,motivo_perdido,creado_en)," +
  "tipos:oportunidad_tipos(tipo:tipo_id(nombre))";

type OppCruda = {
  id: string;
  nombre: string | null;
  codigo: string | null;
  estado: string;
  creado_en: string;
  fecha_apertura: string | null;
  cierres: { fecha_cierre: string | null; resultado_final: string | null; motivo_perdido: string | null; creado_en: string }[];
  tipos: { tipo: { nombre: string } | null }[];
};

/** EL PASO, YA GUARDADO (Monica, 15-oct-2026: "una sola verdad"): la tabla
 *  estado_oportunidad, que mantiene lib/estadoOportunidad.ts. Una consulta para
 *  todas las que se pidan; nadie vuelve a calcular la escalera aqui. */
async function pasosGuardados(ids: string[]): Promise<Map<string, Falta>> {
  if (!ids.length) return new Map();
  const filas = await leer<{ oportunidad_id: string; clave: Clave; texto: string; extra: string | null }[]>(
    `estado_oportunidad?select=oportunidad_id,clave,texto,extra&oportunidad_id=in.(${ids.join(",")})`,
  ).catch(() => []);
  return new Map(filas.map((f) => [f.oportunidad_id, { clave: f.clave, texto: f.texto, extra: f.extra, paso: pasoDe(f.clave).seccion }]));
}
const SIN_CALCULAR: Falta = { clave: "cerrar_visita", texto: "Sin calcular todavía", extra: null };

/** Su estado y lo que quieren. El paso lo pone quien llama, de la tabla. */
async function leerUna(op: OppCruda, hojas: HojaCruda[], desglose: Map<string, string>) {
  const estado = await estadoDe(op, hojas);
  const intereses = op.tipos.map((t) => t.tipo?.nombre).filter((n): n is string => !!n);
  const firmadas = hojas.filter(estaFirmada).map((h) => h.id);
  // Ganada: lo que se firmo. Si la hoja no lo dice (las importadas), lo que querian.
  const quieren = (estado.ganada ? await loFirmado(firmadas).catch(() => null) : null) ?? cobrables(intereses, desglose);
  return { estado, quieren };
}

export type OtraOpp = {
  id: string;
  /** Sus accesos: "General Ricardos 238 esc 1". Mejor que su nombre, si son distintos. */
  accesos: string;
  quieren: string | null;
  estado: "abierta" | "ganada" | "perdida" | "cerrada";
  /** El otro eje: una ganada sigue abierta hasta que se cobra todo. */
  cerrada: boolean;
  /** "pendiente firma" en las abiertas; la fecha en las ganadas y perdidas. */
  resultado: string;
};

const textoAcceso = (a: { nombre_via: string | null; numero: string | null; escalera: string | null }) =>
  [a.nombre_via ? bonito(a.nombre_via) : null, a.numero?.replace(/^0+(?=\d)/, ""), a.escalera ? `esc ${a.escalera}` : null]
    .filter(Boolean)
    .join(" ");

/** Las otras opps de la misma direccion (las mismas claves DIR). */
async function otrasEnLaDireccion(oppId: string, desglose: Map<string, string>): Promise<OtraOpp[]> {
  const mias = await leer<{ acceso: { clave_id: string | null } | null }[]>(
    `relacion_oportunidad_accesos?select=acceso:acceso_id(clave_id)&opp_id=eq.${oppId}&hasta=is.null`,
  );
  const claves = [...new Set(mias.map((m) => m.acceso?.clave_id).filter((c): c is string => !!c))];
  if (!claves.length) return [];
  const accesos = await leer<{ id: string; nombre_via: string | null; numero: string | null; escalera: string | null }[]>(
    `accesos?select=id,nombre_via,numero,escalera&clave_id=in.(${claves.join(",")})`,
  );
  if (!accesos.length) return [];
  const rel = await leer<{ opp_id: string; acceso_id: string }[]>(
    `relacion_oportunidad_accesos?select=opp_id,acceso_id&acceso_id=in.(${accesos.map((a) => a.id).join(",")})&hasta=is.null&opp_id=neq.${oppId}`,
  );
  const ids = [...new Set(rel.map((r) => r.opp_id))].slice(0, 20);
  if (!ids.length) return [];
  const opps = await leer<OppCruda[]>(`oportunidades?select=${SEL_OPP}&id=in.(${ids.join(",")})&estado=neq.anulada`);
  const porId = new Map(accesos.map((a) => [a.id, a]));
  const [pasos, hojasDe] = await Promise.all([pasosGuardados(opps.map((o) => o.id)), hojasCrudasDe(opps.map((o) => o.id))]);

  const filas = await Promise.all(
    opps.map(async (o) => {
      const x = await leerUna(o, hojasDe.get(o.id) ?? [], desglose);
      const suyos = rel.filter((r) => r.opp_id === o.id).map((r) => porId.get(r.acceso_id)).filter((a): a is NonNullable<typeof a> => !!a);
      const estado: OtraOpp["estado"] = x.estado.ganada ? "ganada" : x.estado.perdida ? "perdida" : x.estado.cerrada ? "cerrada" : "abierta";
      const cuando = x.estado.ganada ? x.estado.fechaGanada : x.estado.fechaCierre;
      return {
        id: o.id,
        accesos: [...new Set(suyos.map(textoAcceso))].join(", ") || nombreDeOpp(o),
        quieren: x.quieren,
        estado,
        cerrada: x.estado.cerrada,
        resultado:
          estado === "abierta"
            ? (pasos.get(o.id) ?? SIN_CALCULAR).texto.toLowerCase()
            : [estado === "ganada" ? "Ganada" : estado === "perdida" ? "Perdida" : "Cerrada", cuando ? fecha(cuando) : null].filter(Boolean).join(" "),
        orden: (estado === "abierta" ? "1" : "0") + (cuando ?? o.fecha_apertura ?? o.creado_en),
      };
    }),
  );
  // Las abiertas arriba; luego, lo mas reciente primero.
  return filas.sort((a, b) => b.orden.localeCompare(a.orden)).map(({ orden: _, ...f }) => f);
}

export type DatosCabecera = {
  estado: EstadoOpp;
  quieren: string | null;
  falta: Falta;
  otras: OtraOpp[];
};

export async function cabeceraDe(oppId: string): Promise<DatosCabecera | null> {
  const [[op], desglose, hojasDe] = await Promise.all([leer<OppCruda[]>(`oportunidades?select=${SEL_OPP}&id=eq.${oppId}`), desgloses(), hojasCrudasDe([oppId])]);
  if (!op) return null;
  const [una, pasos, otras] = await Promise.all([leerUna(op, hojasDe.get(oppId) ?? [], desglose), pasosGuardados([oppId]), otrasEnLaDireccion(oppId, desglose).catch(() => [])]);
  return { ...una, falta: pasos.get(oppId) ?? SIN_CALCULAR, otras };
}

/** ¿Se puede cerrar o pausar? No, si esta firmada y queda dinero por cobrar. */
export async function quedaPorCobrar(oppId: string): Promise<boolean> {
  const firmadas = ((await hojasCrudasDe([oppId])).get(oppId) ?? []).filter(estaFirmada);
  if (!firmadas.length) return false;
  return !(await cobrosDe(firmadas.map((h) => h.id))).todos;
}
