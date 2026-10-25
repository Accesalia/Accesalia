// lib/nuevasHojas.ts
//
// NUEVAS HOJAS ENCARGO FIRMADAS (Monica, 12-oct-2026). La lista: las hojas
// firmadas de 2025-26 a las que les queda alguna linea sin validar (lo de 2024
// y antes, y lo de 2025-26 ya facturado o a falta solo de lo de a exito, se dio
// por validado en la carga). La hoja sale de la lista cuando todas sus lineas
// estan validadas. Libro de Accesalia: lineas de Accesalia y Daniel; las de
// Ecobalance no las ve Alexandra.
//
// Al abrir una: el PDF firmado a un lado y, al otro, cada linea con su importe
// y debajo sus hitos. Se corrige pinchando en el dato, se anade la linea que la
// app se haya saltado y se valida cada linea por separado. Siempre queda dicho
// quien lo toco.

import "server-only";
import type { Yo } from "./sesion";
import { nombreDeOpp } from "./direccionOpp";
import { enviarCorreo } from "./correo";
import { movimientosDe, resumenDestino } from "./recorridoHoja";
import { hojasDeFacturacion, urlFirmada } from "./hojasNuevas";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...CAB, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
const leer = async <T>(path: string): Promise<T> => (await pedir(path)).json() as Promise<T>;
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);
const enLista = (ids: string[]) => `(${ids.join(",")})`;
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

export const EMISORES_ACCESALIA = ["accesalia", "daniel_autonomo"];
/** Desde cuando entran hojas en la lista (lo anterior se valido en la carga). */
/** (Lo de antes de la migracion: desde cuando entraban hojas en la lista. Ya no filtra: lo dice la fase.) */
export const DESDE = "2025-01-01";

export function puedeValidar(yo: Yo): boolean {
  return yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion" || f.clave === "control_produccion");
}

// ------------------------------------------------------------ la lista

export type FilaNueva = {
  id: string;
  numero: string;
  fechaFirma: string;
  dias: number;
  direccion: string;
  comercial: string | null;
  lineas: number;
  validadas: number;
  dudas: number;
  /** Devuelta a la lista desde el diario, con su motivo. */
  devuelta: string | null;
};

/** LA LISTA (hojas nuevas, dia de la migracion): las hojas que el comercial ya ha dado por buenas (ok_comercial) y aun
 *  no tienen destino: con lineas por validar, o todas validadas sin elegir a donde van (hitos_validados; tambien las
 *  devueltas desde el diario). Salen al pulsar uno de los dos botones. */
export async function nuevasHojas(): Promise<FilaNueva[]> {
  // Como antes de la migracion: las firmadas desde 2025 (DESDE) con alguna linea de Accesalia o Daniel. Las de antes que
  // nunca se validaron (189 al migrar) se quedan fuera de la lista, como hasta ahora.
  const hs = (await hojasDeFacturacion({ fases: ["ok_comercial", "hitos_validados"] }))
    .filter((h) => h.lineas.length > 0 && !!h.fecha_firma && h.fecha_firma >= DESDE);
  if (!hs.length) return [];
  const ids = hs.map((h) => h.id);
  const lids = hs.flatMap((h) => h.lineas.map((l) => l.id));
  const [movs, dudas] = await Promise.all([
    movimientosDe(ids),
    lids.length ? leerTramos<{ linea_facturacion_id: string }>(lids, (t) => `notas_facturacion?select=linea_facturacion_id&linea_facturacion_id=in.(${t})&tipo=eq.duda&resuelta_en=is.null`) : [],
  ]);
  // Las devueltas desde el diario: con su motivo, para saber por que han vuelto.
  const devueltas = new Map<string, string>();
  for (const [id, m] of movs) {
    const ult = [...m].sort((a, b) => a.en.localeCompare(b.en)).filter((x) => ["a_cobro", "a_produccion", "devuelta"].includes(x.tipo)).at(-1);
    if (ult?.tipo === "devuelta") devueltas.set(id, ult.motivo ?? "");
  }
  const hoyMs = Date.parse(hoy());
  return hs
    .map((h) => ({
      id: h.id, numero: h.numero_hoja, fechaFirma: h.fecha_firma ?? hoy(),
      dias: h.fecha_firma ? Math.max(0, Math.round((hoyMs - Date.parse(h.fecha_firma)) / 86400000)) : 0,
      direccion: h.opp ? nombreDeOpp(h.opp) : "—", // la direccion es el nombre de la opp (13-oct-2026)
      comercial: h.opp?.comercial?.nombre ?? null,
      lineas: h.lineas.length, validadas: h.lineas.filter((l) => l.validada_en).length,
      dudas: dudas.filter((d) => h.lineas.some((l) => l.id === d.linea_facturacion_id)).length,
      devuelta: devueltas.get(h.id) ?? null,
    }))
    // Las que mas tiempo llevan esperando, arriba.
    .sort((a, b) => a.fechaFirma.localeCompare(b.fechaFirma) || a.numero.localeCompare(b.numero));
}

