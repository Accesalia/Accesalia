import "server-only";
// lib/hojasNuevas.ts
//
// FACTURACION SOBRE LAS HOJAS NUEVAS (Monica, 25-oct-2026: «cero deuda tecnica»; se sube el MISMO DIA que la migracion
// de las hojas viejas). Lo comun de todas las pantallas del dinero para leer la hoja de encargo en las tablas nuevas:
//   - la hoja = una VERSION de he_versiones_hoja (codigo HE + numero de version, opp, pagador, comercial, fase);
//   - sus lineas = he_lineas_compromisos (solo las que se cobran);
//   - su historial = he_estados_hoja (la fecha de firma es la de «firmada_recibida»; el recorrido de facturacion, las
//     fases y las pausas, ahi tambien);
//   - la firmada = el documento de la opp enlazado desde he_versiones_hoja.firmada_documento_id.
// Lo de Alexandra NO se copia de la hoja: va en SU ficha de cada linea (lineas_facturacion, que mira a su linea por
// he_linea_id), con la validacion, quien factura, los hitos (hitos_cobro) y las dudas. Los hitos se generan UNA vez, al
// entrar la hoja en facturacion (ok_comercial), desde la forma de pago de cada linea (opcion A, 25-oct-2026).

import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...CAB, "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
export async function leerTodo<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const x = (await (await pedir(path, { headers: { Range: `${d}-${d + 999}` } })).json()) as T[];
    out.push(...x);
    if (x.length < 1000) return out;
  }
}
export async function porTramos<T>(ids: string[], hacer: (t: string) => string): Promise<T[]> {
  const t: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) t.push(ids.slice(i, i + 150));
  return (await Promise.all(t.map((x) => leerTodo<T>(hacer(x.join(",")))))).flat();
}

// ------------------------------------------------------------ las fases

/** Firmada (llego la firma de la comunidad), con o sin el ok del comercial. Lo que antes era «devuelta_firmada». */
export const FASES_FIRMADA = ["firmada_recibida", "firma_con_errores", "ok_comercial", "hitos_validados", "primer_cobro", "a_produccion", "ok_administracion"] as const;
/** Ya en facturacion: el comercial dio el ok a la firmada. */
export const FASES_FACTURACION = ["ok_comercial", "hitos_validados", "primer_cobro", "a_produccion", "ok_administracion"] as const;
export const filtroFases = (fases: readonly string[]) => `in.(${fases.join(",")})`;

// ------------------------------------------------------------ la version (la «hoja»)

export type VersionHoja = {
  id: string; codigo_he: string | null; numero_version: number; oportunidad_id: string | null; estado: string;
  pagador_tipo: "comunidad" | "contrata" | "persona" | null; pagador_comunidad_id: string | null; pagador_contrata_id: string | null; pagador_persona_id: string | null;
  comercial_id: string | null; firmada_documento_id: string | null; codigos_contrata: Record<string, string> | null;
};
export const SEL_VERSION =
  "id,codigo_he,numero_version,oportunidad_id,estado,pagador_tipo,pagador_comunidad_id,pagador_contrata_id,pagador_persona_id,comercial_id,firmada_documento_id,codigos_contrata";

/** Como se lee el numero de la hoja: «HE-2026-0012», y «· v2» si no es la primera version. */
export const numeroHoja = (v: Pick<VersionHoja, "codigo_he" | "numero_version"> | null | undefined) =>
  v?.codigo_he ? `${v.codigo_he}${v.numero_version > 1 ? ` · v${v.numero_version}` : ""}` : "";

/** Quien paga una version (una hoja tiene un solo pagador). */
export function pagadorDeVersion(v: Pick<VersionHoja, "pagador_tipo" | "pagador_comunidad_id" | "pagador_contrata_id" | "pagador_persona_id">): { tipo: string; id: string } | null {
  if (v.pagador_tipo === "contrata" && v.pagador_contrata_id) return { tipo: "contrata", id: v.pagador_contrata_id };
  if (v.pagador_tipo === "persona" && v.pagador_persona_id) return { tipo: "persona", id: v.pagador_persona_id };
  if (v.pagador_comunidad_id) return { tipo: "comunidad", id: v.pagador_comunidad_id };
  return null;
}

