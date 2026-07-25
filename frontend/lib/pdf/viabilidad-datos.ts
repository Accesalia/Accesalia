// lib/pdf/viabilidad-datos.ts
//
// Reune TODOS los datos para generar el PDF de viabilidad (cabecera pescada +
// textos + tabla de precios). Solo servidor.

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

export type LineaPrecio = { nombre: string; base: number; iva: number; total: number; porcentaje: number | null };

export type DatosViabilidadPdf = {
  numero: string | null;
  version: number;
  fechaVisita: string | null;
  arquitecto: { nombre: string; colegiado: string | null } | null;
  comunidad: { nombre: string; direccion: string };
  tipo: string | null;
  objeto: string | null;
  descripcion: string | null;
  conclusion: string | null;
  viable: boolean | null;
  costeObra: { base: number; iva: number; total: number } | null;
  lineas: LineaPrecio[];
  total: number;
};

function totalLinea(base: number, iva: number): number {
  return Math.round(base * (1 + iva / 100) * 100) / 100;
}

export async function datosPdfViabilidad(viabId: string): Promise<DatosViabilidadPdf | null> {
  const rows = await rest<
    {
      numero: string | null; version: number; fecha_visita: string | null;
      objeto: string | null; descripcion_intervenciones: string | null; conclusion: string | null;
      viable: boolean | null; coste_obra_base: number | null; coste_obra_iva_porcentaje: number | null;
      arquitecto_id: string | null; oportunidad_id: string | null;
      viabilidad_conceptos: { importe: number | null; iva_porcentaje: number | null; porcentaje: number | null; seleccionado: boolean; bloques: { nombre: string } | null }[];
    }[]
  >(
    `viabilidades?select=numero,version,fecha_visita,objeto,descripcion_intervenciones,conclusion,viable,coste_obra_base,coste_obra_iva_porcentaje,arquitecto_id,oportunidad_id,viabilidad_conceptos(importe,iva_porcentaje,porcentaje,seleccionado,bloques(nombre))&id=eq.${viabId}&limit=1`,
  );
  const v = rows[0];
  if (!v) return null;

  const [arqRows, opRows] = await Promise.all([
    v.arquitecto_id
      ? rest<{ nombre: string; numero_colegiado: string | null }[]>(`tecnicos?select=nombre,numero_colegiado&id=eq.${v.arquitecto_id}&limit=1`)
      : Promise.resolve([]),
    v.oportunidad_id
      ? rest<{ comunidad_id: string | null; negociacion_oportunidad: { que_vendemos: string | null }[] }[]>(
          `oportunidades?select=comunidad_id,negociacion_oportunidad(que_vendemos,creado_en)&id=eq.${v.oportunidad_id}&limit=1&negociacion_oportunidad.order=creado_en.desc&negociacion_oportunidad.limit=1`,
        )
      : Promise.resolve([]),
  ]);
  const comId = opRows[0]?.comunidad_id ?? null;
  const comRows = comId
    ? await rest<{ nombre: string; direccion: string | null; cp: string | null; municipio: string | null }[]>(`comunidades?select=nombre,direccion,cp,municipio&id=eq.${comId}&limit=1`)
    : [];
  const com = comRows[0];

  const costeObra =
    v.coste_obra_base != null
      ? { base: v.coste_obra_base, iva: v.coste_obra_iva_porcentaje ?? 0, total: totalLinea(v.coste_obra_base, v.coste_obra_iva_porcentaje ?? 0) }
      : null;

  const lineas: LineaPrecio[] = (v.viabilidad_conceptos ?? [])
    .filter((c) => c.seleccionado && c.importe != null)
    .map((c) => ({
      nombre: c.bloques?.nombre ?? "Concepto",
      base: c.importe!,
      iva: c.iva_porcentaje ?? 0,
      total: totalLinea(c.importe!, c.iva_porcentaje ?? 0),
      porcentaje: c.porcentaje,
    }));

  const total = (costeObra?.total ?? 0) + lineas.reduce((s, l) => s + l.total, 0);

  return {
    numero: v.numero,
    version: v.version,
    fechaVisita: v.fecha_visita,
    arquitecto: arqRows[0] ? { nombre: arqRows[0].nombre, colegiado: arqRows[0].numero_colegiado } : null,
    comunidad: { nombre: com?.nombre ?? "—", direccion: [com?.direccion, [com?.cp, com?.municipio].filter(Boolean).join(" ")].filter(Boolean).join(", ") },
    tipo: opRows[0]?.negociacion_oportunidad?.[0]?.que_vendemos ?? null,
    objeto: v.objeto,
    descripcion: v.descripcion_intervenciones,
    conclusion: v.conclusion,
    viable: v.viable,
    costeObra,
    lineas,
    total,
  };
}