async function leerTramos<T>(ids: string[], hacer: (t: string) => string): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 150) out.push(...((await leer<T[]>(hacer(ids.slice(i, i + 150).join(",")))) ?? []));
  return out;
}

// ------------------------------------------------------------ una hoja abierta

export type HitoAbierto = { id: string; texto: string; porcentaje: number | null; importe: number | null; quien: string | null };
export type DudaAbierta = {
  id: string; texto: string; autor: string | null; fecha: string;
  /** A quien se envio por correo (25-oct-2026). */
  enviada: { a: "comercial" | "direccion"; en: string; para: string[] } | null;
};
/** A donde va la hoja (25-oct-2026): lo que se cobra al contratar y lo que espera, para decidir. */
export type DestinoHoja = { alContratar: number; lineasAlContratar: number; paga: string; esperan: string[] };
export type LineaAbierta = {
  id: string;
  concepto: string;
  importe: number | null;
  esPorcentaje: boolean;
  porcentaje: number | null;
  base: string | null;
  manual: boolean;
  /** De la hoja firmada: el concepto, el importe y el % no se corrigen aqui (lo firmado no se toca; si no cuadra,
   *  una duda). Solo las añadidas a mano se escriben enteras. Los hitos, siempre (son de facturacion). */
  fija: boolean;
  validada: { en: string; por: string | null } | null;
  editada: { en: string; por: string | null } | null;
  creadaPor: string | null;
  hitos: HitoAbierto[];
  dudas: DudaAbierta[];
};
export type HojaAbierta = { id: string; numero: string; pdf: string | null; lineas: LineaAbierta[]; destino: DestinoHoja | null; devuelta: string | null };

const TEXTO_HITO: Record<string, string> = {
  firma: "A la firma", encargo: "A la contratación", entrega: "A la entrega del proyecto", licencia: "A la licencia",
  pss: "A la firma del Plan de Seguridad y Salud", inicio_obra: "Al inicio de obra", cfo: "Al fin de obra (CFO)",
  presentacion: "A la presentación", concesion: "A la concesión", adjudicacion: "A la adjudicación", otro: "",
};

