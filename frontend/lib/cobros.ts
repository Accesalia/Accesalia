// lib/cobros.ts
//
// LA PANTALLA DE FACTURACION (Monica, 10/11-oct-2026). Tres vistas:
//   1 · por oportunidad: los DOCUMENTOS FIRMADOS (hoja de encargo, contrato,
//       pedido, nota de responsabilidad: la fuente de verdad, con su visor),
//       sus lineas facturables y sus HITOS y SUBHITOS, y las FACTURAS que los
//       pagan. Y tres cuadres: documentos = hitos; hitos = facturado + por
//       facturar; facturado = cobrado + pendiente de cobro.
//   2 · lo que queda por cobrar: la lista de oportunidades con hitos sin
//       facturar o sin cobrar.
//   3 · la prevision de caja (cronograma): se monta la semilla; se engancha a
//       las tablas de proyectos cuando existan.
//
// "Sin documento firmado no hay lineas facturables": todo cuelga de
// hojas_encargo (tipo_documento). Las facturas son las de Factusol volcadas
// (2025-26): lo de antes de 2025 sale "sin factura" aunque se cobrara.

import "server-only";
import type { Yo } from "./sesion";
import { direccionesDeOpps } from "./direccionOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...CAB, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
const leer = async <T>(path: string): Promise<T> => (await pedir(path)).json() as Promise<T>;

/** Leer TODO, por tramos de 1.000 (el tope de la API). */
async function todo<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await pedir(path, { headers: { Range: `${desde}-${desde + 999}`, "Range-Unit": "items" } });
    const filas = (await r.json()) as T[];
    out.push(...filas);
    if (filas.length < 1000) return out;
  }
}
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

/** Quien entra: direccion y quien tiene la funcion de facturacion (y la de
 *  control de produccion, para la prevision de caja). */
export function puedeVerCobros(yo: Yo): boolean {
  return yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion" || f.clave === "control_produccion");
}

// DOS LIBROS DE FACTURACION (Monica, 12-oct-2026): "Alexandra solo debe ver lo
// que factura Accesalia o Daniel de Soto; Ana, solo lo que factura Ecobalance.
// La pantalla de Ecobalance sera OTRA". Las mismas piezas, filtradas por quien
// emite: la linea (lineas_facturacion.emisor) y la factura (empresa_emisora).
export type Libro = "accesalia" | "ecobalance";
const EMISORES: Record<Libro, string[]> = { accesalia: ["accesalia", "daniel_autonomo"], ecobalance: ["ecobalance"] };
const EMISORAS_FACTURA: Record<Libro, string[]> = { accesalia: ["accesalia", "daniel"], ecobalance: ["ecobalance"] };
export function puedeVerEcobalance(yo: Yo): boolean {
  return yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion_ecobalance");
}
export const puedeVerLibro = (yo: Yo, libro: Libro) => (libro === "ecobalance" ? puedeVerEcobalance(yo) : puedeVerCobros(yo));
/** De que libro es un hito (por el emisor de su linea): cada accion lo comprueba. */
export async function libroDeHito(hitoId: string): Promise<Libro | null> {
  if (!/^[0-9a-f-]{36}$/.test(hitoId)) return null;
  const [h] = await leer<{ linea: { emisor: string | null } | null }[]>(`hitos_cobro?select=linea:linea_facturacion_id(emisor)&id=eq.${hitoId}`);
  const e = h?.linea?.emisor ?? "accesalia";
  return EMISORES.ecobalance.includes(e) ? "ecobalance" : "accesalia";
}

import { cuentasDeDocumento, cuentasDeHito, TEXTO_DOCUMENTO, type Documento, type FacturaDeHito, type Hito, type TipoDocumento } from "./cobrosCalculo";
export * from "./cobrosCalculo";

// ------------------------------------------------------ las lecturas

type FilaHito = {
  id: string; linea_facturacion_id: string; hito: string; orden: number | null; porcentaje: number | null; importe: number | null;
  estado: string; fecha_prevista: string | null; en_pausa_desde: string | null; notas: string | null; hito_padre_id: string | null;
};
type FilaEnlace = {
  hito_cobro_id: string; importe: number | null;
  linea: { factura: { id: string; anio: number; serie: string; numero: number; tipo: string; fecha: string | null; estado: string; url_pdf: string | null; empresa_emisora: string } | null } | null;
};

