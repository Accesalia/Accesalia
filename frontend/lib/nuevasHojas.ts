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
export const DESDE = "2025-01-01";

export function puedeValidar(yo: Yo): boolean {
  return yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion" || f.clave === "control_produccion");
}

// ------------------------------------------------------------ la direccion

type Acceso = { tipo_via: string | null; nombre_via: string | null; numero: string | null; escalera: string | null; municipio: string | null };
const titulo = (t: string | null) => (t ?? "").toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
/** "Cl Bolsa 3 · Madrid"; varios portales de la misma calle, seguidos. */
export function direccionDeAccesos(accesos: Acceso[]): string {
  if (!accesos.length) return "Sin dirección";
  const portal = (a: Acceso) => [a.numero, a.escalera ? `esc. ${a.escalera}` : ""].filter(Boolean).join(", ");
  const calles = new Map<string, string[]>();
  for (const a of accesos) {
    const calle = [titulo(a.tipo_via), titulo(a.nombre_via)].filter(Boolean).join(" ");
    calles.set(calle, [...(calles.get(calle) ?? []), portal(a)]);
  }
  const txt = [...calles].map(([c, ps]) => `${c} ${ps.join(" + ")}`).join(" · ");
  const munis = [...new Set(accesos.map((a) => titulo(a.municipio)).filter(Boolean))].join(", ");
  return munis ? `${txt} · ${munis}` : txt;
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
};

type HojaCruda = {
  id: string; numero_hoja: string; fecha_firma: string; oportunidad_id: string | null;
  opp: { comercial: { nombre: string } | null; accesos: { hasta: string | null; acceso: Acceso | null }[] } | null;
};
type LineaCruda = { id: string; hoja_encargo_id: string; validada_en: string | null };

const SEL_HOJA =
  "id,numero_hoja,fecha_firma,oportunidad_id," +
  "opp:oportunidad_id(comercial:comerciales!oportunidades_comercial_id_fkey(nombre)," +
  "accesos:relacion_oportunidad_accesos(hasta,acceso:acceso_id(tipo_via,nombre_via,numero,escalera,municipio)))";
const accesosVivos = (h: HojaCruda) => (h.opp?.accesos ?? []).filter((a) => !a.hasta && a.acceso).map((a) => a.acceso!);

export async function nuevasHojas(): Promise<FilaNueva[]> {
  const pend = await leer<LineaCruda[]>(
    `lineas_facturacion?select=hoja_encargo_id&validada_en=is.null&quitada_en=is.null&emisor=in.${enLista(EMISORES_ACCESALIA)}`,
  );
  const ids = [...new Set(pend.map((l) => l.hoja_encargo_id))];
  if (!ids.length) return [];
  const out: FilaNueva[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const trozo = ids.slice(i, i + 150);
    const [hojas, lineas, dudas] = await Promise.all([
      leer<HojaCruda[]>(`hojas_encargo?select=${SEL_HOJA}&id=in.${enLista(trozo)}&estado=eq.devuelta_firmada&fecha_firma=gte.${DESDE}`),
      leer<LineaCruda[]>(
        `lineas_facturacion?select=id,hoja_encargo_id,validada_en&hoja_encargo_id=in.${enLista(trozo)}&quitada_en=is.null&emisor=in.${enLista(EMISORES_ACCESALIA)}`,
      ),
      leer<{ hoja_encargo_id: string }[]>(
        `notas_facturacion?select=hoja_encargo_id&hoja_encargo_id=in.${enLista(trozo)}&tipo=eq.duda&resuelta_en=is.null`,
      ),
    ]);
    const hoyMs = Date.parse(hoy());
    for (const h of hojas) {
      const ls = lineas.filter((l) => l.hoja_encargo_id === h.id);
      out.push({
        id: h.id, numero: h.numero_hoja, fechaFirma: h.fecha_firma,
        dias: Math.max(0, Math.round((hoyMs - Date.parse(h.fecha_firma)) / 86400000)),
        direccion: direccionDeAccesos(accesosVivos(h)),
        comercial: h.opp?.comercial?.nombre ?? null,
        lineas: ls.length, validadas: ls.filter((l) => l.validada_en).length,
        dudas: dudas.filter((d) => d.hoja_encargo_id === h.id).length,
      });
    }
  }
  // Las que mas tiempo llevan esperando, arriba.
  return out.sort((a, b) => a.fechaFirma.localeCompare(b.fechaFirma) || a.numero.localeCompare(b.numero));
}

// ------------------------------------------------------------ una hoja abierta

export type HitoAbierto = { id: string; texto: string; porcentaje: number | null; importe: number | null; quien: string | null };
export type DudaAbierta = { id: string; texto: string; autor: string | null; fecha: string };
export type LineaAbierta = {
  id: string;
  concepto: string;
  importe: number | null;
  esPorcentaje: boolean;
  porcentaje: number | null;
  base: string | null;
  manual: boolean;
  validada: { en: string; por: string | null } | null;
  editada: { en: string; por: string | null } | null;
  creadaPor: string | null;
  hitos: HitoAbierto[];
  dudas: DudaAbierta[];
};
export type HojaAbierta = { id: string; numero: string; pdf: string | null; lineas: LineaAbierta[] };

