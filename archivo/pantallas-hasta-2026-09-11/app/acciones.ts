"use server";

// Server actions: orquestan el alta de una convocatoria y su pipeline de IA.
// Todo corre en el SERVIDOR con la clave secreta (nunca en el navegador).

import { redirect } from "next/navigation";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

function cabeceras(extra: Record<string, string> = {}) {
  return {
    apikey: SECRETO,
    Authorization: `Bearer ${SECRETO}`,
    ...extra,
  };
}

/**
 * Alta de convocatoria + arranque del prompt 1 (asincrono):
 *  1. inserta la fila en convocatorias
 *  2. sube el PDF al bucket 'convocatorias'
 *  3. llama a la edge extraer-convocatoria (responde 202, trabaja en 2o plano)
 *  4. redirige al visor, que mostrara 'procesando' y hara polling
 */
export async function crearConvocatoriaYExtraer(formData: FormData) {
  const archivo = formData.get("pdf") as File | null;

  if (!archivo || archivo.size === 0) {
    throw new Error("Falta el PDF de la convocatoria.");
  }

  // 1. Insertar convocatoria con placeholders: la IA rellenara entidad/plan/anio
  //    (y fechas) como datos limpios tras leer el PDF. anio=0 = "por identificar".
  const insRes = await fetch(`${URL_BASE}/rest/v1/convocatorias`, {
    method: "POST",
    headers: cabeceras({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ entidad: "Identificando…", plan: "Nueva convocatoria", anio: 0 }),
  });
  if (!insRes.ok) throw new Error(`No se pudo crear la convocatoria: ${await insRes.text()}`);
  const [conv] = (await insRes.json()) as { id: string }[];
  const convId = conv.id;

  // 2. Subir el PDF al bucket.
  const ruta = `${convId}/convocatoria.pdf`;
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const upRes = await fetch(`${URL_BASE}/storage/v1/object/convocatorias/${ruta}`, {
    method: "POST",
    headers: cabeceras({ "Content-Type": "application/pdf", "x-upsert": "true" }),
    body: bytes,
  });
  if (!upRes.ok) throw new Error(`No se pudo subir el PDF: ${await upRes.text()}`);

  // 3. Arrancar la extraccion (prompt 1, async -> 202).
  const edgeRes = await fetch(`${URL_BASE}/functions/v1/extraer-convocatoria`, {
    method: "POST",
    headers: cabeceras({ "Content-Type": "application/json" }),
    body: JSON.stringify({ convocatoria_id: convId, pdf_storage_path: ruta }),
  });
  if (!edgeRes.ok && edgeRes.status !== 202) {
    throw new Error(`No se pudo iniciar la extraccion: ${await edgeRes.text()}`);
  }

  // 4. Al visor (mostrara 'procesando').
  redirect(`/convocatoria/${convId}`);
}

/** Dispara el prompt 2 (modelar casillas) sobre una convocatoria ya extraida. */
export async function modelarCasillas(convocatoriaId: string) {
  const res = await fetch(`${URL_BASE}/functions/v1/modelar-casillas`, {
    method: "POST",
    headers: cabeceras({ "Content-Type": "application/json" }),
    body: JSON.stringify({ convocatoria_id: convocatoriaId, persistir: true }),
  });
  if (!res.ok) throw new Error(`Fallo al modelar casillas: ${await res.text()}`);
}