function montarHitos(filas: FilaHito[], enlaces: Map<string, FacturaDeHito[]>, notas: Map<string, Hito["notas"]>): Map<string, Hito[]> {
  const hijos = new Map<string, FilaHito[]>();
  for (const f of filas) if (f.hito_padre_id) hijos.set(f.hito_padre_id, [...(hijos.get(f.hito_padre_id) ?? []), f]);
  const uno = (f: FilaHito): Hito => ({
    id: f.id,
    tipo: f.hito,
    orden: f.orden ?? 0,
    importe: f.importe == null ? null : Number(f.importe),
    porcentaje: f.porcentaje == null ? null : Number(f.porcentaje),
    estado: f.estado,
    fechaPrevista: f.fecha_prevista,
    enPausaDesde: f.en_pausa_desde,
    texto: f.notas,
    facturas: enlaces.get(f.id) ?? [],
    subhitos: (hijos.get(f.id) ?? []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map(uno),
    notas: notas.get(f.id) ?? [],
  });
  const porLinea = new Map<string, Hito[]>();
  for (const f of filas.filter((x) => !x.hito_padre_id).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)))
    porLinea.set(f.linea_facturacion_id, [...(porLinea.get(f.linea_facturacion_id) ?? []), uno(f)]);
  return porLinea;
}

function enlacesPorHito(filas: FilaEnlace[]): Map<string, FacturaDeHito[]> {
  const m = new Map<string, FacturaDeHito[]>();
  for (const e of filas) {
    const f = e.linea?.factura;
    if (!f) continue;
    const num = `${f.tipo === "abono" ? "Abono " : ""}${f.anio}/${f.serie}-${f.numero}${f.empresa_emisora === "accesalia" ? "" : ` (${f.empresa_emisora})`}`;
    m.set(e.hito_cobro_id, [...(m.get(e.hito_cobro_id) ?? []), { id: f.id, numero: num, fecha: f.fecha, estado: f.estado, importe: Number(e.importe) || 0, pdf: !!f.url_pdf }]);
  }
  return m;
}

/** Un enlace de Drive se ve con su visor (/preview); uno del almacen, por la
 *  ruta de la app que lo firma al abrirlo. */
function urlVisor(u: string, hojaId: string, versionId: string, indice: number | null): string {
  if (u.startsWith("almacen:"))
    return indice == null ? `/comercial/hoja-encargo/pdf/${versionId}` : `/facturacion/documento/${hojaId}/${versionId}/${indice}`;
  return u.replace(/\/(view|edit)(\?.*)?$/, "/preview").replace(/(docs\.google\.com\/document\/d\/[^/]+)$/, "$1/preview");
}

// ----------------------------------------------------- vista 1: la opp

export type DetalleCobro = {
  opp: { id: string; codigo: string | null; nombre: string | null; estado: string; comunidad: string | null };
  documentos: Documento[];
  /** Facturas de la oportunidad que no pagan ningun hito (por casar). */
  sinHito: FacturaDeHito[];
};

