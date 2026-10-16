// lib/enviarFactura.ts
//
// GENERAR PROFORMA › PASO 2: ENVIAR FACTURA Y REGISTRO DEL CARGO (Monica,
// 16-oct-2026). La factura se hace en Factusol copiando de la proforma; luego,
// en la proforma de la app, se SUELTAN su PDF y el justificante del cargo
// (el "Resultado del alta de recibos" de CaixaBank). La app:
//   1. LEE los dos PDF (llevan el texto dentro: no se teclea nada). De la
//      factura: numero, fecha, NIF del cliente, importes. Del justificante:
//      importe, dia del cargo, numero de control y su referencia ("fac 301-2026");
//   2. CUADRA con la proforma, y si algo no cuadra AVISA, no bloquea ("si no
//      cuadra, aviso, no bloqueo"). La referencia de Factusol con el codigo de la
//      proforma va en el NOMBRE del fichero (en el PDF no sale impresa);
//   3. al enviar: guarda los dos PDF, da de alta la factura (origen app) con sus
//      lineas enganchadas a los hitos de la proforma, el cobro con su justificante
//      ("el justificante cuenta como cobrado") y los hitos quedan cobrados; y
//      manda el correo al destinatario con los dos documentos.

import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import type { Yo } from "./sesion";
import { leerProforma, libroDeEmpresa, type Proforma } from "./proformas";
import { puedeVerLibro } from "./cobros";
import { enviarCorreo, type Area } from "./correo";
import { crearEntrada } from "./entradaDiario";
import { recalcularLuego } from "./estadoOportunidad";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const APP = process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app";
const CORREO_VALIDO = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const BUZON: Record<string, Area> = { accesalia: "facturacion", daniel: "facturacion", ecobalance: "facturacion_ecobalance" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, Prefer: "return=representation", ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (r.status === 204 ? null : await r.json()) as T;
}

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
const iso = (ddmmaaaa: string) => ddmmaaaa.split("/").reverse().join("-");
const limpio = (n: string) => n.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
const soloNif = (s: string | null | undefined) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function texto(pdf: Uint8Array): Promise<string> {
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(doc, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

export type LeidoFactura = { serie: string; numero: number; fecha: string | null; nifCliente: string | null; total: number | null; cuenta: string | null } | null;
export type LeidoJustificante = { importe: number | null; diaCargo: string | null; control: string | null; referencia: string | null } | null;
export type Comprobacion = { ok: boolean; texto: string };
export type Lectura = { factura: LeidoFactura; justificante: LeidoJustificante; comprobaciones: Comprobacion[]; referencia: string };

/** La factura de Factusol: "1 000298 1 15/10/2026" (serie, numero, pagina, fecha). */
export function leerFactura(t: string, nifEmisora: string, total: number): LeidoFactura {
  const m = t.match(/\b(\d)\s+0*(\d{1,6})\s+\d+\s+(\d{2}\/\d{2}\/\d{4})/);
  if (!m) return null;
  const nifs = [...t.matchAll(/\b([A-HJ-NP-SUVW]\d{7}[0-9A-J]|\d{8}[A-Z])\b/g)].map((x) => x[1]).filter((n) => n !== soloNif(nifEmisora));
  const importes = [...t.matchAll(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g)].map((x) => num(x[0]));
  // El total: el de la proforma si esta impreso; si no, el ULTIMO importe del PDF
  // (Factusol lo cierra con el vencimiento: "A la vista 6.013,70"). El mayor no
  // vale: la descripcion puede citar el total de la hoja ("50 % de 23.000,00").
  const leido = importes.find((x) => Math.abs(x - total) < 0.01) ?? importes.at(-1) ?? null;
  const cuenta = t.replace(/\s/g, "").match(/ES\d{22}/)?.[0] ?? null;
  return { serie: m[1], numero: Number(m[2]), fecha: iso(m[3]), nifCliente: nifs[0] ?? null, total: leido, cuenta };
}

/** El "Resultado del alta de recibos" de CaixaBank. */
export function leerJustificante(t: string): LeidoJustificante {
  const p = t.replace(/\s+/g, " ");
  const importe = p.match(/Importe total:\s*([\d.]+,\d{2})/)?.[1];
  const dia = p.match(/D[ií]a del cargo:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1];
  if (!importe && !dia) return null;
  return {
    importe: importe ? num(importe) : null,
    diaCargo: dia ? iso(dia) : null,
    control: p.match(/N[uú]mero de control:\s*(\d+)/)?.[1] ?? null,
    referencia: p.match(/fac\s*(\d+)\s*-\s*(\d{4})/i)?.slice(1, 3).join("-") ?? null,
  };
}

async function proformaDe(yo: Yo, id: string): Promise<Proforma> {
  const p = await leerProforma(id);
  if (!p) throw new Error("Esa proforma no existe.");
  if (!puedeVerLibro(yo, libroDeEmpresa(p.empresa))) throw new Error("Esta proforma es del otro libro de facturación.");
  if (p.estado === "anulada") throw new Error("Está anulada.");
  if (p.factura) throw new Error(`Esta proforma ya tiene su factura (${p.factura.numero}).`);
  return p;
}

/** LEER Y CUADRAR (no escribe nada). */
export async function leerYCuadrar(
  yo: Yo,
  proformaId: string,
  factura: { nombre: string; contenido: Uint8Array },
  justificante: { nombre: string; contenido: Uint8Array } | null,
): Promise<Lectura> {
  const p = await proformaDe(yo, proformaId);
  const [tf, tj] = await Promise.all([texto(factura.contenido).catch(() => ""), justificante ? texto(justificante.contenido).catch(() => "") : Promise.resolve("")]);
  const f = leerFactura(tf, p.emisora.nif, p.total);
  const j = justificante ? leerJustificante(tj) : null;
  const c: Comprobacion[] = [];
  if (!f) c.push({ ok: false, texto: "No se ha podido leer el número de factura del PDF. ¿Es el PDF de Factusol?" });
  else {
    const anio = Number((f.fecha ?? p.fecha).slice(0, 4));
    const ya = await pedir<{ id: string }[]>(`facturas?select=id&tipo=eq.factura&empresa_emisora=eq.${p.empresa}&anio=eq.${anio}&serie=eq.${f.serie}&numero=eq.${f.numero}`);
    c.push(ya.length ? { ok: false, texto: `La factura ${anio}/${f.numero} ya está en la app.` } : { ok: true, texto: `Factura ${anio}/${f.numero}, nueva.` });
    c.push(
      soloNif(f.nifCliente) && soloNif(f.nifCliente) === soloNif(p.pagador.nif)
        ? { ok: true, texto: `El cliente es el de la proforma (${f.nifCliente}).` }
        : { ok: false, texto: `El NIF del cliente de la factura (${f.nifCliente ?? "no se lee"}) no es el de la proforma (${p.pagador.nif ?? "sin NIF"}).` },
    );
    c.push(
      f.total != null && Math.abs(f.total - p.total) < 0.01
        ? { ok: true, texto: `El total cuadra: ${EUR.format(p.total)} €.` }
        : { ok: false, texto: `El total de la factura (${f.total != null ? EUR.format(f.total) : "no se lee"} €) no es el de la proforma (${EUR.format(p.total)} €).` },
    );
    if (f.fecha && f.fecha < p.fecha) c.push({ ok: false, texto: `La factura (${f.fecha}) es anterior a la proforma (${p.fecha}).` });
  }
  c.push(
    factura.nombre.toUpperCase().includes(p.codigo.toUpperCase())
      ? { ok: true, texto: `El nombre del fichero lleva el código de la proforma (${p.codigo}).` }
      : { ok: false, texto: `El nombre del fichero no lleva el código de la proforma (${p.codigo}): ¿se puso en la Referencia de Factusol?` },
  );
  if (!justificante) c.push({ ok: false, texto: "Sin justificante del cargo: la factura queda pendiente de cobro, en «Facturas sin justificante»." });
  else if (!j) c.push({ ok: false, texto: "No se ha podido leer el justificante. ¿Es el «Resultado del alta de recibos» de CaixaBank?" });
  else {
    c.push(
      j.importe != null && Math.abs(j.importe - (f?.total ?? p.total)) < 0.01
        ? { ok: true, texto: `El cargo es por el total (${EUR.format(j.importe)} €), el ${j.diaCargo ?? "día que no se lee"}.` }
        : { ok: false, texto: `El cargo (${j.importe != null ? EUR.format(j.importe) : "no se lee"} €) no es el total de la factura.` },
    );
    if (f && j.referencia)
      c.push(
        j.referencia === `${f.numero}-${(f.fecha ?? "").slice(0, 4)}`
          ? { ok: true, texto: `La referencia del cargo es la de esta factura (fac ${j.referencia}).` }
          : { ok: false, texto: `La referencia del cargo (fac ${j.referencia}) no es la de esta factura (${f.numero}-${(f.fecha ?? "").slice(0, 4)}).` },
      );
  }
  return { factura: f, justificante: j, comprobaciones: c, referencia: factura.nombre.replace(/\.pdf$/i, "").replace(/^Factura\s+\d+\s*-\s*\d+\s*/i, "").trim() };
}

async function subir(ruta: string, pdf: Uint8Array) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/facturas/${ruta}`, {
    method: "POST",
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/pdf", "x-upsert": "true" },
    body: pdf as unknown as BodyInit,
  });
  if (!r.ok) throw new Error(`No se ha podido guardar el PDF: ${r.status} ${await r.text()}`);
}

/** ENVIAR: registra factura, cobro e hitos, y manda el correo con los dos PDF. */
export async function enviarFactura(
  yo: Yo,
  proformaId: string,
  factura: { nombre: string; contenido: Uint8Array },
  justificante: { nombre: string; contenido: Uint8Array } | null,
  correo: { para: string[]; asunto: string; cuerpo: string },
  nota: string,
): Promise<{ factura: string }> {
  const p = await proformaDe(yo, proformaId);
  const l = await leerYCuadrar(yo, proformaId, factura, justificante);
  if (!l.factura) throw new Error("Sin el número de factura no se puede registrar: revisa que sea el PDF de Factusol.");
  const para = [...new Set(correo.para.map((x) => x.trim().toLowerCase()).filter(Boolean))];
  if (!para.length) throw new Error("Falta a quién enviarla.");
  const malos = para.filter((x) => !CORREO_VALIDO.test(x));
  if (malos.length) throw new Error(`Estas direcciones no son de correo: ${malos.join(", ")}.`);
  if (!correo.asunto.trim() || !correo.cuerpo.trim()) throw new Error("Faltan el asunto o el texto.");

  const f = l.factura;
  const fecha = f.fecha ?? p.fecha;
  const anio = Number(fecha.slice(0, 4));
  const numero = `${anio}/${f.numero}`;
  const cobrada = !!(justificante && l.justificante);
  // 1. Los PDF, al almacen privado `facturas` (como los de Factusol y los justificantes).
  const rutaF = `${p.empresa}/${anio}/${limpio(factura.nombre)}`;
  await subir(rutaF, factura.contenido);
  const rutaJ = justificante ? `justificantes/${p.empresa}/${anio}/${limpio(justificante.nombre)}` : null;
  if (rutaJ && justificante) await subir(rutaJ, justificante.contenido);

  // 2. La factura, con los importes de la proforma ("manda la factura": si su total
  //    leido es otro, ese).
  const total = f.total ?? p.total;
  const [fa] = await pedir<{ id: string }[]>("facturas", {
    method: "POST",
    body: JSON.stringify({
      origen: "app", tipo: "factura", empresa_emisora: p.empresa, anio, serie: f.serie, numero: f.numero, fecha, referencia: l.referencia || null,
      estado: cobrada ? "cobrada" : "pendiente", pagador_nombre: p.pagador.nombre, pagador_nif: p.pagador.nif, pagador_domicilio: p.pagador.domicilio,
      forma_pago: cobrada ? "cargo_en_cuenta" : null, base: p.base, iva_desglose: [{ tipo: p.ivaPct, base: p.base, cuota: p.iva }],
      irpf_porcentaje: p.irpfPct || null, irpf_importe: p.irpf || null, total, oportunidad_id: p.oppId, url_pdf: `almacen:facturas/${rutaF}`,
      notas: `Subida desde la proforma ${p.codigo} (${new Date().toISOString().slice(0, 10)}).`,
    }),
  });
  // 3. Sus lineas, las de la proforma, enganchadas a los mismos hitos.
  const hitos: string[] = [];
  for (const [i, ln] of p.lineas.entries()) {
    const [fl] = await pedir<{ id: string }[]>("factura_lineas", {
      method: "POST",
      body: JSON.stringify({ factura_id: fa.id, posicion: i + 1, concepto: ln.concepto, cantidad: 1, precio: ln.base, base: ln.base }),
    });
    if (ln.hitos.length)
      await pedir("factura_linea_hitos", {
        method: "POST",
        body: JSON.stringify(ln.hitos.map((h) => ({ factura_linea_id: fl.id, hito_cobro_id: h.id, importe: h.importe, como: "proforma" }))),
      });
    hitos.push(...ln.hitos.map((h) => h.id));
  }
  await pedir(`proformas?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ factura_id: fa.id }) });

  // 4. El cobro: el justificante cuenta como cobrado (Monica, 16-oct-2026).
  if (cobrada && rutaJ && justificante) {
    await pedir("cobros", {
      method: "POST",
      body: JSON.stringify({
        factura_id: fa.id, fecha_cobro: l.justificante?.diaCargo ?? fecha, importe: l.justificante?.importe ?? total, tipo: "cargo_en_cuenta",
        justificante: `almacen:facturas/${rutaJ}`, fichero_origen: null, subido_por: yo.id, // fichero_origen es solo de la carga desde Drive (hilo 68)
      }),
    });
  }
  // 5. Los hitos: facturados (numero y fecha) y, con justificante, cobrados. El
  //    padre de un subhito, segun sus subhitos.
  if (hitos.length) {
    await pedir(`hitos_cobro?id=in.(${hitos.join(",")})`, {
      method: "PATCH",
      body: JSON.stringify({
        numero_factura: numero, fecha_factura: fecha, ...(cobrada ? { estado: "completado", fecha_cobro: l.justificante?.diaCargo ?? fecha } : {}),
        url_factura_pdf: `almacen:facturas/${rutaF}`,
      }),
    });
    const padres = await pedir<{ hito_padre_id: string | null }[]>(`hitos_cobro?select=hito_padre_id&id=in.(${hitos.join(",")})&hito_padre_id=not.is.null`);
    for (const pid of [...new Set(padres.map((x) => x.hito_padre_id).filter((x): x is string => !!x))]) {
      const subs = await pedir<{ estado: string }[]>(`hitos_cobro?select=estado&hito_padre_id=eq.${pid}`);
      const hechos = subs.filter((s) => s.estado === "completado").length;
      await pedir(`hitos_cobro?id=eq.${pid}`, { method: "PATCH", body: JSON.stringify({ estado: hechos === subs.length ? "completado" : hechos ? "parcial" : "pendiente" }) });
    }
  }
  // 6. Lo que no cuadraba, y el porque si se escribio: a sus notas de facturacion.
  const avisos = l.comprobaciones.filter((c) => !c.ok).map((c) => c.texto);
  if ((avisos.length || nota.trim()) && hitos.length) {
    const [h] = await pedir<{ linea: { hoja_encargo_id: string } | null }[]>(`hitos_cobro?select=linea:linea_facturacion_id(hoja_encargo_id)&id=eq.${hitos[0]}`);
    await pedir("notas_facturacion", {
      method: "POST",
      body: JSON.stringify(
        hitos.map((hid) => ({
          hoja_encargo_id: h?.linea?.hoja_encargo_id ?? null, hito_cobro_id: hid, fecha: new Date().toISOString().slice(0, 10), origen: "persona",
          tipo: "nota", autor_id: yo.id, autor: [yo.nombre, yo.apellidos].filter(Boolean).join(" "),
          texto: `Factura ${numero} enviada${avisos.length ? ` con avisos: ${avisos.join(" ")}` : ""}${nota.trim() ? ` · ${nota.trim()}` : ""}`,
        })),
      ),
    });
  }

  // 7. El correo, con los dos documentos.
  const area = BUZON[p.empresa];
  const remitente = `${p.emisora.nombre} · Facturación`;
  const adjuntos = [factura, ...(justificante ? [justificante] : [])];
  const r = await enviarCorreo({ desde: area, para: para.join(", "), asunto: correo.asunto.trim(), texto: correo.cuerpo.trim(), nombreRemitente: remitente, adjuntos });
  const enlace = `/facturacion/proforma/${p.id}`;
  let notaId: string | null = null;
  if (r.ok && p.oppId) {
    const n = await crearEntrada({
      texto: `Factura ${numero} (${EUR.format(total)} €) enviada a ${para.join(", ")}${justificante ? ", con el justificante del cargo" : ""}.\nAsunto: ${correo.asunto.trim()}\n\n${correo.cuerpo.trim()}\n\nProforma: ${APP}${enlace}`,
      canal: "mail", fecha: null, oportunidadId: p.oppId, persona: null, dondeTexto: null, autorId: yo.id,
      autorNombre: [yo.nombre, yo.apellidos].filter(Boolean).join(" "),
    }).catch(() => null);
    notaId = n?.id ?? null;
  }
  await pedir("correos_enviados", {
    method: "POST",
    body: JSON.stringify({
      oportunidad_id: p.oppId, enviado_por: yo.id, en_nombre_de: null, remitente_nombre: remitente, responder_a: null, para,
      asunto: correo.asunto.trim(), cuerpo: correo.cuerpo.trim(),
      documentos: [{ tipo: "Factura", id: fa.id, nombre: numero, enlace: `/facturacion/factura/${fa.id}` }],
      plantilla_id: null, ok: r.ok, error: r.ok ? null : (r.dice ?? "no se pudo enviar"), nota_id: notaId,
    }),
  });
  recalcularLuego(p.oppId);
  if (!r.ok) throw new Error(`La factura ${numero} ha quedado registrada, pero el correo no ha salido: ${r.dice}. Reenvíalo desde la proforma.`);
  return { factura: numero };
}