export async function hojaAbierta(hojaId: string): Promise<HojaAbierta | null> {
  if (!uuid(hojaId)) return null;
  const [h] = await hojasDeFacturacion({ ids: [hojaId] });
  if (!h) return null;
  const pdf = urlFirmada(h);
  const lineas = h.lineas;
  const lids = lineas.map((l) => l.id);
  const dudas = lids.length
    ? await leer<{ id: string; linea_facturacion_id: string; texto: string; autor: string | null; fecha: string; enviada_a: "comercial" | "direccion" | null; enviada_en: string | null; enviada_para: string[] | null }[]>(
        `notas_facturacion?select=id,linea_facturacion_id,texto,autor,fecha,enviada_a,enviada_en,enviada_para&linea_facturacion_id=in.${enLista(lids)}&tipo=eq.duda&resuelta_en=is.null&order=creado_en`,
      )
    : [];
  // Con todas las lineas validadas y sin destino: lo que hace falta para elegir a donde va.
  const todas = lineas.length > 0 && lineas.every((l) => l.validada_en);
  const movs = (await movimientosDe([hojaId])).get(hojaId) ?? [];
  const ultDestino = [...movs].sort((a, b) => a.en.localeCompare(b.en)).filter((x) => ["a_cobro", "a_produccion", "devuelta"].includes(x.tipo)).at(-1);
  const sinDestino = !ultDestino || ultDestino.tipo === "devuelta";
  const destino = todas && sinDestino ? await resumenDestino(hojaId) : null;
  const personas = new Set<string>();
  for (const l of lineas) {
    [l.validada_por, l.editada_por, l.creada_por].forEach((x) => x && personas.add(x));
    l.hitos.forEach((x) => [x.editado_por, x.creado_por].forEach((y) => y && personas.add(y)));
  }
  const nombres = new Map<string, string>();
  if (personas.size) {
    for (const p of await leer<{ id: string; nombre: string }[]>(`equipo?select=id,nombre&id=in.${enLista([...personas])}`)) nombres.set(p.id, p.nombre);
  }
  const quien = (id: string | null) => (id ? nombres.get(id) ?? "alguien" : null);

  return {
    id: h.id,
    numero: h.numero_hoja,
    pdf,
    lineas: lineas.map((l) => ({
      id: l.id,
      concepto: l.descripcion ?? "",
      importe: l.importe == null ? null : Number(l.importe),
      esPorcentaje: l.es_porcentaje,
      porcentaje: l.porcentaje == null ? null : Number(l.porcentaje),
      base: null,
      manual: l.origen === "manual",
      fija: !!l.he_linea_id,
      validada: l.validada_en ? { en: l.validada_en, por: quien(l.validada_por) } : null,
      editada: l.editada_en ? { en: l.editada_en, por: quien(l.editada_por) } : null,
      creadaPor: quien(l.creada_por),
      hitos: l.hitos
        .filter((x) => x.estado !== "anulado" && !x.hito_padre_id)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((x) => ({
          id: x.id,
          texto: x.notas?.trim() || TEXTO_HITO[x.hito] || "",
          porcentaje: x.porcentaje == null ? null : Number(x.porcentaje),
          importe: x.importe == null ? null : Number(x.importe),
          quien: quien(x.editado_por ?? x.creado_por),
        })),
      dudas: dudas.filter((d) => d.linea_facturacion_id === l.id).map((d) => ({
        id: d.id, texto: d.texto, autor: d.autor, fecha: d.fecha,
        enviada: d.enviada_a && d.enviada_en ? { a: d.enviada_a, en: d.enviada_en, para: d.enviada_para ?? [] } : null,
      })),
    })),
    destino,
    devuelta: ultDestino?.tipo === "devuelta" ? (ultDestino.motivo ?? "") : null,
  };
}

// ------------------------------------------------------------ los cambios

const ahora = () => new Date().toISOString();
const nombreDe = (yo: Yo) => [yo.nombre, yo.apellidos].filter(Boolean).join(" ");

/** La linea, si es del libro de Accesalia y de una hoja firmada. Cada cambio lo comprueba. */
async function lineaDelLibro(lineaId: string) {
  if (!uuid(lineaId)) throw new Error("Línea no válida.");
  const [f] = await leer<{ id: string; hoja_id: string; he_linea_id: string | null; emisor: string; validada_en: string | null; extraido: unknown; descripcion: string | null; importe: number | null; porcentaje: number | null; es_porcentaje: boolean }[]>(
    `facturacion_lineas?select=id,hoja_id,he_linea_id,emisor,validada_en,extraido,descripcion,importe,porcentaje,es_porcentaje&id=eq.${lineaId}`,
  );
  if (!f || !EMISORES_ACCESALIA.includes(f.emisor)) throw new Error("Esa línea no es de Accesalia.");
  // hoja_encargo_id = la hoja (la version), como la llaman todas las funciones de aqui.
  return { ...f, hoja_encargo_id: f.hoja_id };
}