export async function detalleCobro(oppId: string, libro: Libro = "accesalia"): Promise<DetalleCobro | null> {
  const [opps, hojas] = await Promise.all([
    leer<{ id: string; codigo: string | null; nombre: string | null; estado: string; comunidad: { nombre: string } | null }[]>(
      `oportunidades?select=id,codigo,nombre,estado,comunidad:comunidad_id(nombre)&id=eq.${oppId}`,
    ),
    leer<{
      id: string; numero_hoja: string | null; tipo_documento: TipoDocumento; descripcion: string | null; fecha_creacion: string | null; fecha_firma: string | null;
      estado: string; motivo_sin_firma: string | null; responsable: { nombre: string } | null;
      versiones: { id: string; numero_version: number; url_pdf_hoja: string | null; pdfs_firmados: string[] | null; importe_base: number | null }[];
    }[]>(
      `hojas_encargo?select=id,numero_hoja,tipo_documento,descripcion,fecha_creacion,fecha_firma,estado,motivo_sin_firma,responsable:responsable_id(nombre),` +
        `versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,url_pdf_hoja,pdfs_firmados,importe_base)` +
        `&oportunidad_id=eq.${oppId}&estado=eq.devuelta_firmada&order=fecha_creacion.asc`,
    ),
  ]);
  const o = opps[0];
  if (!o) return null;
  const ids = hojas.map((h) => h.id);
  const todasLineas = ids.length
    ? (
        await leer<{ id: string; hoja_encargo_id: string; descripcion: string | null; importe: number | null; es_porcentaje: boolean | null; porcentaje: number | null; emisor: string | null }[]>(
          `lineas_facturacion?select=id,hoja_encargo_id,descripcion,importe,es_porcentaje,porcentaje,emisor&hoja_encargo_id=in.(${ids.join(",")})&order=creado_en.asc`,
        )
      )
    : [];
  // Las de otro libro no se ven; y un documento que solo tiene lineas de otro libro, tampoco.
  const conLineas = new Set(todasLineas.map((l) => l.hoja_encargo_id));
  const lineas = todasLineas.filter((l) => EMISORES[libro].includes(l.emisor ?? "accesalia"));
  const delLibro = new Set(lineas.map((l) => l.hoja_encargo_id));
  const lids = lineas.map((l) => l.id);
  const filas = lids.length
    ? await leer<FilaHito[]>(
        `hitos_cobro?select=id,linea_facturacion_id,hito,orden,porcentaje,importe,estado,fecha_prevista,en_pausa_desde,notas,hito_padre_id&linea_facturacion_id=in.(${lids.join(",")})`,
      )
    : [];
  const hids = filas.map((h) => h.id);
  const [enl, nts] = hids.length
    ? await Promise.all([
        leer<FilaEnlace[]>(
          `factura_linea_hitos?select=hito_cobro_id,importe,linea:factura_linea_id(factura:factura_id(id,anio,serie,numero,tipo,fecha,estado,url_pdf,empresa_emisora))&hito_cobro_id=in.(${hids.join(",")})`,
        ),
        leer<{ hito_cobro_id: string; fecha: string | null; texto: string; autor: string | null }[]>(
          `notas_facturacion?select=hito_cobro_id,fecha,texto,autor&hito_cobro_id=in.(${hids.join(",")})&order=creado_en.asc`,
        ),
      ])
    : [[], []];
  const notas = new Map<string, Hito["notas"]>();
  for (const n of nts) notas.set(n.hito_cobro_id, [...(notas.get(n.hito_cobro_id) ?? []), { fecha: n.fecha, texto: n.texto, autor: n.autor }]);
  const porLinea = montarHitos(filas, enlacesPorHito(enl), notas);

  const documentos: Documento[] = hojas
    .filter((h) => delLibro.has(h.id) || (libro === "accesalia" && !conLineas.has(h.id)))
    .map((h) => {
    const vs = [...h.versiones].sort((a, b) => a.numero_version - b.numero_version);
    const visor: Documento["visor"] = [];
    for (const v of vs) (v.pdfs_firmados ?? []).forEach((f, k) => visor.push({ etiqueta: vs.length > 1 ? `Firmada v${v.numero_version}` : "Firmada", url: urlVisor(f, h.id, v.id, k) }));
    if (!visor.length) {
      const v = vs.filter((x) => x.url_pdf_hoja).at(-1);
      if (v?.url_pdf_hoja) visor.push({ etiqueta: `Generada v${v.numero_version} (sin la firmada subida)`, url: urlVisor(v.url_pdf_hoja, h.id, v.id, null) });
    }
    const ls = lineas.filter((l) => l.hoja_encargo_id === h.id);
    return {
      id: h.id,
      codigo: h.numero_hoja,
      tipo: h.tipo_documento,
      titulo: (h.descripcion ?? "").trim() || TEXTO_DOCUMENTO[h.tipo_documento],
      fecha: h.fecha_firma ?? h.fecha_creacion,
      estado: h.estado,
      importe: Number(vs.at(-1)?.importe_base) || 0,
      visor,
      responsable: h.responsable?.nombre ?? null,
      motivoSinFirma: h.motivo_sin_firma,
      lineas: ls.map((l) => ({
        id: l.id,
        descripcion: (l.descripcion ?? "").trim() || "Línea",
        importe: l.importe == null ? null : Number(l.importe),
        esPorcentaje: !!l.es_porcentaje,
        porcentaje: l.porcentaje == null ? null : Number(l.porcentaje),
        hitos: porLinea.get(l.id) ?? [],
      })),
    };
  });

  // Facturas apuntadas a la oportunidad que no pagan ningun hito
  const pagan = new Set(enl.map((e) => e.linea?.factura?.id).filter(Boolean));
  const sueltas = await leer<{ id: string; anio: number; serie: string; numero: number; tipo: string; fecha: string | null; estado: string; base: number | null; url_pdf: string | null; empresa_emisora: string }[]>(
    `facturas?select=id,anio,serie,numero,tipo,fecha,estado,base,url_pdf,empresa_emisora&oportunidad_id=eq.${oppId}&empresa_emisora=in.(${EMISORAS_FACTURA[libro].join(",")})`,
  );
  // La direccion de la opp, SIEMPRE con municipio (Monica, 13-oct-2026).
  const dir = (await direccionesDeOpps([o.id])).get(o.id) ?? null;
  return {
    opp: { id: o.id, codigo: o.codigo, nombre: dir ?? o.nombre, estado: o.estado, comunidad: o.comunidad?.nombre ?? null },
    documentos,
    sinHito: sueltas
      .filter((f) => !pagan.has(f.id))
      .map((f) => ({ id: f.id, numero: `${f.anio}/${f.serie}-${f.numero}`, fecha: f.fecha, estado: f.estado, importe: Number(f.base) || 0, pdf: !!f.url_pdf })),
  };
}

