// lib/manias.ts
//
// MANIAS DETECTADAS (Monica, 10-oct-2026): la tabla manias_organismos, para
// consultar desde Documentacion de referencia. Se lee entera (son cientos, no
// miles) y se filtra en el servidor por municipio, entidad y persona.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export type Mania = {
  id: string;
  municipio: string | null;
  entidad: string | null;
  detalle: string | null;
  tecnico: string | null;
  mania: string;
  cita: string | null;
  fecha: string | null;
  oportunidad: { id: string; codigo: string | null; nombre: string | null } | null;
};

type Fila = {
  id: string;
  entidad: string | null;
  departamento: string | null;
  tecnico: string | null;
  mania: string;
  cita: string | null;
  fecha: string | null;
  municipio: { nombre: string } | null;
  oportunidad: { id: string; codigo: string | null; nombre: string | null } | null;
};

export async function manias(): Promise<Mania[]> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/manias_organismos?select=id,entidad,departamento,tecnico,mania,cita,fecha,` +
      `municipio:municipio_id(nombre),oportunidad:oportunidad_id(id,codigo,nombre)&order=fecha.desc.nullslast`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return ((await r.json()) as Fila[]).map((f) => ({
    id: f.id,
    municipio: f.municipio?.nombre ?? null,
    entidad: f.entidad,
    detalle: f.departamento,
    tecnico: f.tecnico,
    mania: f.mania,
    cita: f.cita,
    fecha: f.fecha,
    oportunidad: f.oportunidad,
  }));
}
