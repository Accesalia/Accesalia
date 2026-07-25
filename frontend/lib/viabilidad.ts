// lib/viabilidad.ts
//
// Datos del formulario de VIABILIDAD. Solo servidor (clave secreta).
// La tabla de precios reutiliza el catalogo `bloques` (via lib/hojas).

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

export type ViabilidadConcepto = {
  bloque_id: string | null;
  importe: number | null;
  iva_porcentaje: number | null;
  porcentaje: number | null;
  gratis: boolean;
  seleccionado: boolean;
};

export type ViabilidadFull = {
  id: string;
  numero: string | null;
  version: number;
  arquitecto_id: string | null;
  fecha_visita: string | null;
  objeto: string | null;
  descripcion_intervenciones: string | null;
  conclusion: string | null;
  viable: boolean | null;
  coste_obra_base: number | null;
  coste_obra_iva_porcentaje: number | null;
  oportunidad_id: string | null;
  conceptos: ViabilidadConcepto[];
};

export type Arquitecto = { id: string; nombre: string; numero_colegiado: string | null };

/** Una viabilidad con sus conceptos + el contexto de comunidad. */
export async function viabilidadPorId(
  id: string,
): Promise<{ viab: ViabilidadFull; comunidadId: string; comunidadNombre: string } | null> {
  const rows = await rest<(Omit<ViabilidadFull, "conceptos"> & { viabilidad_conceptos: ViabilidadConcepto[] })[]>(
    `viabilidades?select=id,numero,version,arquitecto_id,fecha_visita,objeto,descripcion_intervenciones,conclusion,viable,coste_obra_base,coste_obra_iva_porcentaje,oportunidad_id,viabilidad_conceptos(bloque_id,importe,iva_porcentaje,porcentaje,gratis,seleccionado)&id=eq.${id}&limit=1`,
  );
  const v = rows[0];
  if (!v) return null;
  const { viabilidad_conceptos, ...rest0 } = v;

  const op = v.oportunidad_id
    ? await rest<{ comunidad_id: string | null }[]>(
        `oportunidades?select=comunidad_id&id=eq.${v.oportunidad_id}&limit=1`,
      )
    : [];
  const comunidadId = op[0]?.comunidad_id ?? "";
  const com = comunidadId
    ? await rest<{ nombre: string }[]>(`comunidades?select=nombre&id=eq.${comunidadId}&limit=1`)
    : [];

  return {
    viab: { ...rest0, conceptos: viabilidad_conceptos ?? [] },
    comunidadId,
    comunidadNombre: com[0]?.nombre ?? "",
  };
}

/** Arquitectos (para el selector de firmante; por defecto Daniel). */
export function arquitectos(): Promise<Arquitecto[]> {
  return rest<Arquitecto[]>(
    "tecnicos?select=id,nombre,numero_colegiado&rol=eq.arquitecto&activo=eq.true&order=nombre.asc",
  );
}
