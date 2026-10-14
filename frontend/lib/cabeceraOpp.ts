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
import { BLOQUE_DE, OBRAS, SUBVENCION } from "./hojaBase";
import { COLUMNAS_INTERES } from "./columnasInteres";
import { aHoraMadrid, polycamDe } from "./citas";

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

/** Lo que se FIRMO: lo que se cobra en las hojas firmadas. Las actuaciones
 *  (tipo_proyecto_id) son las obras; los bloques cobrados, lo demas. */
async function loFirmado(hojaIds: string[]): Promise<string | null> {
  if (!hojaIds.length) return null;
  const filas = await leer<
    { importe: number | null; incluido: boolean; desglose: string | null; tipo: { nombre: string } | null; bloque: { codigo: string } | null }[]
  >(
    `conceptos_hoja?select=importe,incluido,desglose,tipo:tipo_proyecto_id(nombre),bloque:bloque_id(codigo)` +
      `&hoja_encargo_id=in.(${hojaIds.join(",")})`,
  );
  const deCodigo = new Map<string, string>();
  for (const [n, c] of [...Object.entries(BLOQUE_DE), ...Object.entries(SUBVENCION)]) deCodigo.set(c, n);
  const seCobra = (f: (typeof filas)[number]) => !f.incluido && (f.desglose === "se_cobra" || (f.importe ?? 0) > 0);
  const obras = filas.filter((f) => f.tipo && OBRAS.has(f.tipo.nombre)).map((f) => f.tipo!.nombre);
  const resto = filas
    .filter(seCobra)
    .map((f) => (f.bloque ? deCodigo.get(f.bloque.codigo) : null))
    .filter((n): n is string => !!n && !OBRAS.has(n));
  return enUnaLinea(obras, resto);
}

// ------------------------------------------------------------------ el estado

type HojaCruda = {
  id: string;
  estado: string;
  fecha_firma: string | null;
  versiones: { numero_version: number; url_pdf_hoja: string | null }[];
};