// --------------------------------------------- vista 2: lo que queda

export type FilaPorCobrar = {
  oppId: string;
  codigo: string | null;
  nombre: string;
  documentos: { codigo: string | null; tipo: TipoDocumento }[];
  primeraFirma: string | null;
  firmado: number;
  facturado: number;
  cobrado: number;
  porFacturar: number;
  /** Lo "por facturar" de documentos firmados antes de 2025: sus facturas de
   *  entonces no estan cargadas, asi que puede estar ya facturado y cobrado. */
  previo: number;
  pendienteCobro: number;
  enPausa: number;
  aExito: number;
  proximo: { tipo: string; fecha: string | null; importe: number } | null;
  /** Firmado antes de 2025 sin ninguna factura cargada: lo facturado entonces no esta en la app. */
  antiguo: boolean;
};

export async function porCobrar(libro: Libro = "accesalia"): Promise<FilaPorCobrar[]> {
  const [hojas, lineas, filas, enl] = await Promise.all([
    todo<{ id: string; numero_hoja: string | null; tipo_documento: TipoDocumento; oportunidad_id: string | null; fecha_firma: string | null; fecha_creacion: string | null;
      opp: { codigo: string | null; nombre: string | null; comunidad: { nombre: string } | null } | null;
      versiones: { numero_version: number; importe_base: number | null }[] }>(
      "hojas_encargo?select=id,numero_hoja,tipo_documento,oportunidad_id,fecha_firma,fecha_creacion,opp:oportunidad_id(codigo,nombre,comunidad:comunidad_id(nombre))," +
        "versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(numero_version,importe_base)&estado=eq.devuelta_firmada&oportunidad_id=not.is.null",
    ),
    todo<{ id: string; hoja_encargo_id: string; descripcion: string | null; importe: number | null; es_porcentaje: boolean | null; porcentaje: number | null; emisor: string | null }>(
      "lineas_facturacion?select=id,hoja_encargo_id,descripcion,importe,es_porcentaje,porcentaje,emisor",
    ),
    todo<FilaHito>("hitos_cobro?select=id,linea_facturacion_id,hito,orden,porcentaje,importe,estado,fecha_prevista,en_pausa_desde,notas,hito_padre_id"),
    todo<FilaEnlace>(
      "factura_linea_hitos?select=hito_cobro_id,importe,linea:factura_linea_id(factura:factura_id(id,anio,serie,numero,tipo,fecha,estado,url_pdf,empresa_emisora))",
    ),
  ]);
  const porLinea = montarHitos(filas, enlacesPorHito(enl), new Map());
  const lineasDe = new Map<string, typeof lineas>();
  const conLineas = new Set(lineas.map((l) => l.hoja_encargo_id));
  for (const l of lineas.filter((x) => EMISORES[libro].includes(x.emisor ?? "accesalia")))
    lineasDe.set(l.hoja_encargo_id, [...(lineasDe.get(l.hoja_encargo_id) ?? []), l]);
  const porOpp = new Map<string, FilaPorCobrar>();
  const dirs = await direccionesDeOpps(hojas.map((h) => h.oportunidad_id));
  for (const h of hojas) {
    const ls = lineasDe.get(h.id) ?? [];
    // Solo los documentos de este libro (los que aun no tienen lineas, a Accesalia).
    if (!ls.length && (libro === "ecobalance" || conLineas.has(h.id))) continue;
    const doc: Documento = {
      id: h.id, codigo: h.numero_hoja, tipo: h.tipo_documento, titulo: "", fecha: h.fecha_firma ?? h.fecha_creacion, estado: "devuelta_firmada",
      importe: Number([...h.versiones].sort((a, b) => a.numero_version - b.numero_version).at(-1)?.importe_base) || 0,
      visor: [], responsable: null, motivoSinFirma: null,
      lineas: ls.map((l) => ({ id: l.id, descripcion: "", importe: l.importe == null ? null : Number(l.importe), esPorcentaje: !!l.es_porcentaje,
        porcentaje: l.porcentaje == null ? null : Number(l.porcentaje), hitos: porLinea.get(l.id) ?? [] })),
    };
    const c = cuentasDeDocumento(doc);
    const fila = porOpp.get(h.oportunidad_id!) ?? {
      oppId: h.oportunidad_id!, codigo: h.opp?.codigo ?? null, nombre: dirs.get(h.oportunidad_id!) ?? h.opp?.comunidad?.nombre ?? h.opp?.nombre ?? "Sin nombre",
      documentos: [], primeraFirma: null, firmado: 0, facturado: 0, cobrado: 0, porFacturar: 0, previo: 0, pendienteCobro: 0, enPausa: 0, aExito: 0, proximo: null, antiguo: false,
    };
    fila.documentos.push({ codigo: h.numero_hoja, tipo: h.tipo_documento });
    if (doc.fecha && (!fila.primeraFirma || doc.fecha < fila.primeraFirma)) fila.primeraFirma = doc.fecha;
    fila.firmado += c.firmado;
    fila.facturado += c.facturado;
    fila.cobrado += c.cobrado;
    const previo = (doc.fecha ?? "") < "2025-01-01";
    if (previo) fila.previo += c.porFacturar;
    else fila.porFacturar += c.porFacturar;
    fila.enPausa += c.enPausa;
    fila.aExito += c.aExito;
    // el proximo hito por facturar: el de fecha prevista mas cercana; si ninguno tiene fecha, el primero
    for (const ht of previo ? [] : doc.lineas.flatMap((l) => l.hitos)) {
      const cands = ht.subhitos.length ? ht.subhitos : [ht];
      for (const x of cands) {
        const cx = cuentasDeHito(x);
        if (cx.porFacturar <= 0 || cx.enPausa) continue;
        const p = { tipo: x.tipo, fecha: x.fechaPrevista, importe: cx.porFacturar };
        if (!fila.proximo || (p.fecha && (!fila.proximo.fecha || p.fecha < fila.proximo.fecha))) fila.proximo = p;
      }
    }
    porOpp.set(h.oportunidad_id!, fila);
  }
  const filasOut = [...porOpp.values()];
  for (const f of filasOut) {
    f.pendienteCobro = Math.max(0, f.facturado - f.cobrado);
    f.antiguo = !!f.primeraFirma && f.primeraFirma < "2025-01-01" && f.facturado === 0;
    for (const k of ["firmado", "facturado", "cobrado", "porFacturar", "previo", "pendienteCobro", "enPausa"] as const) f[k] = Math.round(f[k] * 100) / 100;
  }
  return filasOut;
}