const TEXTO_HITO: Record<string, string> = {
  firma: "A la firma", encargo: "A la contratación", entrega: "A la entrega del proyecto", licencia: "A la licencia",
  pss: "A la firma del Plan de Seguridad y Salud", inicio_obra: "Al inicio de obra", cfo: "Al fin de obra (CFO)",
  presentacion: "A la presentación", concesion: "A la concesión", adjudicacion: "A la adjudicación", otro: "",
};

export async function hojaAbierta(hojaId: string): Promise<HojaAbierta | null> {
  if (!uuid(hojaId)) return null;
  const [h] = await leer<{ id: string; numero_hoja: string; versiones: { id: string; numero_version: number; pdfs_firmados: string[] | null }[] }[]>(
    `hojas_encargo?select=id,numero_hoja,versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,pdfs_firmados)&id=eq.${hojaId}`,
  );
  if (!h) return null;
  const v = [...h.versiones].filter((x) => x.pdfs_firmados?.length).sort((a, b) => b.numero_version - a.numero_version)[0];
  const pdf = v ? `/facturacion/documento/${h.id}/${v.id}/${v.pdfs_firmados!.length - 1}` : null;

  type LC = {
    id: string; descripcion: string | null; importe: number | null; es_porcentaje: boolean; porcentaje: number | null; base_porcentaje: string | null;
    origen: string | null; validada_en: string | null; validada_por: string | null; editada_en: string | null; editada_por: string | null; creada_por: string | null;
    hitos: { id: string; hito: string; orden: number | null; porcentaje: number | null; importe: number | null; estado: string; notas: string | null; hito_padre_id: string | null; editado_por: string | null; creado_por: string | null }[];
  };
  const lineas = await leer<LC[]>(
    "lineas_facturacion?select=id,descripcion,importe,es_porcentaje,porcentaje,base_porcentaje,origen,validada_en,validada_por,editada_en,editada_por,creada_por," +
      "hitos:hitos_cobro(id,hito,orden,porcentaje,importe,estado,notas,hito_padre_id,editado_por,creado_por)" +
      `&hoja_encargo_id=eq.${hojaId}&quitada_en=is.null&emisor=in.${enLista(EMISORES_ACCESALIA)}&order=creado_en`,
  );
  const lids = lineas.map((l) => l.id);
  const dudas = lids.length
    ? await leer<{ id: string; linea_facturacion_id: string; texto: string; autor: string | null; fecha: string }[]>(
        `notas_facturacion?select=id,linea_facturacion_id,texto,autor,fecha&linea_facturacion_id=in.${enLista(lids)}&tipo=eq.duda&resuelta_en=is.null&order=creado_en`,
      )
    : [];
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
      base: l.base_porcentaje,
      manual: l.origen === "manual",
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
      dudas: dudas.filter((d) => d.linea_facturacion_id === l.id).map((d) => ({ id: d.id, texto: d.texto, autor: d.autor, fecha: d.fecha })),
    })),
  };
}

// ------------------------------------------------------------ los cambios

const ahora = () => new Date().toISOString();
const nombreDe = (yo: Yo) => [yo.nombre, yo.apellidos].filter(Boolean).join(" ");

/** La linea, si es del libro de Accesalia y de una hoja firmada. Cada cambio lo comprueba. */
async function lineaDelLibro(lineaId: string) {
  if (!uuid(lineaId)) throw new Error("Línea no válida.");
  const [l] = await leer<{ id: string; hoja_encargo_id: string; emisor: string; validada_en: string | null; extraido: unknown; descripcion: string | null; importe: number | null; porcentaje: number | null; es_porcentaje: boolean }[]>(
    `lineas_facturacion?select=id,hoja_encargo_id,emisor,validada_en,extraido,descripcion,importe,porcentaje,es_porcentaje&id=eq.${lineaId}`,
  );
  if (!l || !EMISORES_ACCESALIA.includes(l.emisor)) throw new Error("Esa línea no es de Accesalia.");
  return l;
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
    body: JSON.stringify({ hoja_encargo_id: hojaId, descripcion: "", origen: "manual", verificado: false, emisor: "accesalia", es_porcentaje: false, creada_por: yo.id, editada_en: ahora(), editada_por: yo.id }),
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
  return l.hoja_encargo_id;
}

export async function ponerDuda(lineaId: string, texto: string, yo: Yo): Promise<string> {
  const l = await lineaDelLibro(lineaId);
  if (!texto.trim()) throw new Error("Escribe la duda.");
  await pedir("notas_facturacion", {
    method: "POST",
    body: JSON.stringify({ hoja_encargo_id: l.hoja_encargo_id, linea_facturacion_id: lineaId, tipo: "duda", fecha: hoy(), texto: texto.trim(), origen: "persona", autor_id: yo.id, autor: nombreDe(yo) }),
  });
  return l.hoja_encargo_id;
}

export async function resolverDuda(notaId: string, yo: Yo): Promise<string> {
  if (!uuid(notaId)) throw new Error("Duda no válida.");
  const [n] = await leer<{ linea_facturacion_id: string | null; hoja_encargo_id: string }[]>(`notas_facturacion?select=linea_facturacion_id,hoja_encargo_id&id=eq.${notaId}&tipo=eq.duda`);
  if (!n?.linea_facturacion_id) throw new Error("No se encuentra la duda.");
  await lineaDelLibro(n.linea_facturacion_id);
  await pedir(`notas_facturacion?id=eq.${notaId}`, { method: "PATCH", body: JSON.stringify({ resuelta_en: ahora(), resuelta_por: yo.id }) });
  return n.hoja_encargo_id;
}