/** La fecha de firma de cada version: la de su «firmada_recibida» (la ultima, si se recibio dos veces). aaaa-mm-dd. */
export async function fechasDeFirma(versionIds: string[]): Promise<Map<string, string>> {
  if (!versionIds.length) return new Map();
  const filas = await porTramos<{ version_id: string; fecha: string }>([...new Set(versionIds)],
    (t) => `he_estados_hoja?select=version_id,fecha&estado=eq.firmada_recibida&version_id=in.(${t})&order=fecha`);
  return new Map(filas.map((f) => [f.version_id, f.fecha.slice(0, 10)]));
}

/** El enlace para ver la firmada de una version (se firma al abrirlo: /facturacion/firmada/<version>). */
export const urlFirmada = (v: Pick<VersionHoja, "id" | "firmada_documento_id">) => (v.firmada_documento_id ? `/facturacion/firmada/${v.id}` : null);

/** El enlace firmado (diez minutos) al PDF firmado de una version, en el almacen de documentos. */
export async function enlaceFirmadaVersion(versionId: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/.test(versionId)) return null;
  const [v] = await leerTodo<{ doc: { storage_ref: string | null } | null }>(`he_versiones_hoja?select=doc:firmada_documento_id(storage_ref)&id=eq.${versionId}`);
  const ruta = v?.doc?.storage_ref;
  if (!ruta) return null;
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/documentos-comerciales/${ruta}`, {
    method: "POST", headers: { ...CAB, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 600 }), cache: "no-store",
  });
  if (!r.ok) return null;
  const { signedURL } = (await r.json()) as { signedURL: string };
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE}/storage/v1${signedURL}`;
}

// ------------------------------------------------------------ las lineas de la hoja

export type LineaHe = {
  id: string; version_id: string; padre_id: string | null; bloque_id: string | null; se_cobra: boolean; importe: number | null; porcentaje: number | null;
  forma_pago_id: string | null; forma_pago_propia: string | null; texto: string | null; desglosar_precios: boolean | null;
  bloque: { nombre: string; nombre_corto: string | null; area: string | null; va_a_tecnico: boolean; va_a_faro: boolean } | null;
  desglose: { nombre: string } | null;
};
export const SEL_LINEA_HE =
  "id,version_id,padre_id,bloque_id,se_cobra,importe,porcentaje,forma_pago_id,forma_pago_propia,texto,desglosar_precios," +
  "bloque:bloque_id(nombre,nombre_corto,area,va_a_tecnico,va_a_faro),desglose:desglose_id(nombre)";

/** Como se llama una linea: lo escrito a mano (bloque «Otro»), o el bloque y su tipo («Proyecto · ascensor»). */
export function conceptoDeLinea(l: Pick<LineaHe, "texto" | "bloque" | "desglose">): string {
  if (l.texto?.trim()) return l.texto.trim();
  const b = l.bloque?.nombre_corto || l.bloque?.nombre || "Línea";
  return l.desglose?.nombre ? `${b} · ${l.desglose.nombre}` : b;
}

/** LAS LINEAS QUE SE COBRAN de una version: las que se cobran (se_cobra), con importe o %; de un conjunto con «solo el
 *  total» (desglosar_precios = false) se cobra la del conjunto y no las de dentro, que van solo para informar. */
export function lineasQueSeCobran(lineas: LineaHe[]): LineaHe[] {
  const porId = new Map(lineas.map((l) => [l.id, l]));
  return lineas.filter((l) => {
    if (!l.se_cobra || (l.importe == null && l.porcentaje == null)) return false;
    const padre = l.padre_id ? porId.get(l.padre_id) : null;
    if (padre && padre.se_cobra && padre.desglosar_precios === false) return false;
    return true;
  });
}

// ------------------------------------------------------------ LA ENTRADA EN FACTURACION (ok_comercial)

type HitoForma = { orden: number; momento: string; tipo: "fijo" | "exito"; porcentaje: number | null; frase: string | null };
const r2 = (n: number) => Math.round(n * 100) / 100;

