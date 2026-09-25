// lib/fichaReal.ts
//
// La ficha comercial completa CON DATOS DE VERDAD.
//
// HALLAZGO DEL 25-sep-2026 que decide la forma de esto: en produccion hay UNA
// sola oportunidad, pero 1.228 comunidades y TODAS tienen hoja de encargo. Lo
// real cuelga de la COMUNIDAD, no de la oportunidad. Asi que la ficha se pide
// por comunidad, que ademas es lo coherente con que sea la semilla del
// expediente 360 (Monica, 12-sep): la comunidad sobrevive a la oportunidad.
//
// Esto SOLO LEE. No escribe nada.

import "server-only";
import type { HitoCobro } from "./cuadroComercial";
import { EDIFICIO_VACIO, type FichaComercial } from "./fichaComercial";

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

// Cada bloque se lee por separado y a prueba de fallos: si una consulta falla,
// ese bloque sale vacio y se dice en pantalla, en vez de tumbar la ficha entera.
// La ficha es de SOLO LECTURA sobre datos migrados que no controlamos.
async function intenta<T>(p: Promise<T[]>, que: string, avisos: string[]): Promise<T[]> {
  try {
    return await p;
  } catch (e) {
    console.error(`ficha: no se pudo leer ${que}`, e);
    avisos.push(que);
    return [];
  }
}

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esComunidad = (id: string) => ES_UUID.test(id);

type FilaComunidad = {
  id: string; nombre: string; direccion: string | null; municipio: string | null;
  anio_construccion: number | null; num_viviendas: number | null; referencia_catastral: string | null;
};

type FilaVersion = {
  numero_version: number; fecha_generada: string | null; fecha_enviada: string | null;
  motivo_cambio: string | null; url_pdf_hoja: string | null; importe_total: string | null;
  pdfs_firmados: string[] | null;
};

type FilaHoja = {
  id: string; numero_hoja: string | null; estado: string | null; fecha_creacion: string | null;
  fecha_firma: string | null; descripcion: string | null; emisor: string | null;
  quien_lo_trae: string | null; comercial_interno: string | null;
  versiones_hoja: FilaVersion[];
  lineas_facturacion: {
    descripcion: string | null; importe: string | null;
    hitos_cobro: { hito: string; orden: number; importe: string | null; estado: string | null; fecha_vencimiento: string | null; fecha_cobro: string | null }[];
  }[];
};

type FilaPersona = { nombre: string; rol: string | null; telefono: string | null; email: string | null; notas: string | null };
type FilaObs = { id: string; fecha: string | null; fase: string | null; texto: string; autor: string | null };

const num = (x: string | null) => (x === null ? 0 : Number(x));

// Nombres de hito de la base -> como se dicen en la pantalla.
const HITO: Record<string, string> = {
  firma: "A la firma", entrega: "Entrega del proyecto", licencia: "Concesión de licencia",
  concesion: "Concesión", cfo: "Fin de obra (CFO)",
};

/**
 * La ficha de UNA comunidad, leida de produccion. null si no existe.
 *
 * Lo que todavia no tiene datos en la base se devuelve vacio a proposito: la
 * pantalla ensena el hueco, no se inventa nada.
 */
