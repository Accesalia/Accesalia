import "server-only";
// lib/hojaEmitir.ts
//
// GENERAR LA HOJA Y EL OK DE DANIEL (Monica, 25-oct-2026), en el sistema nuevo (he_*). Por HOJA, con el historial de
// estados (he_estados_hoja), sin las tablas viejas del ok a la oferta (revisiones_oferta).
//   - «Generar la hoja»: se guarda como esta, pasa a «pendiente del ok de Daniel» y va con su PAQUETE: su presupuesto
//     (se monta solo desde sus lineas, en borrador) y la viabilidad vigente si la hay. Avisa por correo a quien tiene la
//     funcion de revision de ofertas.
//   - El ok: nacen el codigo HE (la serie del año, compartida con las hojas de antes), la fecha de emision, el PDF de la
//     hoja y el del presupuesto, y se firman con el uso «ok_oferta» (sin certificado, el ok sale sin firmar y se avisa).
//     La version anterior, si la hay, pasa a «sustituida». Correo al comercial.
//   - Pedir cambios (con nota): la MISMA version vuelve al comercial para corregirla (no nace otra).

import type { Yo } from "./sesion";
import { guardarBorrador, ponerEstado, type FilaHoja, type Pagador } from "./hojaCompromisos";
import { exigirCompleta } from "./completa";
import { emitirPresupuestoDeVersion, presupuestoDeVersion } from "./presupuesto";
import { pdfDeHoja } from "./pdf/HojaDoc";
import { fechaLarga } from "./hojaPapel";
import { firmaDeUso, firmarParaUso, firmadoDe } from "./firmaDigital";
import { quienLlevaLaOpp, quienTieneLaFuncion } from "./quienLleva";
import { enviarCorreo } from "./correo";
import { FUNCION_REVISION, puedeRevisar } from "./revisionOferta";
import { nombreDeOpp } from "./direccionOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const APP = process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app";
const ALMACEN = "documentos-comerciales";

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const texto = await r.text();
  return (texto ? JSON.parse(texto) : null) as T;
}
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