/** La primera vez que alguien corrige una linea, se guarda lo que la app extrajo. */
async function guardarExtraido(l: Awaited<ReturnType<typeof lineaDelLibro>>) {
  if (l.extraido) return;
  const hitos = await leer<unknown[]>(`hitos_cobro?select=id,hito,orden,porcentaje,importe,estado,notas&linea_facturacion_id=eq.${l.id}`);
  await pedir(`lineas_facturacion?id=eq.${l.id}`, {
    method: "PATCH",
    body: JSON.stringify({ extraido: { descripcion: l.descripcion, importe: l.importe, porcentaje: l.porcentaje, es_porcentaje: l.es_porcentaje, hitos } }),
  });
}

async function marcarEditada(lineaId: string, yo: Yo) {
  await pedir(`lineas_facturacion?id=eq.${lineaId}`, { method: "PATCH", body: JSON.stringify({ editada_en: ahora(), editada_por: yo.id }) });
}

function aNumero(v: string): number | null {
  const t = v.replace(/[^0-9,.-]/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  if (!Number.isFinite(n)) throw new Error("Eso no es un número.");
  return n;
}

export type CampoLinea = "concepto" | "importe" | "porcentaje";
export async function corregirLinea(lineaId: string, campo: CampoLinea, valor: string, yo: Yo): Promise<string> {
  const l = await lineaDelLibro(lineaId);
  if (l.validada_en) throw new Error("La línea ya está validada: se cambia desde Modificar Hitos.");
  if (l.he_linea_id) throw new Error("Esto es lo firmado y no se cambia aquí: si no cuadra, pon una duda.");
  await guardarExtraido(l);
  const cambio = campo === "concepto" ? { descripcion: valor.trim() } : campo === "importe" ? { importe: aNumero(valor) } : { porcentaje: aNumero(valor) };
  await pedir(`lineas_facturacion?id=eq.${lineaId}`, { method: "PATCH", body: JSON.stringify({ ...cambio, editada_en: ahora(), editada_por: yo.id }) });
  return l.hoja_encargo_id;
}

export type CampoHito = "texto" | "porcentaje" | "importe";
async function hitoDelLibro(hitoId: string) {
  if (!uuid(hitoId)) throw new Error("Hito no válido.");
  const [h] = await leer<{ id: string; linea_facturacion_id: string }[]>(`hitos_cobro?select=id,linea_facturacion_id&id=eq.${hitoId}`);
  if (!h) throw new Error("No se encuentra el hito.");
  return { h, l: await lineaDelLibro(h.linea_facturacion_id) };
}
export async function corregirHito(hitoId: string, campo: CampoHito, valor: string, yo: Yo): Promise<string> {
  const { l } = await hitoDelLibro(hitoId);
  if (l.validada_en) throw new Error("La línea ya está validada: se cambia desde Modificar Hitos.");
  await guardarExtraido(l);
  const cambio = campo === "texto" ? { notas: valor.trim() || null } : campo === "porcentaje" ? { porcentaje: aNumero(valor) } : { importe: aNumero(valor) };
  await pedir(`hitos_cobro?id=eq.${hitoId}`, { method: "PATCH", body: JSON.stringify({ ...cambio, editado_en: ahora(), editado_por: yo.id }) });
  await marcarEditada(l.id, yo);
  return l.hoja_encargo_id;
}

export async function anadirHito(lineaId: string, yo: Yo): Promise<string> {
  const l = await lineaDelLibro(lineaId);
  if (l.validada_en) throw new Error("La línea ya está validada.");
  await guardarExtraido(l);
  const [ult] = await leer<{ orden: number | null }[]>(`hitos_cobro?select=orden&linea_facturacion_id=eq.${lineaId}&order=orden.desc.nullslast&limit=1`);
  await pedir("hitos_cobro", {
    method: "POST",
    body: JSON.stringify({ linea_facturacion_id: lineaId, hito: "otro", orden: (ult?.orden ?? 0) + 1, estado: "pendiente", creado_por: yo.id, editado_en: ahora(), editado_por: yo.id }),
  });
  await marcarEditada(lineaId, yo);
  return l.hoja_encargo_id;
}

/** Quitar un hito = anularlo (no se borra). */
export async function quitarHito(hitoId: string, yo: Yo): Promise<string> {
  const { l } = await hitoDelLibro(hitoId);
  if (l.validada_en) throw new Error("La línea ya está validada.");
  await guardarExtraido(l);
  await pedir(`hitos_cobro?id=eq.${hitoId}`, { method: "PATCH", body: JSON.stringify({ estado: "anulado", editado_en: ahora(), editado_por: yo.id }) });
  await marcarEditada(l.id, yo);
  return l.hoja_encargo_id;
}

/** La linea que la app se salto: a mano, con un hito en blanco. */
export async function anadirLinea(hojaId: string, yo: Yo): Promise<string> {
  if (!uuid(hojaId)) throw new Error("Hoja no válida.");
  const r = await pedir("lineas_facturacion?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ he_version_id: hojaId, descripcion: "", origen: "manual", verificado: false, emisor: "accesalia", es_porcentaje: false, creada_por: yo.id, editada_en: ahora(), editada_por: yo.id }),
  });
  const [l] = (await r.json()) as { id: string }[];
  await pedir("hitos_cobro", {
    method: "POST",
    body: JSON.stringify({ linea_facturacion_id: l.id, hito: "otro", orden: 1, estado: "pendiente", creado_por: yo.id }),
  });
  return hojaId;
}

