// lib/catalogo.ts
//
// Catalogo de modelos 3D GENERICOS de venta (tabla modelos_escalera). Acceso SOLO
// de servidor con la clave secreta (mismo patron que lib/datos.ts). Los assets
// viven en el bucket PUBLICO catalogo-venta con rutas derivables del codigo, asi
// que las URLs se montan aqui (en el servidor) y se pasan ya listas al navegador.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const BUCKET = "catalogo-venta";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

export type ModeloCatalogo = {
  id: string;
  codigo: string;
  nombre: string;
  notas: string | null;
  orden: number | null;
  activo: boolean;
  tiene_video: boolean;
  tiene_plano: boolean;
  n_renders: number;
};

const SELECT =
  "id,codigo,nombre,notas,orden,activo,tiene_video,tiene_plano,n_renders";

/** URL publica de un asset del catalogo: catalogo-venta/{codigo}/{path}. */
export function assetUrl(codigo: string, path: string): string {
  return `${URL_BASE}/storage/v1/object/public/${BUCKET}/${codigo}/${path}`;
}

/** URLs de los renders r01..rNN (webp). */
export function urlsRenders(codigo: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    assetUrl(codigo, `renders/r${String(i + 1).padStart(2, "0")}.webp`),
  );
}

/** Todos los tipos activos, en orden de presentacion. */
export async function listarModelos(): Promise<ModeloCatalogo[]> {
  return rest<ModeloCatalogo[]>(
    `modelos_escalera?select=${SELECT}&activo=eq.true&order=orden.asc`,
  );
}

/** Un tipo por codigo (AT1..AT16). */
export async function obtenerModelo(
  codigo: string,
): Promise<ModeloCatalogo | null> {
  const filas = await rest<ModeloCatalogo[]>(
    `modelos_escalera?select=${SELECT}&codigo=eq.${encodeURIComponent(codigo)}`,
  );
  return filas[0] ?? null;
}