/** EL OK DEL COMERCIAL A LA FIRMADA METE LA HOJA EN FACTURACION. Por cada linea que se cobra, su ficha de facturacion
 *  (emisor Accesalia por defecto: quien factura lo decide facturacion) y sus hitos, una sola vez, desde su forma de
 *  pago: los fijos con su importe (el ultimo se lleva el redondeo, para que sumen la linea), los de «a exito» sin
 *  importe. Si la linea trae una forma de pago escrita a mano, un solo hito «otro» con ese texto: los parte facturacion.
 *  Si ya tiene fichas, no hace nada (no se generan dos veces). Lo llama el ok del comercial (hilo de la hoja). */
export async function entrarEnFacturacion(versionId: string, yo: Yo | null): Promise<{ fichas: number; hitos: number }> {
  if (!/^[0-9a-f-]{36}$/.test(versionId)) throw new Error("Versión no válida.");
  const lineas = await leerTodo<LineaHe>(`he_lineas_compromisos?select=${SEL_LINEA_HE}&version_id=eq.${versionId}`);
  const cobran = lineasQueSeCobran(lineas);
  if (!cobran.length) return { fichas: 0, hitos: 0 };
  const ya = await porTramos<{ he_linea_id: string }>(cobran.map((l) => l.id), (t) => `lineas_facturacion?select=he_linea_id&he_linea_id=in.(${t})`);
  const hechas = new Set(ya.map((x) => x.he_linea_id));
  const nuevas = cobran.filter((l) => !hechas.has(l.id));
  if (!nuevas.length) return { fichas: 0, hitos: 0 };
  const formas = [...new Set(nuevas.map((l) => l.forma_pago_id).filter((x): x is string => !!x))];
  const hitosDe = new Map<string, HitoForma[]>();
  for (const h of formas.length ? await porTramos<HitoForma & { forma_pago_id: string }>(formas, (t) => `he_formas_pago_hitos?select=forma_pago_id,orden,momento,tipo,porcentaje,frase&forma_pago_id=in.(${t})&order=orden`) : [])
    (hitosDe.get(h.forma_pago_id) ?? hitosDe.set(h.forma_pago_id, []).get(h.forma_pago_id)!).push(h);

  let nHitos = 0;
  for (const l of nuevas) {
    const r = await pedir("lineas_facturacion?select=id", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ he_linea_id: l.id, bloque_id: l.bloque_id, emisor: "accesalia", origen: "hoja", verificado: false, creada_por: yo?.id ?? null }),
    });
    const [ficha] = (await r.json()) as { id: string }[];
    const importe = l.importe == null ? null : Number(l.importe);
    const plantilla = l.forma_pago_id ? hitosDe.get(l.forma_pago_id) ?? [] : [];
    let filas: Record<string, unknown>[];
    if (!plantilla.length) {
      filas = [{ hito: "otro", orden: 1, porcentaje: 100, importe, notas: l.forma_pago_propia?.trim() || "Forma de pago por poner", estado: "pendiente" }];
    } else {
      const fijos = plantilla.filter((h) => h.tipo === "fijo");
      let quedan = importe ?? 0;
      filas = plantilla.map((h) => {
        if (h.tipo === "exito") return { hito: h.momento, orden: h.orden, porcentaje: l.porcentaje, importe: null, notas: h.frase, estado: "pendiente" };
        const ultimo = fijos[fijos.length - 1] === h;
        const imp = importe == null ? null : ultimo ? r2(quedan) : r2((importe * Number(h.porcentaje ?? 0)) / 100);
        if (imp != null) quedan -= imp;
        return { hito: h.momento, orden: h.orden, porcentaje: h.porcentaje, importe: imp, notas: h.frase, estado: "pendiente" };
      });
    }
    await pedir("hitos_cobro", { method: "POST", body: JSON.stringify(filas.map((f) => ({ ...f, linea_facturacion_id: ficha.id, creado_por: yo?.id ?? null }))) });
    nHitos += filas.length;
  }
  return { fichas: nuevas.length, hitos: nHitos };
}
