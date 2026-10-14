// lib/revisionOferta.ts
//
// REVISION DE OFERTAS (Monica, 14-oct-2026). Antes de mandar la oferta a la
// comunidad, alguien con la funcion `revision_ofertas` (hoy Daniel y Monica, "no
// por ser direccion") le da el ok al PAQUETE: hoja(s) + presupuesto (siempre) +
// viabilidad (si la hay). Es paquete porque "si cambia un precio en la hoja, el
// presupuesto y la viabilidad tambien lo reflejan".
//
//   - Quien revisa SOLO da el ok o pide cambios, con comentario: "la hoja la toca
//     solo el comercial, SOLO SUS MANOS".
//   - Cada envio guarda la VERSION EXACTA de cada documento. OK VIGENTE = el
//     ultimo envio esta en ok y nada ha cambiado despues (otra version de una
//     hoja, una hoja nueva, la viabilidad regenerada, el presupuesto rehecho o
//     uno nuevo). Si algo cambia, la escalera vuelve sola a "falta el ok".
//   - El bucle (piden modificar la oferta) es otro envio, el siguiente numero.
//   - Los estados de la hoja lo reflejan, para quien ya los lee:
//     pendiente_firma_daniel = pendiente del ok; firmada_daniel = "Ok oferta
//     comercial". Si piden cambios, vuelve a generada (borrador).

import "server-only";
import { nombreDeOpp } from "./direccionOpp";
import { enviarCorreo } from "./correo";
import { quienLlevaLaOpp, quienTieneLaFuncion } from "./quienLleva";
import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const APP = process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app";
export const FUNCION_REVISION = "revision_ofertas";

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);

/** ¿Puede revisar ofertas? Por su FUNCION, no por ser direccion. */
export function puedeRevisar(yo: Yo): boolean {
  return yo.funciones.some((f) => f.clave === FUNCION_REVISION);
}

// ------------------------------------------------------------ el paquete

export type DocPaquete =
  | { tipo: "hoja"; hojaId: string; versionId: string; numero: string | null; version: number }
  | { tipo: "viabilidad"; id: string; numero: string | null; version: number }
  | { tipo: "presupuesto"; id: string; codigo: string | null; generadoEn: string };

/** Lo que llevaria HOY el paquete de una opp: la ultima version generada de cada
 *  hoja viva (no firmada ni anulada), la viabilidad vigente con PDF (si la hay) y
 *  el ultimo presupuesto generado. */
export async function paqueteActual(oppId: string): Promise<DocPaquete[]> {
  const [hojas, viabs, pptos] = await Promise.all([
    pedir<{ id: string; numero_hoja: string | null; estado: string; versiones: { id: string; numero_version: number; url_pdf_hoja: string | null }[] }[]>(
      `hojas_encargo?select=id,numero_hoja,estado,versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,url_pdf_hoja)` +
        `&oportunidad_id=eq.${oppId}&estado=not.in.(anulada,devuelta_firmada,archivada,rechazada)`,
    ),
    pedir<{ id: string; numero: string | null; version: number }[]>(
      `viabilidades?select=id,numero,version&oportunidad_id=eq.${oppId}&url_pdf=not.is.null&vigente=is.true&order=rematada_en.desc.nullslast&limit=1`,
    ),
    pedir<{ id: string; codigo: string | null; generado_en: string }[]>(
      `presupuestos?select=id,codigo,generado_en&oportunidad_id=eq.${oppId}&url_pdf=not.is.null&generado_en=not.is.null&estado=not.in.(anulado,borrador)&order=generado_en.desc&limit=1`,
    ),
  ]);
  const docs: DocPaquete[] = [];
  for (const h of hojas) {
    const v = h.versiones.filter((x) => x.url_pdf_hoja).sort((a, b) => b.numero_version - a.numero_version)[0];
    if (v) docs.push({ tipo: "hoja", hojaId: h.id, versionId: v.id, numero: h.numero_hoja, version: v.numero_version });
  }
  for (const v of viabs) docs.push({ tipo: "viabilidad", id: v.id, numero: v.numero, version: v.version });
  for (const p of pptos) docs.push({ tipo: "presupuesto", id: p.id, codigo: p.codigo, generadoEn: p.generado_en });
  return docs;
}