export type EstadoOpp = {
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

async function cobrosDe(hojaIds: string[]): Promise<{ hay: boolean; alguno: boolean; todos: boolean }> {
  if (!hojaIds.length) return { hay: false, alguno: false, todos: false };
  const lineas = await leer<{ es_porcentaje: boolean | null; hitos: { estado: string }[] }[]>(
    `lineas_facturacion?select=es_porcentaje,hitos:hitos_cobro(estado)&hoja_encargo_id=in.(${hojaIds.join(",")})&quitada_en=is.null`,
  );
  // Los % a exito no cuentan para dar el dinero por cobrado.
  const hitos = lineas.filter((l) => !l.es_porcentaje).flatMap((l) => l.hitos).filter((h) => h.estado !== "anulado");
  const cobrados = hitos.filter((h) => h.estado === "completado").length;
  return { hay: hitos.length > 0, alguno: cobrados > 0, todos: hitos.length > 0 && cobrados === hitos.length };
}

async function estadoDe(
  op: { estado: string; cierres: { fecha_cierre: string | null; resultado_final: string | null; motivo_perdido: string | null; creado_en: string }[] },
  hojas: HojaCruda[],
): Promise<EstadoOpp> {
  const firmadas = hojas.filter((h) => h.estado === "devuelta_firmada");
  const ganada = firmadas.length > 0;
  const c = await cobrosDe(firmadas.map((h) => h.id));
  const cierre = [...op.cierres].sort((a, b) => b.creado_en.localeCompare(a.creado_en))[0];
  const cerrada = op.estado === "cerrada";
  return {
    ganada,
    cerrada,
    perdida: cerrada && !ganada,
    pausada: op.estado === "pausada",
    porCobrar: ganada && !c.todos,
    cobrada: c.todos,
    primerCobro: c.alguno,
    fechaGanada: firmadas.map((h) => h.fecha_firma).filter((x): x is string => !!x).sort()[0] ?? null,
    fechaCierre: cerrada ? (cierre?.fecha_cierre ?? cierre?.creado_en ?? null) : null,
    motivoCierre: cerrada ? (cierre?.motivo_perdido ?? null) : null,
  };
}

// ------------------------------------------------- de que estamos pendientes

/** El orden de las hojas por lo avanzadas que estan. */
const RANGO: Record<string, number> = {
  borrador: 1,
  pendiente_firma_daniel: 2,
  firmada_daniel: 3,
  enviada_comunidad: 4,
  cambios_solicitados: 5,
  devuelta_firmada: 6,
};

export type Falta = { texto: string; extra: string | null };

type Datos = {
  estado: EstadoOpp;
  hojas: HojaCruda[];
  fases: { hito: string; estado: string }[];
  juntas: { fecha_junta: string | null; celebrada: boolean; resultado: string | null }[];
  tresd: { tipo_3d: string | null; estado: string | null } | null;
  cita: { inicio: string } | null;
  /** El Polycam ha llegado (buzon o mesa de viabilidades): polycamDe. */
  polycam: boolean;
  /** El arquitecto termino la viabilidad: la envio desde la mesa (enviada_en),
   *  o el comercial ya la remato (url_pdf). */
  arquitecto: boolean;
};

/** EL PASO QUE BLOQUEA. Del dato mas avanzado hacia atras: el primero que se
 *  cumple decide el texto. Los textos son de Monica (14-oct-2026). */
function falta(d: Datos): Falta {
  const e = d.estado;
  const hecho = (h: string) => d.fases.some((f) => f.hito === h && f.estado === "hecho");
  const generadas = d.hojas.filter((h) => h.versiones.some((v) => v.url_pdf_hoja) || RANGO[h.estado] >= 2);
  const hoja = [...generadas].sort((a, b) => (RANGO[b.estado] ?? 0) - (RANGO[a.estado] ?? 0))[0] ?? null;
  // Si ya hubo una version anterior, lo que se mueve es "la nueva oferta".
  const nueva = !!hoja && Math.max(...hoja.versiones.map((v) => v.numero_version), 1) > 1;
  const laDoc = nueva ? "la nueva oferta" : "la doc";

  if (e.perdida) return { texto: "Perdida" + (e.motivoCierre ? `: ${e.motivoCierre}` : ""), extra: null };
  if (e.ganada) {
    if (e.cobrada) return { texto: "Todo completado", extra: null };
    if (e.primerCobro) return { texto: "Cobro de la primera parte recibido: empezamos con el proyecto", extra: "Pendiente del cobro del resto del importe" };
    return { texto: "Pendiente de que nos den el ok al cobro de la primera parte", extra: null };
  }
  if (hoja?.estado === "cambios_solicitados") return { texto: "Pidieron modificar la oferta: pendiente de elaborar la nueva oferta", extra: null };

  // La junta: la ultima que se apunto.
  const junta = [...d.juntas].sort((a, b) => (a.fecha_junta ?? "").localeCompare(b.fecha_junta ?? "")).at(-1) ?? null;
  if (junta) {
    switch (junta.resultado) {
      case "favorable":
        return { texto: "La junta votó sí: pendiente de que nos envíen la hoja firmada", extra: null };
      case "desfavorable":
        return { texto: "La junta votó que no", extra: null };
      case "piden_mas_presupuestos":
        return { texto: "La junta pide más presupuestos", extra: null };
      case "aplazada":
        return { texto: "Junta aplazada: falta que confirmen la nueva fecha", extra: null };
      case "complicacion":
        return { texto: "Hubo una complicación en la junta", extra: null };
    }
    if (junta.fecha_junta && junta.fecha_junta >= hoyISO() && !junta.celebrada) {
      const a_medida = d.tresd && d.tresd.tipo_3d !== "generico_escalera";
      const extra = a_medida ? (d.tresd!.estado === "listo" || d.tresd!.estado === "entregado" ? "3D específico listo" : "Falta el 3D específico") : null;
      return { texto: `Falta que se celebre la junta (el ${ddmm(junta.fecha_junta)})`, extra };
    }
    if (junta.fecha_junta || junta.celebrada) return { texto: "Pendientes de que confirmen qué votaron", extra: null };
  }

  if (hoja?.estado === "enviada_comunidad")
    return { texto: nueva ? "Pendientes de la decisión sobre la nueva oferta" : "Falta que confirmen la fecha de la junta", extra: null };
  if (hoja?.estado === "firmada_daniel") return { texto: `Falta enviar ${laDoc} a la comunidad`, extra: null };
  if (hoja) return { texto: `Falta el ok de Daniel a los precios${nueva ? " de la nueva oferta" : ""}`, extra: null };
  if (d.arquitecto || hecho("viabilidad_arquitecto")) return { texto: "Preparar la HE, la VB y el presupuesto", extra: null };
  if (d.polycam || hecho("polycam")) return { texto: "Que el arquitecto defina la viabilidad", extra: null };
  if (d.cita) {
    const [dia, hora] = aHoraMadrid(d.cita.inicio).split("T");
    return { texto: "Enviar el Polycam para la viabilidad", extra: `Visita el ${fecha(dia)} a las ${hora}` };
  }
  return { texto: "Cerrar la visita para el escaneo con Polycam", extra: null };
}

// ------------------------------------------------------------------ juntarlo

const SEL_OPP =
  "id,nombre,codigo,estado,creado_en,fecha_apertura," +
  "cierres:motivo_cierre_oportunidad(fecha_cierre,resultado_final,motivo_perdido,creado_en)," +
  "hojas:hojas_encargo(id,estado,fecha_firma,versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(numero_version,url_pdf_hoja))," +
  "tipos:oportunidad_tipos(tipo:tipo_id(nombre))";

type OppCruda = {
  id: string;
  nombre: string | null;
  codigo: string | null;
  estado: string;
  creado_en: string;
  fecha_apertura: string | null;
  cierres: { fecha_cierre: string | null; resultado_final: string | null; motivo_perdido: string | null; creado_en: string }[];
  hojas: HojaCruda[];
  tipos: { tipo: { nombre: string } | null }[];
};

/** Todo lo que hace falta de UNA opp para su estado, lo que quieren y su paso. */
async function leerUna(op: OppCruda, desglose: Map<string, string>) {
  const hojas = op.hojas.filter((h) => h.estado !== "anulada");
  const [estado, fases, juntas, tresd, citas, polycam, viab] = await Promise.all([
    estadoDe(op, hojas),
    leer<{ hito: string; estado: string }[]>(`fases_oportunidad?select=hito,estado&oportunidad_id=eq.${op.id}`),
    leer<Datos["juntas"]>(`juntas?select=fecha_junta,celebrada,resultado&oportunidad_id=eq.${op.id}`),
    leer<{ tipo_3d: string | null; estado: string | null }[]>(
      `modelos_3d_venta?select=tipo_3d,estado&oportunidad_id=eq.${op.id}&order=creado_en.desc&limit=1`,
    ),
    leer<{ inicio: string }[]>(`citas?select=inicio&tipo=eq.escaneo_polycam&estado=neq.anulada&oportunidad_id=eq.${op.id}&limit=1`).catch(
      () => [],
    ),
    polycamDe(op.id).catch(() => null),
    leer<{ id: string }[]>(
      `viabilidades?select=id&oportunidad_id=eq.${op.id}&or=(enviada_en.not.is.null,url_pdf.not.is.null)&limit=1`,
    ).catch(() => []),
  ]);
  const intereses = op.tipos.map((t) => t.tipo?.nombre).filter((n): n is string => !!n);
  const firmadas = hojas.filter((h) => h.estado === "devuelta_firmada").map((h) => h.id);
  // Ganada: lo que se firmo. Si la hoja no lo dice (las importadas), lo que querian.
  const quieren = (estado.ganada ? await loFirmado(firmadas).catch(() => null) : null) ?? cobrables(intereses, desglose);
  return {
    estado,
    quieren,
    falta: falta({
      estado,
      hojas,
      fases,
      juntas,
      tresd: tresd[0] ?? null,
      cita: citas[0] ?? null,
      polycam: !!polycam,
      arquitecto: viab.length > 0,
    }),
  };
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
  const opps = await leer<OppCruda[]>(`oportunidades?select=${SEL_OPP}&id=in.(${ids.join(",")})`);
  const porId = new Map(accesos.map((a) => [a.id, a]));

  const filas = await Promise.all(
    opps.map(async (o) => {
      const x = await leerUna(o, desglose);
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
            ? x.falta.texto.toLowerCase()
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
  const [[op], desglose] = await Promise.all([leer<OppCruda[]>(`oportunidades?select=${SEL_OPP}&id=eq.${oppId}`), desgloses()]);
  if (!op) return null;
  const [una, otras] = await Promise.all([leerUna(op, desglose), otrasEnLaDireccion(oppId, desglose).catch(() => [])]);
  return { ...una, otras };
}

/** ¿Se puede cerrar o pausar? No, si esta firmada y queda dinero por cobrar. */
export async function quedaPorCobrar(oppId: string): Promise<boolean> {
  const hojas = await leer<{ id: string }[]>(`hojas_encargo?select=id&oportunidad_id=eq.${oppId}&estado=eq.devuelta_firmada`);
  if (!hojas.length) return false;
  return !(await cobrosDe(hojas.map((h) => h.id))).todos;
}
