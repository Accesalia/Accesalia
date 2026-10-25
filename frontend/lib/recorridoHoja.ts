import "server-only";
// lib/recorridoHoja.ts
//
// EL RECORRIDO DE UNA HOJA FIRMADA (Monica, 25-oct-2026; maqueta validada docs/figma/recorrido-hoja-firmada.html).
// Despues de validar sus lineas en Nuevas hojas firmadas, la hoja va a un sitio u otro con un boton, y todo lo que se
// hace con ella queda en movimientos_hoja (migracion 20261025150000). EL ESTADO ES EL ULTIMO MOVIMIENTO:
//   - nueva: sin destino, o devuelta a la lista            -> Nuevas hojas firmadas
//   - a_cobro, sin cobrar el primer hito                    -> Primer cobro
//   - a_cobro con el primer hito cobrado, o a_produccion    -> Bandeja de la secretaria comercial
//   - metida en produccion despues del ultimo destino       -> en produccion (Asignar, Facturable ya)
// Las pausas van aparte y NUNCA paran el cobro: paran el trabajo de las areas de esa hoja. La de facturacion la
// levanta facturacion y la reanuda la secretaria; la de la secretaria, ella misma.
// «Cobrado» lo dicen los hitos (estado completado: con justificante, como siempre), no un movimiento.

