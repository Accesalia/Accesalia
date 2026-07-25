// lib/hojas.ts
//
// Datos del GENERADOR de hojas de encargo. Una hoja se compone eligiendo
// CONCEPTOS del catalogo de bloques (los 18 items facturables). Solo de
// servidor, mismo patron REST con clave secreta.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

export type Bloque = {
  id: string;
  codigo: string;
  nombre: string;
  honorarios_defecto: number | null;
  es_paquete: boolean;
  orden: number | null;
};

/** Catalogo de conceptos activos, en orden, para elegir en la hoja. */
export function bloquesActivos(): Promise<Bloque[]> {
  return rest<Bloque[]>(
    "bloques?select=id,codigo,nombre,honorarios_defecto,es_paquete,orden&activo=eq.true&order=orden.asc",
  );
}

/** Contratas para el desplegable de pagador (cuando paga la contrata). */
export function contratasParaSelector(): Promise<{ id: string; nombre: string }[]> {
  return rest<{ id: string; nombre: string }[]>(
    "contratas?select=id,nombre&activa=eq.true&order=nombre.asc",
  );
}

// ---- Hojas de una comunidad (para el listado de su ventanita) ----

const ESTADOS_HOJA: Record<string, { label: string; clase: string }> = {
  borrador: { label: "Borrador", clase: "bg-black/5 text-carbon/50" },
  pendiente_firma_daniel: { label: "Pendiente firma Daniel", clase: "bg-amber-100 text-amber-700" },
  firmada_daniel: { label: "Firmada por Daniel", clase: "bg-amber-100 text-amber-700" },
  enviada_comunidad: { label: "Enviada a comunidad", clase: "bg-sky-100 text-sky-700" },
  cambios_solicitados: { label: "Cambios solicitados", clase: "bg-amber-100 text-amber-700" },
  rechazada: { label: "Rechazada", clase: "bg-red-100 text-red-700" },
  devuelta_firmada: { label: "Devuelta firmada", clase: "bg-lima-soft text-lima-dark" },
  archivada: { label: "Archivada", clase: "bg-black/5 text-carbon/40" },
  anulada: { label: "Anulada", clase: "bg-black/5 text-carbon/40" },
};

export function estadoHoja(estado: string): { label: string; clase: string } {
  return ESTADOS_HOJA[estado] ?? { label: estado, clase: "bg-black/5 text-carbon/50" };
}

export type HojaFila = {
  id: string;
  descripcion: string | null;
  estado: string;
  fecha_creacion: string;
  numero_hoja: string | null;
  pagador_tipo: string;
  versiones_hoja: { importe_total: number | null; numero_version: number; url_pdf_hoja: string | null }[];
  conceptos_hoja: { id: string }[];
};

export type HojaResumen = HojaFila & { importe: number | null; numConceptos: number; tienePdf: boolean };

/** Hojas de una comunidad, con importe de su ultima version, nº de conceptos y si tiene PDF. */
export async function hojasDeComunidad(comunidadId: string): Promise<HojaResumen[]> {
  const filas = await rest<HojaFila[]>(
    "hojas_encargo?select=id,descripcion,estado,fecha_creacion,numero_hoja,pagador_tipo," +
      "versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(importe_total,numero_version,url_pdf_hoja)," +
      "conceptos_hoja(id)" +
      `&comunidad_id=eq.${comunidadId}&conceptos_hoja.incluido=eq.true` +
      "&order=fecha_creacion.desc",
  );
  return filas.map((h) => {
    const ult = [...h.versiones_hoja].sort((a, b) => b.numero_version - a.numero_version)[0];
    return {
      ...h,
      importe: ult?.importe_total ?? null,
      numConceptos: h.conceptos_hoja.length,
      tienePdf: h.versiones_hoja.some((v) => v.url_pdf_hoja),
    };
  });
}

// ---- Detalle de UNA hoja ----

/** Estados en orden del ciclo de vida (para el selector). */
export const ORDEN_ESTADOS: string[] = [
  "borrador",
  "pendiente_firma_daniel",
  "firmada_daniel",
  "enviada_comunidad",
  "cambios_solicitados",
  "devuelta_firmada",
  "rechazada",
  "archivada",
  "anulada",
];