/** Mismo paquete = mismas versiones de todo. */
const firma = (d: DocPaquete) =>
  d.tipo === "hoja" ? `h:${d.versionId}` : d.tipo === "viabilidad" ? `v:${d.id}:${d.version}` : `p:${d.id}:${Date.parse(d.generadoEn)}`;

// ------------------------------------------------------------ el estado

export type Revision = {
  id: string;
  numero: number;
  estado: "pendiente" | "ok" | "cambios" | "superada";
  enviadaEn: string;
  enviadaPor: string | null;
  nota: string | null;
  resueltaEn: string | null;
  resueltaPor: string | null;
  comentario: string | null;
  documentos: DocPaquete[];
};
export type EstadoRevision = {
  /** El ultimo envio, si lo hay. */
  ultima: Revision | null;
  /** Hay ok y NADA del paquete ha cambiado despues: se puede enviar a la comunidad. */
  okVigente: boolean;
  /** Habia ok, pero algo cambio despues: hay que volver a pedirlo. */
  okCaducado: boolean;
};

type FilaRev = {
  id: string; numero: number; estado: Revision["estado"]; enviada_en: string; nota: string | null; resuelta_en: string | null; comentario: string | null;
  por: { nombre: string } | null; resuelve: { nombre: string } | null;
  docs: { version_hoja_id: string | null; viabilidad_id: string | null; viabilidad_version: number | null; presupuesto_id: string | null; presupuesto_generado_en: string | null;
          v: { hoja_encargo_id: string; numero_version: number; hoja: { numero_hoja: string | null } | null } | null;
          viab: { numero: string | null } | null; ppto: { codigo: string | null } | null }[];
};
const SEL_REV =
  "id,numero,estado,enviada_en,nota,resuelta_en,comentario,por:enviada_por(nombre),resuelve:resuelta_por(nombre)," +
  "docs:revisiones_oferta_documentos(version_hoja_id,viabilidad_id,viabilidad_version,presupuesto_id,presupuesto_generado_en," +
  "v:version_hoja_id(hoja_encargo_id,numero_version,hoja:hoja_encargo_id(numero_hoja)),viab:viabilidad_id(numero),ppto:presupuesto_id(codigo))";
const aRevision = (f: FilaRev): Revision => ({
  id: f.id,
  numero: f.numero,
  estado: f.estado,
  enviadaEn: f.enviada_en,
  enviadaPor: f.por?.nombre ?? null,
  nota: f.nota,
  resueltaEn: f.resuelta_en,
  resueltaPor: f.resuelve?.nombre ?? null,
  comentario: f.comentario,
  documentos: f.docs.map((d): DocPaquete =>
    d.version_hoja_id
      ? { tipo: "hoja", hojaId: d.v?.hoja_encargo_id ?? "", versionId: d.version_hoja_id, numero: d.v?.hoja?.numero_hoja ?? null, version: d.v?.numero_version ?? 0 }
      : d.viabilidad_id
        ? { tipo: "viabilidad", id: d.viabilidad_id, numero: d.viab?.numero ?? null, version: d.viabilidad_version ?? 0 }
        : { tipo: "presupuesto", id: d.presupuesto_id ?? "", codigo: d.ppto?.codigo ?? null, generadoEn: d.presupuesto_generado_en ?? "" },
  ),
});

export async function revisionesDe(oppId: string): Promise<Revision[]> {
  if (!uuid(oppId)) return [];
  return (await pedir<FilaRev[]>(`revisiones_oferta?select=${SEL_REV}&oportunidad_id=eq.${oppId}&order=numero.desc`)).map(aRevision);
}

export async function estadoRevision(oppId: string): Promise<EstadoRevision> {
  const [ultima] = await revisionesDe(oppId);
  if (!ultima || ultima.estado !== "ok") return { ultima: ultima ?? null, okVigente: false, okCaducado: false };
  const ahora = new Set((await paqueteActual(oppId)).map(firma));
  const entonces = new Set(ultima.documentos.map(firma));
  const igual = ahora.size === entonces.size && [...ahora].every((x) => entonces.has(x));
  return { ultima, okVigente: igual, okCaducado: !igual };
}