/** Quitar una linea no la borra: queda apartada, con quien y cuando. */
export async function quitarLinea(lineaId: string, yo: Yo): Promise<string> {
  const l = await lineaDelLibro(lineaId);
  if (l.validada_en) throw new Error("La línea ya está validada.");
  if (l.he_linea_id) throw new Error("Esta línea es de la hoja firmada y no se quita: si sobra, pon una duda.");
  await pedir(`lineas_facturacion?id=eq.${lineaId}`, { method: "PATCH", body: JSON.stringify({ quitada_en: ahora(), quitada_por: yo.id }) });
  return l.hoja_encargo_id;
}

/** Validar: solo si sus hitos con importe suman el importe de la linea. */
export async function validarLinea(lineaId: string, yo: Yo): Promise<string> {
  const l = await lineaDelLibro(lineaId);
  if (l.validada_en) return l.hoja_encargo_id;
  if (!l.descripcion?.trim()) throw new Error("La línea no tiene concepto.");
  const hitos = await leer<{ importe: number | null; estado: string; hito_padre_id: string | null }[]>(
    `hitos_cobro?select=importe,estado,hito_padre_id&linea_facturacion_id=eq.${lineaId}`,
  );
  const vivos = hitos.filter((h) => h.estado !== "anulado" && !h.hito_padre_id);
  if (!vivos.length) throw new Error("La línea no tiene ningún hito.");
  if (l.importe != null && !l.es_porcentaje) {
    const suma = vivos.reduce((s, h) => s + (h.importe == null ? 0 : Number(h.importe)), 0);
    if (Math.abs(suma - Number(l.importe)) > 0.005) throw new Error("Los hitos no suman el importe de la línea.");
  }
  await pedir(`lineas_facturacion?id=eq.${lineaId}`, { method: "PATCH", body: JSON.stringify({ validada_en: ahora(), validada_por: yo.id }) });
  await avisarLineaAMano(lineaId, yo).catch(() => null);
  // La ultima: la hoja pasa a «hitos validados» (su historial y su fase), y se abren los dos destinos.
  const [h] = await hojasDeFacturacion({ ids: [l.hoja_encargo_id] });
  if (h && h.fase === "ok_comercial" && h.lineas.length && h.lineas.every((x) => x.validada_en)) {
    await pedir("he_estados_hoja", { method: "POST", body: JSON.stringify({ version_id: h.id, estado: "hitos_validados", persona_id: yo.id, lado: "facturacion" }) });
    await pedir(`he_versiones_hoja?id=eq.${h.id}`, { method: "PATCH", body: JSON.stringify({ estado: "hitos_validados" }) });
  }
  return l.hoja_encargo_id;
}

