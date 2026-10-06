// lib/anexoGuardado.ts
//
// EL ANEXO SE ADJUNTA SOLO (Monica, 6-oct-2026): "deberia salir por defecto
// cuando se crea una viabilidad, que no haga falta darle al boton: se adjunta y
// ya esta, son datos que tenemos".
//
// Se hace dos veces: al crear la viabilidad (sin coste de obra todavia) y al
// enviarla al comercial, que es cuando Alex ya ha puesto el PEM y las ayudas
// pueden llevar su estimacion. Si Catastro no responde, la viabilidad sigue
// adelante igual: el anexo es un anadido, nunca un freno.

import "server-only";
import { anexoDeOportunidad } from "./anexoEdificio";
import { pdfDelAnexo } from "./pdf/AnexoDoc";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const ALMACEN = "documentos-comerciales";

/** Genera el anexo de una viabilidad y lo deja guardado junto a ella. */
export async function guardarAnexo(viabilidadId: string): Promise<boolean> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/viabilidades?select=oportunidad_id,pem_estimado,obra:viabilidad_conceptos(importe)&obra.grupo=eq.obra&id=eq.${viabilidadId}`,
    { headers: CAB, cache: "no-store" },
  );
  if (!r.ok) return false;
  const [v] = (await r.json()) as { oportunidad_id: string | null; pem_estimado: number | null; obra: { importe: number | null }[] }[];
  if (!v?.oportunidad_id) return false;
  // El coste de obra son las lineas de Alex (una o varias); la cifra suelta de
  // antes solo vale si aun no hay lineas.
  const pem = v.obra.reduce((s, l) => s + (Number(l.importe) || 0), 0) || v.pem_estimado;
  const anexo = await anexoDeOportunidad(v.oportunidad_id, { pem });
  if (!anexo) return false;
  const pdf = await pdfDelAnexo(anexo);
  const ruta = `anexos/${viabilidadId}/anexo-ficha-edificio.pdf`;
  const sube = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/pdf", "x-upsert": "true" },
    body: pdf as unknown as BodyInit,
  });
  if (!sube.ok) throw new Error(`No se pudo guardar el anexo: ${sube.status} ${await sube.text()}`);
  await fetch(`${URL_BASE}/rest/v1/viabilidades?id=eq.${viabilidadId}`, {
    method: "PATCH",
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ url_anexo: `almacen:${ALMACEN}/${ruta}`, anexo_generado_en: new Date().toISOString() }),
  });
  return true;
}

/** Lo mismo, sin que un fallo pare nada: se apunta en el registro y ya. */
export async function intentarAnexo(viabilidadId: string): Promise<void> {
  try {
    await guardarAnexo(viabilidadId);
  } catch (e) {
    console.error(`[anexo] viabilidad ${viabilidadId}:`, (e as Error).message);
  }
}

/** El PDF guardado de una viabilidad, para servirlo. */
export async function anexoGuardado(viabilidadId: string): Promise<{ pdf: ArrayBuffer; oportunidadId: string | null } | null> {
  const r = await fetch(`${URL_BASE}/rest/v1/viabilidades?select=oportunidad_id,url_anexo&id=eq.${viabilidadId}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) return null;
  const [v] = (await r.json()) as { oportunidad_id: string | null; url_anexo: string | null }[];
  if (!v?.url_anexo?.startsWith("almacen:")) return null;
  const f = await fetch(`${URL_BASE}/storage/v1/object/${v.url_anexo.slice("almacen:".length)}`, { headers: CAB, cache: "no-store" });
  if (!f.ok) return null;
  return { pdf: await f.arrayBuffer(), oportunidadId: v.oportunidad_id };
}