// ------------------------------------------------------------ pedir el ok

/** El comercial pide el ok: se guarda el paquete de HOY, clavado a sus versiones,
 *  y se avisa por correo a quien tenga la funcion. Lleva siempre al menos una
 *  hoja generada y el presupuesto; la viabilidad, si la hay. */
export async function pedirRevision(oppId: string, nota: string | null, yo: Yo): Promise<{ id: string; numero: number; avisos: string[] }> {
  if (!uuid(oppId)) throw new Error("Oportunidad no válida.");
  const docs = await paqueteActual(oppId);
  if (!docs.some((d) => d.tipo === "hoja")) throw new Error("No hay ninguna hoja de encargo generada que revisar.");
  if (!docs.some((d) => d.tipo === "presupuesto")) throw new Error("Falta el presupuesto: va siempre en el paquete.");
  const previas = await pedir<{ id: string; numero: number; estado: string }[]>(
    `revisiones_oferta?select=id,numero,estado&oportunidad_id=eq.${oppId}&order=numero.desc`,
  );
  // Lo que estaba pendiente y nadie resolvio queda superado por este envio.
  if (previas.some((p) => p.estado === "pendiente"))
    await pedir(`revisiones_oferta?oportunidad_id=eq.${oppId}&estado=eq.pendiente`, {
      method: "PATCH",
      body: JSON.stringify({ estado: "superada", actualizado_en: new Date().toISOString() }),
    });
  const numero = (previas[0]?.numero ?? 0) + 1;
  const [r] = await pedir<{ id: string }[]>("revisiones_oferta?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ oportunidad_id: oppId, numero, enviada_por: yo.id, nota: (nota ?? "").trim() || null }),
  });
  await pedir("revisiones_oferta_documentos", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      docs.map((d) =>
        d.tipo === "hoja"
          ? { revision_id: r.id, version_hoja_id: d.versionId }
          : d.tipo === "viabilidad"
            ? { revision_id: r.id, viabilidad_id: d.id, viabilidad_version: d.version }
            : { revision_id: r.id, presupuesto_id: d.id, presupuesto_generado_en: d.generadoEn },
      ),
    ),
  });
  // Las hojas del paquete, "pendientes del ok".
  const hojas = docs.filter((d): d is Extract<DocPaquete, { tipo: "hoja" }> => d.tipo === "hoja").map((d) => d.hojaId);
  await pedir(`hojas_encargo?id=in.(${hojas.join(",")})&estado=in.(borrador,firmada_daniel,cambios_solicitados,pendiente_firma_daniel)`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "pendiente_firma_daniel", fecha_estado: new Date().toISOString() }),
  });

  const [o] = await pedir<{ codigo: string | null; nombre: string | null }[]>(`oportunidades?select=codigo,nombre&id=eq.${oppId}`);
  const donde = o ? nombreDeOpp(o) : "una oportunidad";
  const revisan = await quienTieneLaFuncion(FUNCION_REVISION);
  const avisos: string[] = [];
  for (const p of revisan) {
    if (!p.correo) { avisos.push(`${p.nombre} no tiene correo`); continue; }
    const e = await enviarCorreo({
      desde: "comercial",
      para: p.correo,
      asunto: `Oferta para revisar: ${donde}`,
      texto:
        `${yo.nombre} pide el ok a la oferta de ${donde} (envío ${numero}).\n\n` +
        (nota?.trim() ? `${nota.trim()}\n\n` : "") +
        `Revísala aquí: ${APP}/comercial/hoja-encargo?opp=${oppId}\n`,
      responderA: yo.email,
    });
    if (!e.ok) avisos.push(`${p.nombre}: ${e.dice ?? "no salió"}`);
  }
  if (!revisan.length) avisos.push("nadie tiene hoy la función de revisión de ofertas");
  return { id: r.id, numero, avisos };
}

// ------------------------------------------------------------ el ok, o cambios