import type { Yo } from "./sesion";
import { nombreDeOpp } from "./direccionOpp";
import { sinArchivar, tiposCajon, type DocCajon, type GrupoTipos } from "./cajonDocumentos";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...CAB, "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
async function leer<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CAB, Range: `${d}-${d + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const x = (await r.json()) as T[];
    out.push(...x);
    if (x.length < 1000) return out;
  }
}
async function porTramos<T>(ids: string[], hacer: (t: string) => string): Promise<T[]> {
  const t: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) t.push(ids.slice(i, i + 150));
  return (await Promise.all(t.map((x) => leer<T>(hacer(x.join(",")))))).flat();
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);
const EMISORES = "(accesalia,daniel_autonomo)";

// ------------------------------------------------------------ quien

const tiene = (yo: Yo, ...claves: string[]) => yo.funciones.some((f) => claves.includes(f.clave));
/** Facturacion: Nuevas hojas firmadas, Primer cobro y el Diario (los mismos que validan lineas). */
export const puedeFacturacion = (yo: Yo) => yo.veTodo || tiene(yo, "facturacion", "control_produccion");
/** La bandeja comercial: la secretaria comercial (funcion «secretaria»). */
export const puedeBandeja = (yo: Yo) => yo.veTodo || tiene(yo, "secretaria");

// ------------------------------------------------------------ las areas

export const AREAS: Record<string, string> = {
  PRY: "Proyectos", OBR: "Obra", SUBV: "Subvenciones", IEE: "IEE", CAES: "CAES", FIN: "Financiación", "3PPTOS": "3 presupuestos",
};
export const nombreArea = (a: string) => AREAS[a] ?? a;

// ------------------------------------------------------------ los movimientos y el estado

export type TipoMov = "a_cobro" | "a_produccion" | "devuelta" | "direccion_comprobada" | "metida_produccion" | "pausada" | "pausa_levantada" | "reanudada";
export type Lado = "facturacion" | "secretaria" | "app";
export type Tejado = "accesalia" | "cliente" | "tercero";
export type Mov = {
  id: string; hoja_encargo_id: string; tipo: TipoMov; en: string; por: string | null; lado: Lado;
  motivo: string | null; areas: string[] | null; tejado: Tejado | null; condicion: string | null;
};
const SEL_MOV = "id,hoja_encargo_id,tipo,en,por,lado,motivo,areas,tejado,condicion";

export type Fase = "nueva" | "a_cobro" | "a_produccion" | "produccion";
export type Estado = {
  fase: Fase;
  /** El ultimo destino (a_cobro / a_produccion) que sigue vivo. */
  destino: Mov | null;
  /** La metida en produccion vigente. */
  metida: Mov | null;
  /** Direccion comprobada despues del ultimo destino. */
  direccionOk: Mov | null;
  /** pausada = en pausa; para_reanudar = facturacion la levanto y falta reabrir. */
  pausa: { como: "pausada" | "para_reanudar"; mov: Mov; levantada: Mov | null } | null;
  /** Las areas que esta hoja tiene abiertas (de su ultima metida o reanudacion). */
  areas: string[];
};

/** Lee el estado desde sus movimientos (en orden). */
export function estadoDe(movs: Mov[]): Estado {
  const m = [...movs].sort((a, b) => a.en.localeCompare(b.en));
  let destino: Mov | null = null, metida: Mov | null = null, direccionOk: Mov | null = null;
  let pausa: Estado["pausa"] = null;
  let areas: string[] = [];
  for (const x of m) {
    if (x.tipo === "a_cobro" || x.tipo === "a_produccion") { destino = x; metida = null; direccionOk = null; }
    else if (x.tipo === "devuelta") { destino = null; metida = null; direccionOk = null; }
    else if (x.tipo === "direccion_comprobada") direccionOk = x;
    else if (x.tipo === "metida_produccion") { metida = x; areas = x.areas ?? []; }
    else if (x.tipo === "pausada") pausa = { como: "pausada", mov: x, levantada: null };
    else if (x.tipo === "pausa_levantada" && pausa) pausa = { como: "para_reanudar", mov: pausa.mov, levantada: x };
    else if (x.tipo === "reanudada") { pausa = null; if (x.areas?.length) areas = x.areas; }
  }
  // La carga de lo antiguo (y cualquier metida sin destino delante): en produccion.
  const fase: Fase = metida ? "produccion" : destino ? (destino.tipo as "a_cobro" | "a_produccion") : "nueva";
  return { fase, destino, metida, direccionOk, pausa, areas: metida ? areas : [] };
}

export async function movimientosDe(hojaIds?: string[]): Promise<Map<string, Mov[]>> {
  const filas = hojaIds
    ? await porTramos<Mov>(hojaIds, (t) => `movimientos_hoja?select=${SEL_MOV}&hoja_encargo_id=in.(${t})&order=en`)
    : await leer<Mov>(`movimientos_hoja?select=${SEL_MOV}&order=en`);
  const out = new Map<string, Mov[]>();
  for (const f of filas) (out.get(f.hoja_encargo_id) ?? out.set(f.hoja_encargo_id, []).get(f.hoja_encargo_id)!).push(f);
  return out;
}

/** Los estados de todas las hojas con algun movimiento. Las que no salen aqui estan en «nueva». */
export async function estadosDeHojas(hojaIds?: string[]): Promise<Map<string, Estado>> {
  const movs = await movimientosDe(hojaIds);
  return new Map([...movs].map(([id, m]) => [id, estadoDe(m)]));
}

/** Las hojas que ya han salido de Nuevas hojas firmadas (con destino o en produccion). Para Facturable ya. */
export async function hojasPasadas(): Promise<Set<string>> {
  const e = await estadosDeHojas();
  return new Set([...e].filter(([, x]) => x.fase !== "nueva").map(([id]) => id));
}

/** Las hojas que estan trabajandose: metidas en produccion y sin pausa. Para Asignar. */
export async function hojasEnProduccion(): Promise<Map<string, Estado>> {
  const e = await estadosDeHojas();
  return new Map([...e].filter(([, x]) => x.fase === "produccion" && !x.pausa));
}

async function apuntar(yo: Yo | null, hojaId: string, tipo: TipoMov, lado: Lado, extra: Partial<Pick<Mov, "motivo" | "areas" | "tejado" | "condicion">> = {}) {
  await pedir("movimientos_hoja", {
    method: "POST",
    body: JSON.stringify({ hoja_encargo_id: hojaId, tipo, lado, por: yo?.id ?? null, motivo: extra.motivo?.trim() || null, areas: extra.areas ?? null, tejado: extra.tejado ?? null, condicion: extra.condicion?.trim() || null }),
  });
}

// ------------------------------------------------------------ la hoja, con sus lineas e hitos

type LineaH = {
  id: string; descripcion: string | null; importe: number | null; validada_en: string | null; emisor: string; pagador_tipo: string | null; forma_cobro: string | null;
  bloque: { area: string | null } | null;
  hitos: { id: string; hito: string; orden: number | null; porcentaje: number | null; importe: number | null; estado: string; notas: string | null; hito_padre_id: string | null; fecha_cobro: string | null }[];
};
type HojaH = {
  id: string; numero_hoja: string; fecha_firma: string | null; pagador_tipo: string | null; oportunidad_id: string | null;
  contrata: { nombre: string } | null;
  opp: { id: string; nombre: string | null; codigo: string | null; comercial: { nombre: string; email: string | null } | null } | null;
  lineas: LineaH[];
};
const SEL_HOJA =
  "id,numero_hoja,fecha_firma,pagador_tipo,oportunidad_id,contrata:pagador_contrata_id(nombre)," +
  "opp:oportunidad_id(id,nombre,codigo,comercial:comerciales!oportunidades_comercial_id_fkey(nombre,email))," +
  "lineas:lineas_facturacion(id,descripcion,importe,validada_en,emisor,pagador_tipo,forma_cobro,quitada_en,bloque:bloque_id(area)," +
  "hitos:hitos_cobro(id,hito,orden,porcentaje,importe,estado,notas,hito_padre_id,fecha_cobro))";

async function hojas(ids: string[]): Promise<HojaH[]> {
  if (!ids.length) return [];
  type Cruda = Omit<HojaH, "lineas"> & { lineas: (LineaH & { quitada_en: string | null })[] };
  const filas = await porTramos<Cruda>(ids, (t) => `hojas_encargo?select=${SEL_HOJA}&id=in.(${t})`);
  return filas.map((h) => ({ ...h, lineas: h.lineas.filter((l) => !l.quitada_en && EMISORES.includes(l.emisor)) }));
}

const PLAZO: Record<string, string> = {
  encargo: "al contratar", firma: "a la firma", entrega: "a la entrega", licencia: "a la licencia", inicio_obra: "al inicio de obra",
  cfo: "al fin de obra", pss: "al plan de seguridad", presentacion: "a la presentación", concesion: "a la concesión", adjudicacion: "a la adjudicación", otro: "",
};
const corta = (d: string | null) => (d ?? "").split(/\s+[—–-]\s+|\s*\(/)[0].trim().slice(0, 60);
const vivos = (l: LineaH) => l.hitos.filter((h) => h.estado !== "anulado" && !h.hito_padre_id).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
const queHito = (h: LineaH["hitos"][number]) => PLAZO[h.hito] || corta(h.notas) || "otro plazo";
export const esAlContratar = (hito: string) => hito === "encargo" || hito === "firma";

/** El primer hito de cada linea que se cobra al contratar. */
function primerCobroDe(h: HojaH) {
  return h.lineas.map((l) => ({ l, h: vivos(l)[0] })).filter((x) => x.h && esAlContratar(x.h.hito));
}
/** Cobrado el primer hito: todos los hitos de contratacion de la hoja, cobrados. */
function cobradoPrimero(h: HojaH): { cobrado: boolean; fecha: string | null } {
  const p = primerCobroDe(h);
  if (!p.length) return { cobrado: false, fecha: null };
  const ok = p.every((x) => x.h.estado === "completado");
  return { cobrado: ok, fecha: ok ? p.map((x) => x.h.fecha_cobro ?? "").sort().at(-1) || null : null };
}
const pagaDe = (h: HojaH) => (h.pagador_tipo === "contrata" ? (h.contrata?.nombre ?? "Contrata") : h.pagador_tipo === "persona" ? "Particular" : "Comunidad");
const FORMA: Record<string, string> = { cargo_cuenta: "cargo en cuenta", transferencia: "transferencia", confirming: "confirming" };

// ------------------------------------------------------------ los botones de Nuevas hojas firmadas

async function hojaDelLibro(hojaId: string): Promise<HojaH> {
  if (!uuid(hojaId)) throw new Error("Hoja no válida.");
  const [h] = await hojas([hojaId]);
  if (!h || !h.lineas.length) throw new Error("Esa hoja no es del libro de Accesalia.");
  return h;
}

/** «Pasa a cobro del primer hito» / «Pasa a produccion ya»: con todas las lineas validadas, una sola vez. */
export async function pasarHoja(yo: Yo, hojaId: string, destino: "a_cobro" | "a_produccion", motivo: string): Promise<void> {
  const h = await hojaDelLibro(hojaId);
  if (h.lineas.some((l) => !l.validada_en)) throw new Error("Faltan líneas por validar.");
  const e = estadoDe((await movimientosDe([hojaId])).get(hojaId) ?? []);
  if (e.fase !== "nueva") throw new Error("Esta hoja ya tiene destino: si hay que cambiarlo, se devuelve desde el diario.");
  if (destino === "a_produccion" && !motivo.trim()) throw new Error("Falta el motivo: ¿por qué empieza sin cobrar?");
  await apuntar(yo, hojaId, destino, "facturacion", { motivo });
}

/** Lo que se cobra al contratar y lo que espera, para el texto de antes de pulsar. */
export async function resumenDestino(hojaId: string): Promise<{ alContratar: number; lineasAlContratar: number; paga: string; esperan: string[] }> {
  const h = await hojaDelLibro(hojaId);
  const p = primerCobroDe(h);
  const ids = new Set(p.map((x) => x.l.id));
  return {
    alContratar: p.reduce((s, x) => s + Number(x.h.importe ?? 0), 0),
    lineasAlContratar: p.length,
    paga: `${pagaDe(h)}${h.lineas[0]?.forma_cobro ? ` · ${FORMA[h.lineas[0].forma_cobro] ?? h.lineas[0].forma_cobro}` : ""}`,
    esperan: h.lineas.filter((l) => !ids.has(l.id)).map((l) => `${corta(l.descripcion)} ${queHito(vivos(l)[0] ?? { hito: "otro", notas: null } as LineaH["hitos"][number])}`.trim()),
  };
}

// ------------------------------------------------------------ desde el diario y la bandeja

export async function devolverHoja(yo: Yo, hojaId: string, motivo: string): Promise<void> {
  if (!motivo.trim()) throw new Error("Falta por qué se devuelve.");
  const e = estadoDe((await movimientosDe([hojaId])).get(hojaId) ?? []);
  if (e.fase === "nueva") throw new Error("Ya está en Nuevas hojas firmadas.");
  // Si tenia areas abiertas, quedan en pausa hasta que se vuelva a meter en produccion (la hoja deja de estar en
  // produccion al volver a la lista).
  await apuntar(yo, hojaId, "devuelta", "facturacion", { motivo, areas: e.areas.length ? e.areas : null });
}

export async function pausarHoja(yo: Yo, hojaId: string, lado: "facturacion" | "secretaria", motivo: string, tejado: Tejado, condicion: string): Promise<void> {
  if (!motivo.trim()) throw new Error("Falta el motivo de la pausa.");
  if (!["accesalia", "cliente", "tercero"].includes(tejado)) throw new Error("Falta de quién depende.");
  const e = estadoDe((await movimientosDe([hojaId])).get(hojaId) ?? []);
  if (e.fase === "nueva") throw new Error("Esta hoja está en Nuevas hojas firmadas: no hay nada que pausar.");
  if (e.pausa) throw new Error("Ya está en pausa.");
  await apuntar(yo, hojaId, "pausada", lado, { motivo, tejado, condicion, areas: e.areas.length ? e.areas : null });
}

/** Facturacion levanta SU pausa: la hoja pasa a la secretaria para reanudar. */
export async function levantarPausa(yo: Yo, hojaId: string, motivo: string): Promise<void> {
  const e = estadoDe((await movimientosDe([hojaId])).get(hojaId) ?? []);
  if (e.pausa?.como !== "pausada") throw new Error("Esta hoja no está en pausa.");
  if (e.pausa.mov.lado !== "facturacion") throw new Error("Esa pausa la puso la secretaria comercial: la levanta ella.");
  await apuntar(yo, hojaId, "pausa_levantada", "facturacion", { motivo });
}

/** La secretaria reanuda: una pausa levantada por facturacion, o una suya. Reabre las areas que se pararon. */
export async function reanudarHoja(yo: Yo, hojaId: string): Promise<void> {
  const e = estadoDe((await movimientosDe([hojaId])).get(hojaId) ?? []);
  if (!e.pausa) throw new Error("Esta hoja no está en pausa.");
  if (e.pausa.como === "pausada" && e.pausa.mov.lado === "facturacion") throw new Error("La pausa la puso facturación: primero la levanta facturación.");
  await apuntar(yo, hojaId, "reanudada", "secretaria", { areas: e.pausa.mov.areas ?? (e.areas.length ? e.areas : null) });
}

export async function comprobarDireccion(yo: Yo, hojaId: string): Promise<void> {
  const e = estadoDe((await movimientosDe([hojaId])).get(hojaId) ?? []);
  if (e.fase !== "a_cobro" && e.fase !== "a_produccion") throw new Error("Esta hoja no está en la bandeja.");
  if (!e.direccionOk) await apuntar(yo, hojaId, "direccion_comprobada", "secretaria");
}

/** «Meter en produccion»: con la direccion comprobada y un area en cada linea (o ya activa). */
export async function meterEnProduccion(yo: Yo, hojaId: string, areas: string[]): Promise<void> {
  const h = await hojaDelLibro(hojaId);
  const e = estadoDe((await movimientosDe([hojaId])).get(hojaId) ?? []);
  const lista = e.fase === "a_produccion" || (e.fase === "a_cobro" && cobradoPrimero(h).cobrado);
  if (!lista) throw new Error("Esta hoja no está para meter en producción.");
  if (!e.direccionOk) throw new Error("Falta comprobar la dirección.");
  if (h.oportunidad_id && (await sinArchivar([h.oportunidad_id])).get(h.oportunidad_id)?.length) throw new Error("Falta archivar los documentos de la opp.");
  const validas = [...new Set(areas.filter((a) => a in AREAS))];
  await apuntar(yo, hojaId, "metida_produccion", "secretaria", { areas: validas.length ? validas : null });
}

// ------------------------------------------------------------ PRIMER COBRO

export type FilaPrimerCobro = {
  hojaId: string; oppId: string | null; direccion: string; hoja: string; paga: string; forma: string | null;
  alContratar: number; alTxt: string; despues: string[]; desde: string;
  cobro: { como: "sin" | "proforma" | "factura"; texto: string; sinRespuesta: boolean; proformaId: string | null };
};
export type PrimerCobro = { alContratar: FilaPrimerCobro[]; sinContratar: { hojaId: string; oppId: string | null; direccion: string; hoja: string; paga: string; primerHito: string; desde: string }[] };

const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
function laborablesDesde(iso: string): number {
  let n = 0;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  const fin = new Date(`${hoyISO()}T12:00:00Z`);
  while (d < fin) { d.setUTCDate(d.getUTCDate() + 1); const s = d.getUTCDay(); if (s !== 0 && s !== 6) n++; }
  return n;
}
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const fechaCorta = (iso: string) => FECHA.format(new Date(iso.slice(0, 10) + "T00:00:00Z")).replace(".", "");

export async function primerCobro(): Promise<PrimerCobro> {
  const estados = await estadosDeHojas();
  const ids = [...estados].filter(([, e]) => e.fase === "a_cobro").map(([id]) => id);
  const hs = (await hojas(ids)).filter((h) => !cobradoPrimero(h).cobrado);
  const hitoIds = hs.flatMap((h) => primerCobroDe(h).map((x) => x.h.id));
  const [enProforma, enFactura] = await Promise.all([
    hitoIds.length
      ? porTramos<{ hito_cobro_id: string; linea: { proforma: { id: string; codigo: string; estado: string; fecha: string; factura_id: string | null; se_puede_cobrar_en: string | null } | null } | null }>(hitoIds,
          (t) => `proforma_linea_hitos?select=hito_cobro_id,linea:proforma_linea_id(proforma:proforma_id(id,codigo,estado,fecha,factura_id,se_puede_cobrar_en))&hito_cobro_id=in.(${t})`)
      : [],
    hitoIds.length
      ? porTramos<{ hito_cobro_id: string; linea: { factura: { anio: number; numero: number; estado: string } | null } | null }>(hitoIds,
          (t) => `factura_linea_hitos?select=hito_cobro_id,linea:factura_linea_id(factura:factura_id(anio,numero,estado))&hito_cobro_id=in.(${t})`)
      : [],
  ]);
  const proformaDe = new Map(enProforma.filter((x) => x.linea?.proforma?.estado === "emitida").map((x) => [x.hito_cobro_id, x.linea!.proforma!]));
  const facturaDe = new Map(enFactura.filter((x) => x.linea?.factura && x.linea.factura.estado !== "anulada").map((x) => [x.hito_cobro_id, x.linea!.factura!]));
  // Cuando se envio cada proforma (el primer correo bueno), para el aviso de los 3 dias laborables.
  const pfs = [...new Map([...proformaDe.values()].map((p) => [p.id, p])).values()];
  const envio = new Map(
    await Promise.all(pfs.map(async (p) => {
      const [c] = await leer<{ creado_en: string }>(
        `correos_enviados?select=creado_en&ok=is.true&documentos=cs.${encodeURIComponent(JSON.stringify([{ tipo: "Proforma", id: p.id }]))}&order=creado_en.asc&limit=1`,
      ).catch(() => []);
      return [p.id, c?.creado_en ?? null] as const;
    })),
  );

  const out: PrimerCobro = { alContratar: [], sinContratar: [] };
  for (const h of hs) {
    const e = estados.get(h.id)!;
    const dir = h.opp ? nombreDeOpp(h.opp) : "—";
    const p = primerCobroDe(h);
    if (!p.length) {
      const primero = h.lineas.map((l) => vivos(l)[0]).filter(Boolean)[0];
      out.sinContratar.push({ hojaId: h.id, oppId: h.oportunidad_id, direccion: dir, hoja: h.numero_hoja, paga: pagaDe(h), primerHito: primero ? queHito(primero) : "sin hitos", desde: e.destino!.en });
      continue;
    }
    const ids = new Set(p.map((x) => x.l.id));
    const factura = p.map((x) => facturaDe.get(x.h.id)).find(Boolean);
    const proforma = p.map((x) => proformaDe.get(x.h.id)).find(Boolean);
    const enviada = proforma ? envio.get(proforma.id) ?? null : null;
    out.alContratar.push({
      hojaId: h.id, oppId: h.oportunidad_id, direccion: dir, hoja: h.numero_hoja, paga: pagaDe(h),
      forma: h.lineas[0]?.forma_cobro ? (FORMA[h.lineas[0].forma_cobro] ?? h.lineas[0].forma_cobro) : null,
      alContratar: p.reduce((s, x) => s + Number(x.h.importe ?? 0), 0),
      alTxt: p.map((x) => `${x.h.porcentaje != null ? `${Number(x.h.porcentaje).toLocaleString("es-ES")} % ` : ""}${corta(x.l.descripcion)}`).join(" · "),
      despues: [
        ...p.flatMap((x) => vivos(x.l).slice(1).map((y) => `${corta(x.l.descripcion)} ${queHito(y)}: ${y.importe == null ? "a éxito" : `${EUR.format(Number(y.importe))} €`}`)),
        ...h.lineas.filter((l) => !ids.has(l.id)).flatMap((l) => vivos(l).map((y) => `${corta(l.descripcion)} ${queHito(y)}: ${y.importe == null ? "a éxito" : `${EUR.format(Number(y.importe))} €`}`)),
      ],
      desde: e.destino!.en,
      cobro: factura
        ? { como: "factura", texto: `Factura ${factura.anio}/${factura.numero} · esperando el cobro`, sinRespuesta: false, proformaId: proforma?.id ?? null }
        : proforma
          ? {
              como: "proforma",
              texto: proforma.se_puede_cobrar_en ? `Proforma ${proforma.codigo} · ok recibido` : enviada ? `Proforma ${proforma.codigo} enviada el ${fechaCorta(enviada)} · esperando el ok` : `Proforma ${proforma.codigo} sin enviar`,
              sinRespuesta: !!enviada && !proforma.se_puede_cobrar_en && laborablesDesde(enviada) > 3,
              proformaId: proforma.id,
            }
          : { como: "sin", texto: "Sin proforma", sinRespuesta: false, proformaId: null },
    });
  }
  out.alContratar.sort((a, b) => a.desde.localeCompare(b.desde));
  return out;
}

// ------------------------------------------------------------ LA BANDEJA COMERCIAL

export type LineaBandeja = { id: string; concepto: string; importe: number | null; hitos: string; areas: { area: string; ya: string | null }[] };
export type HojaBandeja = {
  hojaId: string; oppId: string | null; direccion: string; hoja: string; paga: string; firma: string | null; pdf: string | null;
  por: "a_produccion" | "cobrado"; motivo: string; quien: string; cuando: string;
  /** Lo que se ha soltado en el cajon de su opp y sigue sin archivar (25-oct-2026). */
  direccionOk: boolean; documentos: DocCajon[];
  lineas: LineaBandeja[];
};
export type EnPausa = { hojaId: string; direccion: string; hoja: string; paga: string; areas: string[]; motivo: string; tejado: Tejado | null; condicion: string | null; lado: Lado; quien: string; desde: string; levantada: { motivo: string | null; quien: string; en: string } | null };
/** Lo soltado en opps que no tienen ninguna hoja en la bandeja (antes de firmar, por ejemplo). */
export type Suelto = { oppId: string; direccion: string; docs: DocCajon[] };
export type Bandeja = { porMeter: HojaBandeja[]; paraReanudar: EnPausa[]; enPausa: EnPausa[]; sueltos: Suelto[]; tipos: GrupoTipos[] };

async function nombres(ids: (string | null)[]): Promise<Map<string, string>> {
  const u = [...new Set(ids.filter((x): x is string => !!x))];
  if (!u.length) return new Map();
  return new Map((await porTramos<{ id: string; nombre: string }>(u, (t) => `equipo?select=id,nombre&id=in.(${t})`)).map((p) => [p.id, p.nombre]));
}
const quienEs = (n: Map<string, string>, m: Mov) => (m.por ? (n.get(m.por) ?? "alguien") : "la app");

export async function bandeja(): Promise<Bandeja> {
  const estados = await estadosDeHojas();
  const candidatas = [...estados].filter(([, e]) => e.fase === "a_cobro" || e.fase === "a_produccion").map(([id]) => id);
  const pausadas = [...estados].filter(([, e]) => e.pausa).map(([id]) => id);
  const hs = await hojas([...new Set([...candidatas, ...pausadas])]);
  const porId = new Map(hs.map((h) => [h.id, h]));
  const listas = hs.filter((h) => candidatas.includes(h.id)).filter((h) => estados.get(h.id)!.fase === "a_produccion" || cobradoPrimero(h).cobrado);

  // Las areas ya activas en cada opp: las de sus otras hojas en produccion y sin pausa.
  const opps = [...new Set(listas.map((h) => h.oportunidad_id).filter((x): x is string => !!x))];
  const hermanas = opps.length ? await porTramos<{ id: string; numero_hoja: string; oportunidad_id: string }>(opps, (t) => `hojas_encargo?select=id,numero_hoja,oportunidad_id&oportunidad_id=in.(${t})`) : [];
  const activas = new Map<string, Map<string, string>>(); // opp -> area -> hoja que la abrio
  for (const x of hermanas) {
    const e = estados.get(x.id);
    if (!e || e.fase !== "produccion" || e.pausa) continue;
    const m = activas.get(x.oportunidad_id) ?? activas.set(x.oportunidad_id, new Map()).get(x.oportunidad_id)!;
    for (const a of e.areas) if (!m.has(a)) m.set(a, x.numero_hoja);
  }
  // El PDF firmado (como en Nuevas hojas firmadas) y los documentos de la opp.
  const [versiones, docs, tipos] = await Promise.all([
    listas.length ? porTramos<{ id: string; hoja_encargo_id: string; numero_version: number; pdfs_firmados: string[] | null }>(listas.map((h) => h.id),
      (t) => `versiones_hoja?select=id,hoja_encargo_id,numero_version,pdfs_firmados&hoja_encargo_id=in.(${t})`) : [],
    sinArchivar(),
    tiposCajon(),
  ]);
  const movsTodos = listas.flatMap((h) => [estados.get(h.id)!.destino!]).concat(pausadas.map((id) => estados.get(id)!.pausa!.mov), pausadas.flatMap((id) => estados.get(id)!.pausa!.levantada ?? []));
  const n = await nombres(movsTodos.map((m) => m.por));

  const porMeter: HojaBandeja[] = listas.map((h) => {
    const e = estados.get(h.id)!;
    const v = versiones.filter((x) => x.hoja_encargo_id === h.id && x.pdfs_firmados?.length).sort((a, b) => b.numero_version - a.numero_version)[0];
    const cob = cobradoPrimero(h);
    const ya = h.oportunidad_id ? activas.get(h.oportunidad_id) : undefined;
    return {
      hojaId: h.id, oppId: h.oportunidad_id, direccion: h.opp ? nombreDeOpp(h.opp) : "—", hoja: h.numero_hoja, paga: pagaDe(h), firma: h.fecha_firma,
      pdf: v ? `/facturacion/documento/${h.id}/${v.id}/${v.pdfs_firmados!.length - 1}` : null,
      por: (e.fase === "a_produccion" ? "a_produccion" : "cobrado") as HojaBandeja["por"],
      motivo: e.fase === "a_produccion" ? (e.destino!.motivo ?? "") : `Cobrado el primer hito${cob.fecha ? ` el ${fechaCorta(cob.fecha)}` : ""}`,
      quien: quienEs(n, e.destino!), cuando: e.destino!.en,
      direccionOk: !!e.direccionOk,
      documentos: (h.oportunidad_id ? docs.get(h.oportunidad_id) : undefined) ?? [],
      lineas: h.lineas.map((l) => ({
        id: l.id, concepto: l.descripcion ?? "", importe: l.importe == null ? null : Number(l.importe),
        hitos: vivos(l).map((y) => `${y.porcentaje != null ? `${Number(y.porcentaje).toLocaleString("es-ES")} % ` : ""}${queHito(y)}`).join(" · "),
        areas: l.bloque?.area ? [{ area: l.bloque.area, ya: ya?.get(l.bloque.area) ?? null }] : [],
      })),
    };
  }).sort((a, b) => a.cuando.localeCompare(b.cuando));

  const pausa = (id: string): EnPausa => {
    const h = porId.get(id)!, e = estados.get(id)!, p = e.pausa!;
    return {
      hojaId: id, direccion: h?.opp ? nombreDeOpp(h.opp) : "—", hoja: h?.numero_hoja ?? "", paga: h ? pagaDe(h) : "", areas: p.mov.areas ?? e.areas,
      motivo: p.mov.motivo ?? "", tejado: p.mov.tejado, condicion: p.mov.condicion, lado: p.mov.lado, quien: quienEs(n, p.mov), desde: p.mov.en,
      levantada: p.levantada ? { motivo: p.levantada.motivo, quien: quienEs(n, p.levantada), en: p.levantada.en } : null,
    };
  };
  const conHoja = pausadas.filter((id) => porId.has(id));
  // Los sueltos: lo sin archivar de opps sin hoja en «por meter en produccion».
  const conHojaEnBandeja = new Set(opps);
  const otras = [...docs.keys()].filter((o) => !conHojaEnBandeja.has(o));
  const nombresOpp = otras.length ? await porTramos<{ id: string; nombre: string | null; codigo: string | null }>(otras, (t) => `oportunidades?select=id,nombre,codigo&id=in.(${t})`) : [];
  const sueltos = otras.map((o) => {
    const op = nombresOpp.find((x) => x.id === o);
    return { oppId: o, direccion: op ? nombreDeOpp(op) : "—", docs: docs.get(o)! };
  }).sort((a, b) => a.docs[0].subido.localeCompare(b.docs[0].subido));
  return {
    porMeter,
    sueltos,
    tipos,
    paraReanudar: conHoja.filter((id) => estados.get(id)!.pausa!.como === "para_reanudar").map(pausa),
    enPausa: conHoja.filter((id) => estados.get(id)!.pausa!.como === "pausada").map(pausa).sort((a, b) => a.desde.localeCompare(b.desde)),
  };
}

// ------------------------------------------------------------ EL DIARIO

export type FilaDiario = {
  clave: string; hojaId: string; direccion: string; hoja: string; paga: string; en: string;
  tipo: TipoMov | "primer_cobro"; lado: Lado; quien: string; motivo: string | null; areas: string[]; tejado: Tejado | null; condicion: string | null;
  /** Deshecho por una devolucion posterior. */
  deshecho: boolean;
  /** Lo que se puede hacer desde esta fila (solo en la fila vigente de la hoja). */
  puede: { devolver: boolean; pausar: boolean; levantar: boolean };
};
export type Diario = { filas: FilaDiario[]; avisos: { hojaId: string; direccion: string; cobrado: string }[] };

/** Los movimientos de los ultimos `dias` dias (por defecto 60), y lo que se puede hacer con cada hoja. Lo de la carga
 *  de lo antiguo no sale: no es trabajo de nadie. */
export async function diario(dias = 60): Promise<Diario> {
  const desde = new Date(Date.now() - dias * 86400000).toISOString();
  const recientes = await leer<Mov>(`movimientos_hoja?select=${SEL_MOV}&en=gte.${desde}&lado=neq.app&order=en.desc`);
  const ids = [...new Set(recientes.map((m) => m.hoja_encargo_id))];
  const [todos, hs] = await Promise.all([movimientosDe(ids), hojas(ids)]);
  const porId = new Map(hs.map((h) => [h.id, h]));
  const n = await nombres(recientes.map((m) => m.por));
  const filas: FilaDiario[] = [];
  const avisos: Diario["avisos"] = [];
  for (const id of ids) {
    const h = porId.get(id);
    const movs = (todos.get(id) ?? []).sort((a, b) => a.en.localeCompare(b.en));
    const e = estadoDe(movs);
    const dir = h?.opp ? nombreDeOpp(h.opp) : "—";
    // Lo deshecho: cada destino (y lo que colgaba de el) anterior a una devolucion.
    const ultimaDev = movs.filter((m) => m.tipo === "devuelta").at(-1)?.en ?? "";
    const vigente = [...movs].reverse().find((m) => ["a_cobro", "a_produccion", "metida_produccion"].includes(m.tipo) && m.en > ultimaDev);
    for (const m of movs.filter((x) => x.lado !== "app" && x.en >= desde)) {
      const esVigente = vigente?.id === m.id && e.fase !== "nueva";
      filas.push({
        clave: m.id, hojaId: id, direccion: dir, hoja: h?.numero_hoja ?? "", paga: h ? pagaDe(h) : "", en: m.en, tipo: m.tipo, lado: m.lado, quien: quienEs(n, m),
        motivo: m.motivo, areas: m.areas ?? [], tejado: m.tejado, condicion: m.condicion,
        deshecho: ["a_cobro", "a_produccion", "metida_produccion", "direccion_comprobada"].includes(m.tipo) && m.en < ultimaDev,
        puede: {
          devolver: esVigente,
          pausar: esVigente && !e.pausa,
          levantar: m.tipo === "pausada" && e.pausa?.como === "pausada" && e.pausa.mov.id === m.id && m.lado === "facturacion",
        },
      });
    }
    // El primer hito cobrado (lo dicen los hitos): una fila mas, con su fecha.
    if (h && e.destino?.tipo === "a_cobro") {
      const c = cobradoPrimero(h);
      if (c.cobrado && c.fecha)
        filas.push({
          clave: `cobro-${id}`, hojaId: id, direccion: dir, hoja: h.numero_hoja, paga: pagaDe(h), en: c.fecha > e.destino.en.slice(0, 10) ? `${c.fecha}T23:59:00Z` : e.destino.en,
          tipo: "primer_cobro", lado: "facturacion", quien: "", motivo: "Justificante del banco", areas: [], tejado: null, condicion: null, deshecho: false,
          puede: { devolver: false, pausar: false, levantar: false },
        });
    }
    // Pausada por facturacion y con algo cobrado despues: ¿se levanta?
    if (h && e.pausa?.como === "pausada" && e.pausa.mov.lado === "facturacion") {
      const cobro = h.lineas.flatMap((l) => l.hitos).map((x) => x.fecha_cobro ?? "").filter((f) => f && f >= e.pausa!.mov.en.slice(0, 10)).sort().at(-1);
      if (cobro) avisos.push({ hojaId: id, direccion: dir, cobrado: cobro });
    }
  }
  filas.sort((a, b) => b.en.localeCompare(a.en));
  return { filas, avisos };
}

// ------------------------------------------------------------ cuentas para los menus

export async function cuentasRecorrido(): Promise<{ primerCobro: number; bandeja: number }> {
  const estados = await estadosDeHojas();
  const aCobro = [...estados].filter(([, e]) => e.fase === "a_cobro").map(([id]) => id);
  const hs = await hojas(aCobro);
  const cobradas = new Set(hs.filter((h) => cobradoPrimero(h).cobrado).map((h) => h.id));
  return {
    primerCobro: aCobro.filter((id) => !cobradas.has(id)).length,
    bandeja: [...estados].filter(([id, e]) => e.fase === "a_produccion" || (e.fase === "a_cobro" && cobradas.has(id))).length
      + [...estados].filter(([, e]) => e.pausa?.como === "para_reanudar").length,
  };
}