/** EL AVISO DE UNA LINEA AÑADIDA A MANO (Monica, 25-oct-2026: «lo pusimos por hipoteticos fallos, con aviso a mi si
 *  pasaba»). Si la app se salto una linea de la hoja y facturacion la añade, al validarla (ya con su concepto, importe
 *  e hitos) sale un correo desde facturacion a direccion. El aviso no para nada: si no sale, la linea queda igual. */
async function avisarLineaAMano(lineaId: string, yo: Yo) {
  const [f] = await leer<{ origen: string | null; descripcion: string | null; importe: number | null; hoja_id: string;
    hitos: { notas: string | null; hito: string; importe: number | null; estado: string }[] }[]>(
    `facturacion_lineas?select=origen,descripcion,importe,hoja_id,hitos:hitos_cobro(notas,hito,importe,estado)&id=eq.${lineaId}`,
  );
  if (!f || f.origen !== "manual") return;
  const [hoja] = await leer<{ id: string; numero_hoja: string; opp: { nombre: string | null; codigo: string | null } | null }[]>(
    `facturacion_hojas?select=id,numero_hoja,opp:oportunidad_id(nombre,codigo)&id=eq.${f.hoja_id}`,
  );
  const l = { ...f, hoja: hoja ?? null };
  const direccion = await leer<{ hasta: string | null; equipo: { email: string | null; activo: boolean } | null }[]>(
    "equipo_funciones?select=hasta,equipo:equipo_id(email,activo),funciones!inner(clave)&funciones.clave=eq.direccion",
  );
  const para = [...new Set(direccion.filter((f) => (!f.hasta || f.hasta >= hoy()) && f.equipo?.activo && f.equipo.email).map((f) => f.equipo!.email!))];
  if (!para.length) return;
  const dir = l.hoja?.opp ? nombreDeOpp(l.hoja.opp) : "";
  const eur = (n: number | null) => (n == null ? "a éxito" : `${Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`);
  const hitos = l.hitos.filter((h) => h.estado !== "anulado").map((h) => `  · ${h.notas?.trim() || TEXTO_HITO[h.hito] || h.hito}: ${eur(h.importe)}`).join("\n");
  await enviarCorreo({
    desde: "facturacion",
    para: para.join(", "),
    asunto: `Línea añadida a mano · ${dir} · ${l.hoja?.numero_hoja ?? ""}`,
    texto:
      `${nombreDe(yo)} ha añadido a mano una línea que la app no había sacado de la hoja firmada ${l.hoja?.numero_hoja ?? ""} (${dir}), y la ha validado:\n\n` +
      `«${l.descripcion?.trim() ?? ""}» — ${eur(l.importe)}\n${hitos}\n\n` +
      `Si se repite, algo falla al leer las hojas.\n\nLa hoja, en la app: ${APP}/facturacion/cobrar?hoja=${l.hoja?.id ?? ""}`,
    responderA: yo.email,
    nombreRemitente: `${nombreDe(yo)} · Facturación`,
  });
}

const APP = process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app";
export type EnvioDuda = "guardar" | "comercial" | "direccion";

/** A quien va la duda: el comercial de la opp, o quien tiene la funcion de revision de ofertas («Revisar por
 *  direccion»: hoy Daniel y Monica, 25-oct-2026). */