export { hoy };

// ------------------------------------------------------- las acciones

async function hojaDeHito(hitoId: string): Promise<{ hojaId: string; importe: number | null; padre: string | null; linea: string; tipo: string; subhitos: number; facturas: number }> {
  const [h] = await leer<{ importe: number | null; hito_padre_id: string | null; hito: string; linea_facturacion_id: string; linea: { hoja_encargo_id: string } | null }[]>(
    `hitos_cobro?select=importe,hito_padre_id,hito,linea_facturacion_id,linea:linea_facturacion_id(hoja_encargo_id)&id=eq.${hitoId}`,
  );
  if (!h?.linea) throw new Error("Ese hito no existe.");
  const [subs, facs] = await Promise.all([
    leer<{ id: string }[]>(`hitos_cobro?select=id&hito_padre_id=eq.${hitoId}`),
    leer<{ hito_cobro_id: string }[]>(`factura_linea_hitos?select=hito_cobro_id&hito_cobro_id=eq.${hitoId}`),
  ]);
  return { hojaId: h.linea.hoja_encargo_id, importe: h.importe == null ? null : Number(h.importe), padre: h.hito_padre_id, linea: h.linea_facturacion_id,
    tipo: h.hito, subhitos: subs.length, facturas: facs.length };
}

async function apuntarNota(hitoId: string, hojaId: string, texto: string, yo: Yo) {
  await pedir("notas_facturacion", {
    method: "POST",
    body: JSON.stringify({ hoja_encargo_id: hojaId, hito_cobro_id: hitoId, fecha: hoy(), texto, origen: "persona", autor_id: yo.id,
      autor: [yo.nombre, yo.apellidos].filter(Boolean).join(" ") }),
  });
}