/** Quien revisa da el OK o PIDE CAMBIOS (con comentario). No edita nada. */
export async function resolverRevision(
  revisionId: string,
  decision: "ok" | "cambios",
  comentario: string | null,
  yo: Yo,
): Promise<{ avisos: string[] }> {
  if (!puedeRevisar(yo)) throw new Error("No tienes la función de revisión de ofertas.");
  if (!uuid(revisionId)) throw new Error("Revisión no válida.");
  const texto = (comentario ?? "").trim();
  if (decision === "cambios" && !texto) throw new Error("Di qué hay que cambiar.");
  const [r] = await pedir<{ oportunidad_id: string; numero: number; estado: string; docs: { version_hoja_id: string | null; v: { hoja_encargo_id: string } | null }[] }[]>(
    `revisiones_oferta?select=oportunidad_id,numero,estado,docs:revisiones_oferta_documentos(version_hoja_id,v:version_hoja_id(hoja_encargo_id))&id=eq.${revisionId}`,
  );
  if (!r) throw new Error("No existe esa revisión.");
  if (r.estado !== "pendiente") throw new Error("Esta revisión ya está resuelta o la superó otro envío.");
  await pedir(`revisiones_oferta?id=eq.${revisionId}&estado=eq.pendiente`, {
    method: "PATCH",
    body: JSON.stringify({ estado: decision, resuelta_en: new Date().toISOString(), resuelta_por: yo.id, comentario: texto || null, actualizado_en: new Date().toISOString() }),
  });
  // Las hojas lo reflejan: "Ok oferta comercial", o vuelven a generadas para que
  // el comercial las corrija.
  const hojas = r.docs.map((d) => d.v?.hoja_encargo_id).filter((x): x is string => !!x);
  if (hojas.length)
    await pedir(`hojas_encargo?id=in.(${hojas.join(",")})&estado=eq.pendiente_firma_daniel`, {
      method: "PATCH",
      body: JSON.stringify({ estado: decision === "ok" ? "firmada_daniel" : "borrador", fecha_estado: new Date().toISOString() }),
    });

  const [o] = await pedir<{ codigo: string | null; nombre: string | null }[]>(`oportunidades?select=codigo,nombre&id=eq.${r.oportunidad_id}`);
  const donde = o ? nombreDeOpp(o) : "tu oportunidad";
  const lleva = await quienLlevaLaOpp(r.oportunidad_id);
  const avisos: string[] = [];
  for (const p of lleva.personas) {
    if (!p.correo) { avisos.push(`${p.nombre} no tiene correo`); continue; }
    const e = await enviarCorreo({
      desde: "comercial",
      para: p.correo,
      asunto: decision === "ok" ? `Ok a la oferta: ${donde}` : `Cambios en la oferta: ${donde}`,
      texto:
        (decision === "ok"
          ? `${yo.nombre} ha dado el ok a la oferta de ${donde}. Ya se puede enviar a la comunidad.\n\n`
          : `${yo.nombre} pide cambios en la oferta de ${donde}:\n\n${texto}\n\n`) +
        (decision === "ok" && texto ? `${texto}\n\n` : "") +
        `${APP}/comercial/hoja-encargo?opp=${r.oportunidad_id}\n`,
      responderA: yo.email,
    });
    if (!e.ok) avisos.push(`${p.nombre}: ${e.dice ?? "no salió"}`);
  }
  if (!lleva.personas.length) avisos.push("la oportunidad no tiene comercial asignado");
  return { avisos };
}

/** Las que esperan revision, la mas antigua arriba: la bandeja de quien revisa. */
export async function revisionesPendientes(): Promise<(Revision & { oportunidadId: string; opp: string })[]> {
  const filas = await pedir<(FilaRev & { oportunidad_id: string; opp: { codigo: string | null; nombre: string | null } | null })[]>(
    `revisiones_oferta?select=${SEL_REV},oportunidad_id,opp:oportunidad_id(codigo,nombre)&estado=eq.pendiente&order=enviada_en.asc`,
  );
  return filas.map((f) => ({ ...aRevision(f), oportunidadId: f.oportunidad_id, opp: f.opp ? nombreDeOpp(f.opp) : "" }));
}