export async function fichaReal(comunidadId: string): Promise<FichaComercial | null> {
  const [comunidad] = await rest<FilaComunidad[]>(
    `comunidades?select=id,nombre,direccion,municipio,anio_construccion,num_viviendas,referencia_catastral&id=eq.${comunidadId}`,
  );
  if (!comunidad) return null;

  const avisos: string[] = [];
  const [hojas, personas, observaciones] = await Promise.all([
    intenta(rest<FilaHoja[]>(
      "hojas_encargo?select=id,numero_hoja,estado,fecha_creacion,fecha_firma,descripcion,emisor,quien_lo_trae,comercial_interno," +
        // OJO: hay DOS relaciones entre hojas_encargo y versiones_hoja (la version
        // apunta a su hoja, y la hoja apunta a su version firmada). Hay que decir
        // por cual se embebe o PostgREST se queja de ambiguedad.
        "versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(numero_version,fecha_generada,fecha_enviada,motivo_cambio,url_pdf_hoja,importe_total,pdfs_firmados)," +
        "lineas_facturacion(descripcion,importe,hitos_cobro(hito,orden,importe,estado,fecha_vencimiento,fecha_cobro))" +
        `&comunidad_id=eq.${comunidadId}&order=fecha_creacion.desc`,
    ), "la hoja de encargo", avisos),
    intenta(rest<FilaPersona[]>(`personas_comunidad?select=nombre,rol,telefono,email,notas&comunidad_id=eq.${comunidadId}`), "las personas", avisos),
    intenta(rest<FilaObs[]>(`observaciones_expediente?select=id,fecha,fase,texto,autor&comunidad_id=eq.${comunidadId}&order=fecha.desc.nullslast&limit=60`), "el histórico", avisos),
  ]);

  // La hoja que manda: la ultima creada. (Aun no hay varias por comunidad casi
  // nunca, pero cuando las haya, la reciente es la viva.)
  const hoja = hojas[0] ?? null;
  const firmada = hoja?.estado === "devuelta_firmada";

  // ---- los tres documentos, con sus versiones
  const versiones = [...(hoja?.versiones_hoja ?? [])].sort((a, b) => b.numero_version - a.numero_version);
  const comoVersion = (v: FilaVersion, conPdf: boolean) => ({
    version: `v${v.numero_version}`,
    fecha: v.fecha_enviada ?? v.fecha_generada ?? "",
    nota: v.motivo_cambio ?? (v.fecha_enviada ? "enviada" : "generada, sin enviar"),
    href: conPdf && v.url_pdf_hoja ? v.url_pdf_hoja : null,
  });
  const documentos: FichaComercial["documentos"] = [
    { rotulo: "Informe de viabilidad", versiones: [], falta: "no hay ninguno guardado" },
    {
      rotulo: "Presupuesto",
      versiones: [],
      falta: "va dentro de la hoja; el PDF aparte no está guardado",
    },
    {
      rotulo: "Hoja de encargo",
      versiones: versiones.filter((v) => v.fecha_generada || v.fecha_enviada).map((v) => comoVersion(v, true)),
      falta: "sin hoja",
    },
  ];

  // ---- los cobros: los hitos cuelgan de cada LINEA, asi que se suman por hito
  const porHito = new Map<string, { nombre: string; orden: number; importe: number; cobrado: string | null; vence: string | null }>();
  for (const l of hoja?.lineas_facturacion ?? [])
    for (const h of l.hitos_cobro ?? []) {
      const k = h.hito;
      const previo = porHito.get(k);
      porHito.set(k, {
        nombre: HITO[k] ?? k,
        orden: h.orden ?? 99,
        importe: (previo?.importe ?? 0) + num(h.importe),
        cobrado: previo?.cobrado ?? h.fecha_cobro,
        vence: previo?.vence ?? h.fecha_vencimiento,
      });
    }
  const hitos: HitoCobro[] = [...porHito.values()]
    .sort((a, b) => a.orden - b.orden)
    .map((h) => ({ nombre: h.nombre, importe: h.importe, comision: 0, previsto: h.vence, cobrado: h.cobrado }));

  const precio = (hoja?.lineas_facturacion ?? []).reduce((s, l) => s + num(l.importe), 0) || null;

  return {
    id: comunidad.id,
    nombre: comunidad.nombre,
    empresa: hoja?.quien_lo_trae ?? null,
    persona: hoja?.comercial_interno ? `comercial: ${hoja.comercial_interno}` : null,
    que: hoja?.descripcion ?? null,
    precio,
    cobra: null, // no esta modelado todavia
    firmada: firmada ? (hoja?.fecha_firma ?? versiones[0]?.fecha_enviada ?? hoja?.fecha_creacion ?? null) : null,
    pasos: [], // hitos_oportunidad casi no tiene datos: mejor hueco que mentira
    documentos,
    tresPresupuestos: null,
    financiacion: null,
    tresD: null,
    junta: null,
    personas: personas.map((p) => ({
      nombre: p.nombre,
      papel: p.rol ?? "sin rol",
      telefono: p.telefono,
      email: p.email,
      porQue: p.notas,
    })),
    edificio: {
      ...EDIFICIO_VACIO,
      viviendas: comunidad.num_viviendas,
      anio: comunidad.anio_construccion,
    },
    olfato: [],
    administrador: null,
    hitos,
    // OJO: esto NO es el diario comercial. Son las observaciones del expediente
    // (licencia y obra, sobre todo). Se ensenan como historico, etiquetadas.
    diario: observaciones.map((o) => ({
      id: o.id,
      fecha: o.fecha ?? "",
      tipo: o.fase ?? "histórico",
      con: o.autor,
      texto: o.texto,
      revisar: false,
      href: null,
    })),
    extracto: null,
    avisos,
  };
}

/** Comunidades cuyo nombre o direccion se parece a lo buscado. Solo lectura. */
export async function buscarComunidades(q: string, tope = 20) {
  const t = q.trim();
  if (t.length < 3) return [];
  const patron = `*${t.replace(/[,()*]/g, " ")}*`;
  return rest<{ id: string; nombre: string; municipio: string | null }[]>(
    `comunidades?select=id,nombre,municipio&or=(nombre.ilike.${encodeURIComponent(patron)},direccion.ilike.${encodeURIComponent(patron)})&order=nombre&limit=${tope}`,
  );
}