/** Una nota en el hito o subhito ("estan en juicios con el local"). */
export async function notaDeHito(hitoId: string, texto: string, yo: Yo) {
  if (!texto.trim()) throw new Error("La nota está vacía.");
  const h = await hojaDeHito(hitoId);
  await apuntarNota(hitoId, h.hojaId, texto.trim(), yo);
}

/** PAUSAR / REACTIVAR (Monica, 10-oct-2026): en pausa no cuenta en la prevision
 *  de caja ni en el aviso de facturar. El porque, obligatorio al pausar. */
export async function pausarHito(hitoId: string, pausar: boolean, motivo: string, yo: Yo) {
  if (pausar && !motivo.trim()) throw new Error("Escribe por qué se pausa.");
  const h = await hojaDeHito(hitoId);
  await pedir(`hitos_cobro?id=eq.${hitoId}`, { method: "PATCH", body: JSON.stringify({ en_pausa_desde: pausar ? hoy() : null, actualizado_en: new Date().toISOString() }) });
  await apuntarNota(hitoId, h.hojaId, (pausar ? "EN PAUSA: " : "REACTIVADO") + (motivo.trim() ? (pausar ? "" : ": ") + motivo.trim() : ""), yo);
}

export async function fechaDeHito(hitoId: string, fecha: string | null) {
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha no válida.");
  await pedir(`hitos_cobro?id=eq.${hitoId}`, { method: "PATCH", body: JSON.stringify({ fecha_prevista: fecha, actualizado_en: new Date().toISOString() }) });
}

/** FRACCIONAR un hito en subhitos pactados con la comunidad, con su importe y su
 *  fecha. La nota del porque es obligatoria ("hable con el admin", "no tienen
 *  caja"). Solo un hito entero: sin subhitos ya y sin facturas propias. */
export async function fraccionarHito(hitoId: string, partes: { importe: number; fecha: string | null }[], motivo: string, yo: Yo) {
  if (!motivo.trim()) throw new Error("Escribe por qué se fracciona.");
  const h = await hojaDeHito(hitoId);
  if (h.padre) throw new Error("Un subhito no se fracciona.");
  if (h.subhitos) throw new Error("Este hito ya está fraccionado.");
  if (h.facturas) throw new Error("Este hito ya tiene factura: no se fracciona.");
  if (h.importe == null) throw new Error("Un hito a éxito no tiene importe que fraccionar.");
  if (partes.length < 2 || partes.some((p) => !(p.importe > 0))) throw new Error("Hacen falta al menos dos plazos con importe.");
  const suma = Math.round(partes.reduce((a, p) => a + p.importe, 0) * 100) / 100;
  if (Math.abs(suma - h.importe) > 0.5) throw new Error(`Los plazos suman ${suma} y el hito es de ${h.importe}.`);
  await pedir("hitos_cobro", {
    method: "POST",
    body: JSON.stringify(partes.map((p, k) => ({ linea_facturacion_id: h.linea, hito: h.tipo, orden: k + 1, importe: Math.round(p.importe * 100) / 100,
      estado: "pendiente", hito_padre_id: hitoId, fecha_prevista: p.fecha, notas: `Plazo ${k + 1} de ${partes.length}` }))),
  });
  await apuntarNota(hitoId, h.hojaId, `FRACCIONADO en ${partes.length} plazos: ${motivo.trim()}`, yo);
}

