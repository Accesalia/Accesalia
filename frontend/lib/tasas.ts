// lib/tasas.ts
//
// Lectura de reglas_tasas y tramites para la pantalla "Tasas de ayuntamiento"
// (Documentacion de referencia). Solo lo VIGENTE (vigente_hasta nulo).

import "server-only";
import type { Regla } from "./calculoTasas";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(consulta: string): Promise<T[]> {
  const r = await fetch(`${URL_BASE}/rest/v1/${consulta}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as T[];
}

export type Tramite = {
  id: string;
  organismo: string;
  via: "licencia" | "declaracion_responsable";
  canal: "directo" | "ecu";
  nombre: string;
  dondeSePresenta: string | null;
  quienFirma: string | null;
  plazoTipico: string | null;
  habilitaInicio: string | null;
  requerimientos: string | null;
  avisos: string | null;
  contacto: string | null;
  normativa: string | null;
  evidencia: string | null;
  validada: boolean;
  tipos: string[];
  pasos: string[];
  documentos: { nombre: string; obligatorio: boolean }[];
};

/** Los municipios que tienen algo cargado, con su nombre de Catastro. */
export async function municipiosConTasas(): Promise<{ id: string; nombre: string }[]> {
  const filas = await leer<{ municipio: { id: string; nombre: string } }>(
    "reglas_tasas?select=municipio:municipio_id(id,nombre)&vigente_hasta=is.null",
  );
  const unicos = new Map(filas.map((f) => [f.municipio.id, f.municipio]));
  return Array.from(unicos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** El arbol de tipos de proyecto: para cada clave, ella y sus antepasados. */
export async function arbolTipos(): Promise<{ clave: string; nombre: string; padre: string | null }[]> {
  const filas = await leer<{ id: string; clave: string; nombre: string; parent_id: string | null }>(
    "tipos_proyecto?select=id,clave,nombre,parent_id",
  );
  const porId = new Map(filas.map((f) => [f.id, f.clave]));
  return filas.map((f) => ({ clave: f.clave, nombre: f.nombre, padre: f.parent_id ? porId.get(f.parent_id) ?? null : null }));
}

type FilaRegla = {
  id: string;
  concepto: string;
  subtipo: string | null;
  via: Regla["via"];
  canal: Regla["canal"];
  metodo: string;
  base: string;
  porcentaje: number | null;
  importe_fijo: number | null;
  importe_unidad: number | null;
  minimo: number | null;
  maximo: number | null;
  tramos: Regla["tramos"];
  formula_texto: string | null;
  bonificacion_pct: number | null;
  bonificacion_alcance: string | null;
  bonificacion_forma: string | null;
  bonificacion_requisitos: string | null;
  bonificacion_plazo: string | null;
  requiere_descargo: boolean;
  liquida: string | null;
  momento: string | null;
  validez_dias: number | null;
  regulariza_al_final: boolean | null;
  aviso_vecinos: string | null;
  notas: string | null;
  normativa: string | null;
  evidencia: string | null;
  validada: boolean;
  organismo: { nombre: string } | null;
  tipos: { tipo: { clave: string } | null }[];
};

const num = (x: unknown) => (x === null || x === undefined ? null : Number(x));

export async function reglasDe(municipioId: string): Promise<Regla[]> {
  const filas = await leer<FilaRegla>(
    `reglas_tasas?select=*,organismo:organismo_id(nombre),tipos:reglas_tasas_tipos(tipo:tipo_proyecto_id(clave))` +
      `&municipio_id=eq.${encodeURIComponent(municipioId)}&vigente_hasta=is.null&order=concepto`,
  );
  return filas.map((f) => ({
    id: f.id,
    organismo: f.organismo?.nombre ?? "",
    concepto: f.concepto,
    subtipo: f.subtipo,
    via: f.via,
    canal: f.canal,
    metodo: f.metodo,
    base: f.base,
    porcentaje: num(f.porcentaje),
    importeFijo: num(f.importe_fijo),
    importeUnidad: num(f.importe_unidad),
    minimo: num(f.minimo),
    maximo: num(f.maximo),
    tramos: f.tramos,
    formula: f.formula_texto,
    bonificacionPct: num(f.bonificacion_pct),
    bonificacionAlcance: f.bonificacion_alcance,
    bonificacionForma: f.bonificacion_forma,
    bonificacionRequisitos: f.bonificacion_requisitos,
    bonificacionPlazo: f.bonificacion_plazo,
    requiereDescargo: f.requiere_descargo,
    liquida: f.liquida,
    momento: f.momento,
    validezDias: f.validez_dias,
    regulariza: f.regulariza_al_final,
    aviso: f.aviso_vecinos,
    notas: f.notas,
    normativa: f.normativa,
    evidencia: f.evidencia,
    validada: f.validada,
    tipos: f.tipos.map((t) => t.tipo?.clave).filter((x): x is string => !!x),
  }));
}

export async function tramitesDe(municipioId: string): Promise<Tramite[]> {
  type Fila = {
    id: string;
    via: Tramite["via"];
    canal: Tramite["canal"];
    nombre: string;
    donde_se_presenta: string | null;
    quien_firma: string | null;
    plazo_tipico: string | null;
    habilita_inicio: string | null;
    requerimientos_tipicos: string | null;
    avisos: string | null;
    contacto_estado: string | null;
    normativa: string | null;
    evidencia: string | null;
    validada: boolean;
    organismo: { nombre: string } | null;
    tipos: { tipo: { clave: string } | null }[];
    pasos: { orden: number; texto: string }[];
    documentos: { orden: number; nombre: string; obligatorio: boolean }[];
  };
  const filas = await leer<Fila>(
    `tramites?select=*,organismo:organismo_id(nombre),tipos:tramites_tipos(tipo:tipo_proyecto_id(clave)),` +
      `pasos:tramite_pasos(orden,texto),documentos:tramite_documentos(orden,nombre,obligatorio)` +
      `&municipio_id=eq.${encodeURIComponent(municipioId)}&vigente_hasta=is.null&order=via,nombre`,
  );
  return filas.map((f) => ({
    id: f.id,
    organismo: f.organismo?.nombre ?? "",
    via: f.via,
    canal: f.canal,
    nombre: f.nombre,
    dondeSePresenta: f.donde_se_presenta,
    quienFirma: f.quien_firma,
    plazoTipico: f.plazo_tipico,
    habilitaInicio: f.habilita_inicio,
    requerimientos: f.requerimientos_tipicos,
    avisos: f.avisos,
    contacto: f.contacto_estado,
    normativa: f.normativa,
    evidencia: f.evidencia,
    validada: f.validada,
    tipos: f.tipos.map((t) => t.tipo?.clave).filter((x): x is string => !!x),
    pasos: [...f.pasos].sort((a, b) => a.orden - b.orden).map((p) => p.texto),
    documentos: [...f.documentos].sort((a, b) => a.orden - b.orden).map((d) => ({ nombre: d.nombre, obligatorio: d.obligatorio })),
  }));
}