async function destinatariosDuda(hojaId: string, a: "comercial" | "direccion"): Promise<string[]> {
  if (a === "comercial") {
    const [h] = await leer<{ opp: { comercial: { email: string | null; equipo: { email: string | null } | null } | null } | null }[]>(
      `facturacion_hojas?select=opp:oportunidad_id(comercial:comerciales!oportunidades_comercial_id_fkey(email,equipo:equipo_id(email)))&id=eq.${hojaId}`,
    );
    const c = h?.opp?.comercial;
    const correo = c?.email || c?.equipo?.email;
    if (!correo) throw new Error("La opp no tiene comercial con correo: la duda queda guardada sin enviar.");
    return [correo];
  }
  const filas = await leer<{ hasta: string | null; equipo: { email: string | null; activo: boolean } | null }[]>(
    "equipo_funciones?select=hasta,equipo:equipo_id(email,activo),funciones!inner(clave)&funciones.clave=eq.revision_ofertas",
  );
  const correos = [...new Set(filas.filter((f) => (!f.hasta || f.hasta >= hoy()) && f.equipo?.activo && f.equipo.email).map((f) => f.equipo!.email!))];
  if (!correos.length) throw new Error("Nadie tiene la revisión de ofertas: la duda queda guardada sin enviar.");
  return correos;
}

/** La duda, guardada en la linea; y si se pide, enviada por correo desde el buzon de facturacion. */
export async function ponerDuda(lineaId: string, texto: string, envio: EnvioDuda, yo: Yo): Promise<string> {
  const l = await lineaDelLibro(lineaId);
  if (!texto.trim()) throw new Error("Escribe la duda.");
  const r = await pedir("notas_facturacion?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ linea_facturacion_id: lineaId, tipo: "duda", fecha: hoy(), texto: texto.trim(), origen: "persona", autor_id: yo.id, autor: nombreDe(yo) }),
  });
  const [nota] = (await r.json()) as { id: string }[];
  if (envio === "guardar") return l.hoja_encargo_id;

  const para = await destinatariosDuda(l.hoja_encargo_id, envio);
  const [h] = await leer<{ numero_hoja: string; opp: { nombre: string | null; codigo: string | null } | null }[]>(
    `facturacion_hojas?select=numero_hoja,opp:oportunidad_id(nombre,codigo)&id=eq.${l.hoja_encargo_id}`,
  );
  const dir = h?.opp ? nombreDeOpp(h.opp) : "";
  const enlace = `${APP}/facturacion/cobrar?hoja=${l.hoja_encargo_id}`;
  const enviado = await enviarCorreo({
    desde: "facturacion",
    para: para.join(", "),
    asunto: `Duda de facturación · ${dir} · ${h?.numero_hoja ?? ""}`,
    texto:
      `${nombreDe(yo)} tiene una duda con la hoja firmada ${h?.numero_hoja ?? ""} (${dir}):\n\n«${texto.trim()}»\n\n` +
      `Es sobre la línea: ${l.descripcion?.trim() || "(sin concepto)"}\n\nLa hoja, en la app: ${enlace}\n\nContesta a este correo y le llega a ${yo.nombre}.`,
    responderA: yo.email,
    nombreRemitente: `${nombreDe(yo)} · Facturación`,
  });
  if (!enviado.ok) throw new Error(`La duda queda guardada, pero no se ha podido enviar: ${enviado.dice}.`);
  await pedir(`notas_facturacion?id=eq.${nota.id}`, {
    method: "PATCH",
    body: JSON.stringify({ enviada_a: envio, enviada_en: ahora(), enviada_por: yo.id, enviada_para: para }),
  });
  return l.hoja_encargo_id;
}

export async function resolverDuda(notaId: string, yo: Yo): Promise<string> {
  if (!uuid(notaId)) throw new Error("Duda no válida.");
  const [n] = await leer<{ linea_facturacion_id: string | null }[]>(`notas_facturacion?select=linea_facturacion_id&id=eq.${notaId}&tipo=eq.duda`);
  if (!n?.linea_facturacion_id) throw new Error("No se encuentra la duda.");
  const l = await lineaDelLibro(n.linea_facturacion_id);
  await pedir(`notas_facturacion?id=eq.${notaId}`, { method: "PATCH", body: JSON.stringify({ resuelta_en: ahora(), resuelta_por: yo.id }) });
  return l.hoja_encargo_id;
}
