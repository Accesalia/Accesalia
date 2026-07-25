// lib/cockpit.ts
//
// Datos del COCKPIT COMERCIAL de una comunidad (modelo oportunidad-centrico).
// Cada OPORTUNIDAD (proceso comercial) = un "encargo": su pipeline (hitos), su
// oferta (negociacion), su viabilidad, sus hojas y su 3D. Solo servidor.

import "server-only";
import { comunidadPorId } from "./comunidades";
import {
  resumenesComunidad,
  interaccionesDeComunidad,
  catalogoHitos,
  type Interaccion,
  type ResumenIA,
  type HitoOportunidad,
  type HitoCatalogo,
} from "./comercial";

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

export type Negociacion = { que_vendemos: string | null; precio: number | null; alcance: string | null };
export type ViabilidadRow = { id: string; numero: string | null; version: number; vigente: boolean; viable: boolean | null };
export type HojaRow = { id: string; numero_hoja: string | null; estado: string };
export type Modelo3dRow = { id: string; tipo_3d: string; de_catalogo: boolean; estado: string; modelo_escalera_id: string | null };
export type JuntaRow = { fecha_junta: string | null; celebrada: boolean };

export type OportunidadCockpit = {
  id: string;
  estado: string; // activa | latente
  reactivar_nota: string | null;
  reactivar_fecha: string | null;
  creado_en: string;
  hitos_oportunidad: HitoOportunidad[];
  negociacion_oportunidad: Negociacion[]; // vigente = [0]
  viabilidades: ViabilidadRow[];
  hojas_encargo: HojaRow[];
  modelos_3d_venta: Modelo3dRow[];
  juntas: JuntaRow[];
};

export type Recordatorio = { id: string; texto: string; fecha_limite: string | null; estado: string };

export type Cockpit = {
  comunidad: Awaited<ReturnType<typeof comunidadPorId>>;
  oportunidades: OportunidadCockpit[];
  catalogoHitos: HitoCatalogo[];
  resumenComercial: ResumenIA | null;
  diario: Interaccion[];
  recordatorios: Recordatorio[];
};

const SEL_OP =
  "id,estado,reactivar_nota,reactivar_fecha,creado_en," +
  "hitos_oportunidad(id,hito,aplicable,estado,fecha,enlace_url,responsable_id)," +
  "negociacion_oportunidad(que_vendemos,precio,alcance,creado_en)," +
  "viabilidades(id,numero,version,vigente,viable)," +
  "hojas_encargo(id,numero_hoja,estado)," +
  "modelos_3d_venta(id,tipo_3d,de_catalogo,estado,modelo_escalera_id)," +
  "juntas(fecha_junta,celebrada)";

/** Todo lo que el cockpit necesita de una comunidad (oportunidad-centrico). */
export async function cockpitComunidad(id: string): Promise<Cockpit | null> {
  const comunidad = await comunidadPorId(id);
  if (!comunidad) return null;

  const [oportunidades, catalogo, resumenes, diario] = await Promise.all([
    rest<OportunidadCockpit[]>(
      `oportunidades?select=${SEL_OP}&comunidad_id=eq.${id}` +
        `&order=creado_en.desc&negociacion_oportunidad.order=creado_en.desc&negociacion_oportunidad.limit=1`,
    ),
    catalogoHitos(),
    resumenesComunidad(id),
    interaccionesDeComunidad(id, 15),
  ]);

  const oportIds = oportunidades.map((o) => o.id);
  const recordatorios = oportIds.length
    ? await rest<Recordatorio[]>(
        `tareas_seguimiento?select=id,texto,fecha_limite,estado&oportunidad_id=in.(${oportIds.join(
          ",",
        )})&estado=eq.abierta&order=fecha_limite.asc.nullslast`,
      )
    : [];

  const resumenComercial = resumenes.find((r) => r.fase === "comercial") ?? null;

  return { comunidad, oportunidades, catalogoHitos: catalogo, resumenComercial, diario, recordatorios };
}