/** El papel se guarda limpio (como en el generador viejo): nada que se ejecute al verlo. */
function limpiarHtml(html: string): string {
  return html
    .replace(/<\/?(script|iframe|object|embed|link|meta|style)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "")
    .replace(/\scontenteditable(="[^"]*")?/gi, "");
}

type Version = {
  id: string; codigo_he: string | null; numero_version: number; oportunidad_id: string; estado: string; papel_html: string | null; pdf: string | null;
  viabilidad_id: string | null; viabilidad_version: number | null; opp: { codigo: string | null; nombre: string | null } | null;
};
async function versionDe(versionId: string): Promise<Version> {
  if (!/^[0-9a-f-]{36}$/.test(versionId)) throw new Error("Hoja no válida.");
  const [v] = await pedir<Version[]>(
    `he_versiones_hoja?select=id,codigo_he,numero_version,oportunidad_id,estado,papel_html,pdf,viabilidad_id,viabilidad_version,opp:oportunidad_id(codigo,nombre)&id=eq.${versionId}`,
  );
  if (!v) throw new Error("No encuentro esa hoja.");
  return v;
}
const donde = (v: Version) => (v.opp ? nombreDeOpp(v.opp) : "una oportunidad");

/** GENERAR: guarda la hoja tal como esta y la manda al ok de Daniel con su paquete. */
export async function generarHoja(oppId: string, filas: FilaHoja[], versionId: string | null, pagador: Pagador, papel: string, yo: Yo): Promise<{ id: string; avisos: string[] }> {
  // La puerta de calidad esta en generar (26-sep): el dato a medias se acepta en el alta, pero no llega a un documento.
  await exigirCompleta(oppId, "generar la hoja");
  if (!papel.trim()) throw new Error("Falta el papel de la hoja.");
  const id = await guardarBorrador(oppId, filas, yo, versionId, pagador);
  const v = await versionDe(id);
  // La viabilidad que va con ella: la vigente con PDF (la que veria Daniel).
  const [viab] = await pedir<{ id: string; version: number }[]>(
    `viabilidades?select=id,version&oportunidad_id=eq.${oppId}&url_pdf=not.is.null&vigente=is.true&order=rematada_en.desc.nullslast&limit=1`,
  );
  await pedir(`he_versiones_hoja?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ papel_html: limpiarHtml(papel), viabilidad_id: viab?.id ?? null, viabilidad_version: viab?.version ?? null }),
  });
  const avisos: string[] = [];
  const ppto = await presupuestoDeVersion(id);
  if (!ppto) avisos.push("La hoja no tiene nada que se cobre con importe: va sin presupuesto.");
  await ponerEstado(id, "pendiente_ok_daniel", yo, null);

  const revisan = await quienTieneLaFuncion(FUNCION_REVISION);
  for (const p of revisan) {
    if (!p.correo) { avisos.push(`${p.nombre} no tiene correo`); continue; }
    const e = await enviarCorreo({
      desde: "comercial",
      para: p.correo,
      asunto: `Hoja para tu ok: ${donde(v)}`,
      texto:
        `${yo.nombre} ha generado ${v.codigo_he ? `la versión ${v.numero_version} de la ${v.codigo_he}` : "una hoja de encargo"} de ${donde(v)} y espera tu ok.\n\n` +
        `Va con ${ppto ? "su presupuesto" : "sin presupuesto"}${viab ? " y la viabilidad" : ""}.\n\n` +
        `Revísala aquí: ${APP}/gestiones/hoja-prueba?opp=${oppId}\n`,
      responderA: yo.email,
    });
    if (!e.ok) avisos.push(`${p.nombre}: ${e.dice ?? "no salió el correo"}`);
  }
  if (!revisan.length) avisos.push("nadie tiene hoy la función de revisión de ofertas");
  return { id, avisos };
}

/** El ok de Daniel o sus cambios. Solo quien tiene la funcion de revision de ofertas; no edita nada. */
export async function resolverOkDaniel(versionId: string, decision: "ok" | "cambios", nota: string | null, yo: Yo): Promise<{ avisos: string[] }> {
  if (!puedeRevisar(yo)) throw new Error("No tienes la función de revisión de ofertas.");
  const v = await versionDe(versionId);
  if (v.estado !== "pendiente_ok_daniel") throw new Error("Esta hoja no está pendiente del ok.");
  const texto = (nota ?? "").trim();
  const avisos: string[] = [];

  if (decision === "cambios") {
    if (!texto) throw new Error("Di qué hay que cambiar.");
    await ponerEstado(v.id, "cambios_daniel", yo, texto);
  } else {
    if (!v.papel_html) throw new Error("Esta hoja no tiene papel: que el comercial la vuelva a generar.");
    // La viabilidad tiene que ser la que se mando a revisar.
    if (v.viabilidad_id) {
      const [viab] = await pedir<{ version: number }[]>(`viabilidades?select=version&id=eq.${v.viabilidad_id}`);
      if (!viab || viab.version !== v.viabilidad_version) throw new Error("La viabilidad se ha rehecho después de generar la hoja: que el comercial la vuelva a generar.");
    }
    const fecha = hoy();
    // 1 · el codigo: el de la hoja si ya lo tenia (v2, v3…), si no el siguiente de la serie, de un golpe en la base.
    let codigo = v.codigo_he;
    if (!codigo) {
      codigo = await pedir<string>("rpc/siguiente_codigo", { method: "POST", body: JSON.stringify({ p_tipo: "HE", p_anio: Number(fecha.slice(0, 4)) }) });
      await pedir(`he_versiones_hoja?id=eq.${v.id}&codigo_he=is.null`, { method: "PATCH", body: JSON.stringify({ codigo_he: codigo }) });
    }
    // 2 · el PDF de la hoja, con la fecha de hoy en el «En Madrid, a …» y su codigo arriba.
    const html = v.papel_html.replace(/(<span data-p="fecha">)[^<]*(<\/span>)/, `$1${fechaLarga()}$2`);
    const pdf = new Uint8Array(await pdfDeHoja(html, `Hoja de encargo ${codigo} v${v.numero_version}`, `${codigo} v${v.numero_version}`));
    const ruta = `he/${v.id}/${codigo}-v${v.numero_version}.pdf`;
    const sube = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
      method: "POST", headers: { ...CAB, "Content-Type": "application/pdf", "x-upsert": "true" }, body: pdf, cache: "no-store",
    });
    if (!sube.ok) throw new Error(`No se pudo guardar el PDF de la hoja (${sube.status}): ${await sube.text()}`);
    await pedir(`he_versiones_hoja?id=eq.${v.id}`, { method: "PATCH", body: JSON.stringify({ pdf: `almacen:${ALMACEN}/${ruta}`, papel_html: html, fecha_emision: fecha }) });
    // 3 · el presupuesto, con su numero y su PDF.
    const ppto = await emitirPresupuestoDeVersion(v.id, fecha);
    // 4 · la firma: la hoja, el presupuesto y la viabilidad, tal cual.
    const firma = await firmaDeUso("ok_oferta");
    if (!firma) avisos.push("Sin firmar: no hay firma digital para el ok a la oferta (Gestiones de la app → Firmas digitales).");
    else {
      const docs: { documento: string; nombre: string; pdf: Uint8Array | null }[] = [{ documento: `he:${v.id}`, nombre: `${codigo} v${v.numero_version}`, pdf }];
      if (ppto) docs.push({ documento: `presupuesto:${ppto.id}`, nombre: `presupuesto ${ppto.codigo}`, pdf: await leerAlmacen(`presupuestos?select=url_pdf&id=eq.${ppto.id}`) });
      if (v.viabilidad_id) docs.push({ documento: `viabilidad:${v.viabilidad_id}`, nombre: "viabilidad", pdf: await leerAlmacen(`viabilidades?select=url_pdf&id=eq.${v.viabilidad_id}`) });
      for (const d of docs) {
        if (!d.pdf) { avisos.push(`No encuentro el PDF de ${d.nombre}: va sin firmar.`); continue; }
        await firmarParaUso(d.pdf, { uso: "ok_oferta", documento: d.documento, motivo: "Ok a la oferta" }, firma, yo);
      }
      avisos.push(`Firmados por ${firma.firmante}: ${docs.filter((d) => d.pdf).map((d) => d.nombre).join(", ")}.`);
    }
    await ponerEstado(v.id, "ok_daniel", yo, texto || null);
    // 5 · la anterior, sustituida por esta.
    if (v.numero_version > 1) {
      const [ant] = await pedir<{ id: string; estado: string }[]>(
        `he_versiones_hoja?select=id,estado&codigo_he=eq.${encodeURIComponent(codigo)}&numero_version=eq.${v.numero_version - 1}`,
      );
      if (ant && ant.estado !== "sustituida") await ponerEstado(ant.id, "sustituida", yo, `Sustituida por la versión ${v.numero_version}.`);
    }
  }

  // Al comercial (y a quien comparte su cartera), por correo.
  const lleva = await quienLlevaLaOpp(v.oportunidad_id);
  for (const p of lleva.personas) {
    if (!p.correo) { avisos.push(`${p.nombre} no tiene correo`); continue; }
    const e = await enviarCorreo({
      desde: "comercial",
      para: p.correo,
      asunto: decision === "ok" ? `Ok recibido: hoja firmada lista para enviar · ${donde(v)}` : `Cambios en la hoja: ${donde(v)}`,
      texto:
        (decision === "ok"
          ? `${yo.nombre} ha dado el ok a la hoja de ${donde(v)}. Ya está firmada y lista para enviarla a la comunidad.\n\n`
          : `${yo.nombre} pide cambios en la hoja de ${donde(v)}:\n\n${texto}\n\n`) +
        (decision === "ok" && texto ? `${texto}\n\n` : "") +
        `${APP}/gestiones/hoja-prueba?opp=${v.oportunidad_id}\n`,
      responderA: yo.email,
    });
    if (!e.ok) avisos.push(`${p.nombre}: ${e.dice ?? "no salió el correo"}`);
  }
  if (!lleva.personas.length) avisos.push("la oportunidad no tiene comercial asignado");
  return { avisos };
}

/** Un PDF del almacen a partir de la fila que lo apunta (url_pdf = «almacen:…»). */
async function leerAlmacen(ruta: string): Promise<Uint8Array | null> {
  const [f] = await pedir<{ url_pdf: string | null }[]>(ruta);
  if (!f?.url_pdf?.startsWith("almacen:")) return null;
  const r = await fetch(`${URL_BASE}/storage/v1/object/${f.url_pdf.slice("almacen:".length)}`, { headers: CAB, cache: "no-store" });
  return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
}

/** El PDF de la hoja de una version: el emitido (el firmado, si lo hay) o, mientras espera el ok, una vista previa sin
 *  codigo con el papel tal como se genero. */
export async function pdfDeHojaVersion(versionId: string): Promise<{ pdf: Uint8Array; oppId: string; nombre: string } | null> {
  const v = await versionDe(versionId);
  const nombre = `Hoja de encargo ${v.codigo_he ?? ""} v${v.numero_version} ${donde(v)}.pdf`.replace(/\s+/g, " ");
  if (v.pdf?.startsWith("almacen:")) {
    const r = await fetch(`${URL_BASE}/storage/v1/object/${v.pdf.slice("almacen:".length)}`, { headers: CAB, cache: "no-store" });
    if (r.ok) {
      const pdf = new Uint8Array(await r.arrayBuffer());
      return { pdf: (await firmadoDe(pdf)) ?? pdf, oppId: v.oportunidad_id, nombre };
    }
  }
  if (!v.papel_html) return null;
  return { pdf: new Uint8Array(await pdfDeHoja(v.papel_html, "Hoja de encargo (pendiente del ok)", "Pendiente del ok de Daniel")), oppId: v.oportunidad_id, nombre };
}

// ------------------------------------------------------------ lo que hace el comercial desde la opp (25-oct-2026)

/** Marcar enviada a la comunidad: solo con el ok de Daniel. (Cuando el envio por correo pase al sistema nuevo, lo marcara
 *  el propio envio.) */
export async function marcarEnviada(versionId: string, yo: Yo): Promise<void> {
  const v = await versionDe(versionId);
  if (v.estado !== "ok_daniel") throw new Error("Solo se envía una hoja con el ok de Daniel.");
  await ponerEstado(v.id, "enviada", yo, null);
}

/** La comunidad no la firma: final, con su motivo («la hoja acaba en firma o en baja, nunca en el limbo», 13-oct). */
export async function marcarNoFirmada(versionId: string, motivo: string, yo: Yo): Promise<void> {
  const v = await versionDe(versionId);
  if (!["ok_daniel", "enviada", "cambios_comunidad", "cambios_comercial", "firma_con_errores"].includes(v.estado))
    throw new Error("Esta hoja no está esperando la firma.");
  if (!motivo.trim()) throw new Error("Di por qué no la firman.");
  await ponerEstado(v.id, "no_firmada", yo, motivo.trim());
}

/** Anular una hoja (por error, duplicada…): final, con su motivo. Un borrador no se anula: se descarta. */
export async function anularHoja(versionId: string, motivo: string, yo: Yo): Promise<void> {
  const v = await versionDe(versionId);
  if (v.estado === "borrador") throw new Error("Un borrador no se anula: se descarta.");
  if (["no_firmada", "anulada", "sustituida"].includes(v.estado)) throw new Error("Esta hoja ya está cerrada.");
  if (!motivo.trim()) throw new Error("Di por qué se anula.");
  await ponerEstado(v.id, "anulada", yo, motivo.trim());
}

/** VALIDAR LA HOJA FIRMADA (Monica, 25-oct-2026). El comercial que lleva la opp dice a que hoja(s) corresponde el
 *  documento archivado como «Hoja de encargo» (un PDF puede traer varias) y comprueba las tres cosas: bien firmada,
 *  la ultima version que se envio y sin retocar. Bien: la version apunta a su firmada y pasa a firmada_recibida y a
 *  ok_comercial (ahi entra facturacion). Mal: firma_con_errores con su nota, y se devuelve a quien paga. */
export async function validarFirmada(oppId: string, documentoId: string, versionIds: string[], decision: "ok" | "errores", nota: string | null, yo: Yo): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(documentoId)) throw new Error("Documento no válido.");
  if (!versionIds.length) throw new Error("Di de qué hoja es la firmada.");
  const [doc] = await pedir<{ id: string; oportunidad_id: string | null; nombre: string | null; tipo: { nombre: string } | null }[]>(
    `documentos?select=id,oportunidad_id,nombre,tipo:tipos_documento(nombre)&id=eq.${documentoId}`,
  );
  if (!doc || doc.oportunidad_id !== oppId) throw new Error("Ese documento no es de esta oportunidad.");
  if (doc.tipo?.nombre !== "Hoja de encargo") throw new Error("Ese documento no está archivado como hoja de encargo firmada.");
  const vs = await Promise.all(versionIds.map(versionDe));
  for (const v of vs) {
    if (v.oportunidad_id !== oppId) throw new Error("Esa hoja no es de esta oportunidad.");
    if (!["ok_daniel", "enviada", "firma_con_errores"].includes(v.estado)) throw new Error(`La ${v.codigo_he ?? "hoja"} v${v.numero_version} no está esperando la firma.`);
  }
  const texto = (nota ?? "").trim();
  if (decision === "errores" && !texto) throw new Error("Di qué está mal en la firma.");
  for (const v of vs) {
    await pedir(`he_versiones_hoja?id=eq.${v.id}`, { method: "PATCH", body: JSON.stringify({ firmada_documento_id: doc.id }) });
    if (decision === "errores") {
      await ponerEstado(v.id, "firma_con_errores", yo, texto);
      continue;
    }
    await ponerEstado(v.id, "firmada_recibida", yo, `Firmada: ${doc.nombre ?? "documento del archivo"}.`);
    await ponerEstado(v.id, "ok_comercial", yo, ["Comprobado: bien firmada, es la última versión enviada y no está retocada.", texto].filter(Boolean).join(" "));
  }
}