/** El PDF de una factura (almacen privado `facturas`). */
export async function pdfDeFactura(id: string, yo?: Yo): Promise<{ pdf: Uint8Array; nombre: string } | null> {
  const [f] = await leer<{ url_pdf: string | null; anio: number; serie: string; numero: number; pagador_nombre: string | null; empresa_emisora: string }[]>(
    `facturas?select=url_pdf,anio,serie,numero,pagador_nombre,empresa_emisora&id=eq.${id}`,
  );
  if (!f?.url_pdf?.startsWith("almacen:")) return null;
  // Cada libro, sus facturas (12-oct-2026).
  if (yo && !puedeVerLibro(yo, EMISORAS_FACTURA.ecobalance.includes(f.empresa_emisora) ? "ecobalance" : "accesalia")) return null;
  const r = await fetch(`${URL_BASE}/storage/v1/object/${f.url_pdf.slice("almacen:".length)}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) return null;
  return { pdf: new Uint8Array(await r.arrayBuffer()), nombre: `Factura ${f.anio}-${f.serie}-${f.numero} ${f.pagador_nombre ?? ""}.pdf`.replace(/\s+/g, " ") };
}

// ------------------------------------- vista 3: la semilla del cronograma

export type TrabajoCaja = {
  oppId: string;
  codigo: string | null;
  nombre: string;
  entrega: number;
  contrata: boolean;
  firma: string | null;
  /** La primera factura cobrada de esa oportunidad: cuando entra en la lista de
   *  nubes (no se guarda la fecha del cobro; es la de la factura). */
  cobradoDesde: string | null;
  /** Su escaneo (nubes_puntos), si ya se ha tocado. */
  nube: { prevista: string | null; escaneado: string | null; lista: string | null } | null;
  /** Lo que abre lo que se ha cobrado (Monica, 12-oct-2026), segun el bloque de
   *  sus lineas (bloques.va_a_faro / va_a_tecnico): un proyecto tecnico va a
   *  FARO y a tecnico; un IEE o una subvencion, no. */
  faro: boolean;
  tecnico: boolean;
};
export type CobroFijo = { oppId: string; nombre: string; fecha: string; importe: number; tipo: string };
export type DatosCaja = {
  trabajos: TrabajoCaja[];
  fijos: CobroFijo[];
  sinFecha: { importe: number; hitos: number };
  tecnicos: { id: string; nombre: string }[];
};

/** Lo que alimenta el cronograma, con lo que hay HOY: los proyectos con su hito
 *  "a la entrega" por facturar (eso es trabajo de tecnico que desbloquea un
 *  cobro), los cobros con fecha ya pactada, y lo que depende de fuera (licencia,
 *  CFO, concesion...) sin fecha. Las tareas, sus duraciones y los requerimientos
 *  se engancharan a las tablas de proyecto cuando existan. */
export async function datosCaja(): Promise<DatosCaja> {
  const [hojas, lineas, filas, enl, tecnicos, cobradas, nubes] = await Promise.all([
    todo<{ id: string; oportunidad_id: string | null; pagador_tipo: string; fecha_firma: string | null; opp: { codigo: string | null; nombre: string | null; comunidad: { nombre: string } | null } | null }>(
      "hojas_encargo?select=id,oportunidad_id,pagador_tipo,fecha_firma,opp:oportunidad_id(codigo,nombre,comunidad:comunidad_id(nombre))&estado=eq.devuelta_firmada&oportunidad_id=not.is.null",
    ),
    todo<{ id: string; hoja_encargo_id: string; bloque: { va_a_faro: boolean; va_a_tecnico: boolean } | null }>(
      // El cronograma y la caja son de Accesalia (y Daniel): lo de Ecobalance va en su libro.
      `lineas_facturacion?select=id,hoja_encargo_id,bloque:bloque_id(va_a_faro,va_a_tecnico)&emisor=in.(${EMISORES.accesalia.join(",")})`,
    ),
    todo<FilaHito>("hitos_cobro?select=id,linea_facturacion_id,hito,orden,porcentaje,importe,estado,fecha_prevista,en_pausa_desde,notas,hito_padre_id"),
    todo<FilaEnlace>("factura_linea_hitos?select=hito_cobro_id,importe,linea:factura_linea_id(factura:factura_id(id,anio,serie,numero,tipo,fecha,estado,url_pdf,empresa_emisora))"),
    leer<{ equipo: { id: string; nombre: string; apellidos: string | null; activo: boolean | null } | null }[]>(
      "equipo_funciones?select=equipo:equipo_id(id,nombre,apellidos,activo),funcion:funcion_id!inner(clave)&funcion.clave=eq.proyecto",
    ).catch(() => []),
    todo<{ oportunidad_id: string | null; fecha: string | null }>("facturas?select=oportunidad_id,fecha&estado=eq.cobrada&oportunidad_id=not.is.null"),
    todo<{ oportunidad_id: string; fecha_prevista_escaneo: string | null; escaneado_en: string | null; nube_lista_en: string | null }>(
      "nubes_puntos?select=oportunidad_id,fecha_prevista_escaneo,escaneado_en,nube_lista_en",
    ),
  ]);
  const primerCobro = new Map<string, string>();
  for (const f of cobradas)
    if (f.oportunidad_id && f.fecha && (!primerCobro.has(f.oportunidad_id) || f.fecha < primerCobro.get(f.oportunidad_id)!)) primerCobro.set(f.oportunidad_id, f.fecha);
  const nubeDe = new Map(nubes.map((n) => [n.oportunidad_id, { prevista: n.fecha_prevista_escaneo, escaneado: n.escaneado_en, lista: n.nube_lista_en }]));
  const porLinea = montarHitos(filas, enlacesPorHito(enl), new Map());
  const hojaDe = new Map(hojas.map((h) => [h.id, h]));
  const dirs = await direccionesDeOpps(hojas.map((h) => h.oportunidad_id));
  const trab = new Map<string, TrabajoCaja>();
  const fijos: CobroFijo[] = [];
  let sinFechaImp = 0, sinFechaN = 0;
  for (const l of lineas) {
    const h = hojaDe.get(l.hoja_encargo_id);
    if (!h?.oportunidad_id) continue;
    // lo firmado antes de 2025 sin facturas cargadas no se sabe si esta cobrado: fuera
    const nombre = dirs.get(h.oportunidad_id) ?? h.opp?.comunidad?.nombre ?? h.opp?.nombre ?? "Sin nombre";
    for (const ht of porLinea.get(l.id) ?? []) {
      for (const x of ht.subhitos.length ? ht.subhitos : [ht]) {
        const c = cuentasDeHito(x);
        if (c.porFacturar <= 0 || c.enPausa) continue;
        if ((h.fecha_firma ?? "") < "2025-01-01" && !x.facturas.length) continue;
        if (x.fechaPrevista) fijos.push({ oppId: h.oportunidad_id, nombre, fecha: x.fechaPrevista, importe: c.porFacturar, tipo: x.tipo });
        // Solo es trabajo de tecnico la entrega de una linea que va a tecnico; la
        // de una subvencion o un IEE espera a otras cosas: va con lo de fuera.
        else if (x.tipo === "entrega" && l.bloque?.va_a_tecnico) {
          const t = trab.get(h.oportunidad_id) ?? {
            oppId: h.oportunidad_id,
            codigo: h.opp?.codigo ?? null,
            nombre,
            entrega: 0,
            contrata: h.pagador_tipo === "contrata",
            firma: h.fecha_firma,
            cobradoDesde: primerCobro.get(h.oportunidad_id) ?? null,
            nube: nubeDe.get(h.oportunidad_id) ?? null,
            faro: false,
            tecnico: true,
          };
          if (l.bloque?.va_a_faro) t.faro = true;
          t.entrega += c.porFacturar;
          trab.set(h.oportunidad_id, t);
        } else { sinFechaImp += c.porFacturar; sinFechaN++; }
      }
    }
  }
  return {
    trabajos: [...trab.values()].sort((a, b) => (a.firma ?? "").localeCompare(b.firma ?? "")),
    fijos: fijos.sort((a, b) => a.fecha.localeCompare(b.fecha)),
    sinFecha: { importe: Math.round(sinFechaImp), hitos: sinFechaN },
    tecnicos: tecnicos.filter((t) => t.equipo && t.equipo.activo !== false).map((t) => ({ id: t.equipo!.id, nombre: [t.equipo!.nombre, t.equipo!.apellidos].filter(Boolean).join(" ") }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  };
}

/** Apunta el escaneo de un trabajo (nubes_puntos): crea su fila la primera vez. */
export async function guardarNube(
  oppId: string,
  cambios: Partial<{ fecha_prevista_escaneo: string | null; escaneado_en: string | null; nube_lista_en: string | null }>,
  yo: Yo,
) {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) throw new Error("Oportunidad no valida");
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/nubes_puntos?on_conflict=oportunidad_id`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY ?? "",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ oportunidad_id: oppId, ...cambios, actualizado_por: yo.id }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`No se pudo guardar: ${r.status} ${await r.text()}`);
}