export type VersionHoja = {
  id: string;
  numero_version: number;
  fecha_generada: string | null;
  fecha_enviada: string | null;
  forma_pago: string | null;
  importe_base: number | null;
  iva_porcentaje: number | null;
  importe_total: number | null;
  url_pdf_hoja: string | null;
  pdfs_firmados: string[] | null;
  importes_forma_pago_texto: string | null;
};

export type ConceptoDetalle = {
  incluido: boolean;
  importe: number | null;
  bloques: { codigo: string; nombre: string; naturaleza: string | null } | null;
};

export type HojaDetalle = {
  id: string;
  comunidad_id: string;
  descripcion: string | null;
  estado: string;
  numero_hoja: string | null;
  fecha_creacion: string;
  pagador_tipo: string;
  emisor: string;
  canal_tarifa: string | null;
  generada_por: string | null;
  comercial_interno: string | null;
  quien_lo_trae: string | null;
  version_firmada_id: string | null;
  comunidades: { nombre: string } | null;
  versiones_hoja: VersionHoja[];
  conceptos_hoja: ConceptoDetalle[];
};

export const NATURALEZA: Record<string, { label: string; clase: string }> = {
  proyecto: { label: "Proyecto", clase: "bg-lima-soft text-lima-dark" },
  servicio: { label: "Servicio", clase: "bg-sky-100 text-sky-700" },
  documento_tecnico: { label: "Doc. técnica", clase: "bg-amber-100 text-amber-700" },
};

/** Detalle completo de una hoja: comunidad + versiones + conceptos (con bloque). */
export async function hojaPorId(id: string): Promise<HojaDetalle | null> {
  const filas = await rest<HojaDetalle[]>(
    "hojas_encargo?select=id,comunidad_id,descripcion,estado,numero_hoja,fecha_creacion," +
      "pagador_tipo,emisor,canal_tarifa,generada_por,comercial_interno,quien_lo_trae,version_firmada_id," +
      "comunidades(nombre)," +
      "versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,fecha_generada,fecha_enviada,forma_pago,importe_base,iva_porcentaje,importe_total,url_pdf_hoja,pdfs_firmados,importes_forma_pago_texto)," +
      "conceptos_hoja(incluido,importe,bloques(codigo,nombre,naturaleza))" +
      `&id=eq.${id}&conceptos_hoja.incluido=eq.true`,
  );
  const h = filas[0];
  if (!h) return null;
  h.versiones_hoja = [...(h.versiones_hoja ?? [])].sort((a, b) => b.numero_version - a.numero_version);
  return h;
}

// ---- Facturacion de una hoja (lineas + hitos de cobro) ----

const ESTADO_HITO: Record<string, { label: string; clase: string }> = {
  pendiente: { label: "Pendiente", clase: "bg-black/5 text-carbon/50" },
  facturado: { label: "Facturado", clase: "bg-sky-100 text-sky-700" },
  cobrado: { label: "Cobrado", clase: "bg-lima-soft text-lima-dark" },
  devuelto: { label: "Devuelto", clase: "bg-red-100 text-red-700" },
  anulado: { label: "Anulado", clase: "bg-black/5 text-carbon/40" },
};
export function estadoHito(e: string) {
  return ESTADO_HITO[e] ?? { label: e, clase: "bg-black/5 text-carbon/50" };
}
export const HITO_LABEL: Record<string, string> = {
  firma: "A la firma", encargo: "Al encargo", entrega: "A la entrega",
  licencia: "A la licencia", cfo: "Al fin de obra", concesion: "A la concesión", otro: "Otro",
};

export type HitoCobro = {
  id: string;
  hito: string;
  orden: number | null;
  porcentaje: number | null;
  importe: number | null;
  estado: string;
  numero_factura: string | null;
  numero_abono: string | null;
  fecha_factura: string | null;
  fecha_vencimiento: string | null;
  fecha_cobro: string | null;
  gastos_devolucion: number | null;
  url_factura_pdf: string | null;
  notas: string | null;
};
export type LineaFacturacion = {
  id: string;
  descripcion: string | null;
  importe: number | null;
  es_porcentaje: boolean;
  porcentaje: number | null;
  base_porcentaje: string | null;
  notas: string | null;
  origen: string;
  verificado: boolean;
  emisor: string;
  bloques: { nombre: string } | null;
  hitos_cobro: HitoCobro[];
};

// Selects reutilizados (linea + todos los campos del hito que muestra/edita la pantalla).
const SEL_HITO =
  "hitos_cobro(id,hito,orden,porcentaje,importe,estado,numero_factura,numero_abono," +
  "fecha_factura,fecha_vencimiento,fecha_cobro,gastos_devolucion,url_factura_pdf,notas)";
const SEL_LINEA =
  "id,descripcion,importe,es_porcentaje,porcentaje,base_porcentaje,notas,origen,verificado,emisor,bloques(nombre)," +
  SEL_HITO;

/** Lineas de facturacion (con sus hitos) de una hoja. */
export async function facturacionDeHoja(hojaId: string): Promise<LineaFacturacion[]> {
  const lineas = await rest<LineaFacturacion[]>(
    `lineas_facturacion?select=${SEL_LINEA}&hoja_encargo_id=eq.${hojaId}&order=creado_en.asc`,
  );
  for (const l of lineas) l.hitos_cobro = [...(l.hitos_cobro ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  return lineas;
}

// ---- Facturacion agregada por COMUNIDAD (ventanita del expediente + pagina) ----

export type ResumenFacturacion = {
  numHojas: number;
  numLineas: number;
  totalContratado: number; // suma de importes de linea (fijos)
  cobrado: number;
  facturado: number; // facturado aun no cobrado
  pendiente: number; // ni facturado ni cobrado
  devuelto: number;
  hayEstimado: boolean; // alguna linea sin verificar (Monday)
};

type LineaAgg = {
  importe: number | null;
  es_porcentaje: boolean;
  verificado: boolean;
  hitos_cobro: { importe: number | null; estado: string }[];
  hojas_encargo: { id: string };
};

/** Resumen de facturacion de toda una comunidad (para la ventanita). */
export async function resumenFacturacionComunidad(comunidadId: string): Promise<ResumenFacturacion> {
  const rows = await rest<LineaAgg[]>(
    "lineas_facturacion?select=importe,es_porcentaje,verificado," +
      "hitos_cobro(importe,estado),hojas_encargo!inner(id)" +
      `&hojas_encargo.comunidad_id=eq.${comunidadId}`,
  );
  const r: ResumenFacturacion = {
    numHojas: new Set(rows.map((x) => x.hojas_encargo.id)).size,
    numLineas: rows.length,
    totalContratado: 0, cobrado: 0, facturado: 0, pendiente: 0, devuelto: 0, hayEstimado: false,
  };
  for (const l of rows) {
    if (!l.es_porcentaje && l.importe) r.totalContratado += l.importe;
    if (!l.verificado) r.hayEstimado = true;
    for (const h of l.hitos_cobro ?? []) {
      const imp = h.importe ?? 0;
      if (h.estado === "cobrado") r.cobrado += imp;
      else if (h.estado === "facturado") r.facturado += imp;
      else if (h.estado === "devuelto") r.devuelto += imp;
      else if (h.estado === "pendiente") r.pendiente += imp;
    }
  }
  return r;
}

export type HojaConFacturacion = {
  hojaId: string;
  descripcion: string | null;
  estado: string;
  lineas: LineaFacturacion[];
};

/** Facturacion completa de una comunidad, agrupada por hoja (para la pagina). */
export async function facturacionComunidad(comunidadId: string): Promise<HojaConFacturacion[]> {
  const lineas = await rest<(LineaFacturacion & { hojas_encargo: { id: string; descripcion: string | null; estado: string } })[]>(
    `lineas_facturacion?select=${SEL_LINEA},hojas_encargo!inner(id,descripcion,estado)` +
      `&hojas_encargo.comunidad_id=eq.${comunidadId}&order=hoja_encargo_id.asc,creado_en.asc`,
  );
  const porHoja = new Map<string, HojaConFacturacion>();
  for (const l of lineas) {
    l.hitos_cobro = [...(l.hitos_cobro ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    const hid = l.hojas_encargo.id;
    if (!porHoja.has(hid)) {
      porHoja.set(hid, { hojaId: hid, descripcion: l.hojas_encargo.descripcion, estado: l.hojas_encargo.estado, lineas: [] });
    }
    porHoja.get(hid)!.lineas.push(l);
  }
  return [...porHoja.values()];
}
