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
  const eco = await fichaEcobalance(versionId, lineas, yo);
  const cobran = lineasQueSeCobran(lineas);
  if (!cobran.length) return { fichas: eco, hitos: eco };
  const ya = await porTramos<{ he_linea_id: string }>(cobran.map((l) => l.id), (t) => `lineas_facturacion?select=he_linea_id&he_linea_id=in.(${t})`);
  const hechas = new Set(ya.map((x) => x.he_linea_id));
  const nuevas = cobran.filter((l) => !hechas.has(l.id));
  if (!nuevas.length) return { fichas: eco, hitos: eco };
  const formas = [...new Set(nuevas.map((l) => l.forma_pago_id).filter((x): x is string => !!x))];
  const hitosDe = new Map<string, HitoForma[]>();
  for (const h of formas.length ? await porTramos<HitoForma & { forma_pago_id: string }>(formas, (t) => `he_formas_pago_hitos?select=forma_pago_id,orden,momento,tipo,porcentaje,frase&forma_pago_id=in.(${t})&order=orden`) : [])
    (hitosDe.get(h.forma_pago_id) ?? hitosDe.set(h.forma_pago_id, []).get(h.forma_pago_id)!).push(h);

  let nHitos = 0;
  for (const l of nuevas) {
    const r = await pedir("lineas_facturacion?select=id", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        he_linea_id: l.id, he_version_id: versionId, bloque_id: l.bloque_id, emisor: "accesalia", origen: "hoja", verificado: false, creada_por: yo?.id ?? null,
        es_porcentaje: l.importe == null && l.porcentaje != null,
      }),
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
  return { fichas: nuevas.length + eco, hitos: nHitos + eco };
}

/** LOS 3 PRESUPUESTOS → SU FICHA DE ECOBALANCE (como al firmar en la app de antes): vaya como vaya
 *  en el papel (incluido para la comunidad), Ecobalance cobra el % del PEM de parametros_economicos a la contrata que
 *  presentamos, a exito, hito «adjudicacion» (si gana). El comercial no ve este cobro. Una sola vez por linea. */
async function fichaEcobalance(versionId: string, lineas: LineaHe[], yo: Yo | null): Promise<number> {
  const [[tres], [pct]] = await Promise.all([
    leerTodo<{ id: string }>("bloques?select=id&codigo=eq.TRAMITACION%203%20PRESUPUESTOS"),
    leerTodo<{ valor: number }>("parametros_economicos?select=valor&clave=eq.tres_presupuestos_pct"),
  ]);
  if (!tres || !pct) return 0;
  // la linea de los 3 presupuestos (no su cabecera): la que no tiene hijas
  const linea = lineas.find((l) => l.bloque_id === tres.id && !lineas.some((h) => h.padre_id === l.id));
  if (!linea) return 0;
  const ya = await leerTodo<{ id: string }>(`lineas_facturacion?select=id&he_linea_id=eq.${linea.id}&limit=1`);
  if (ya.length) return 0;
  const r = await pedir("lineas_facturacion?select=id", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      he_linea_id: linea.id, he_version_id: versionId, bloque_id: tres.id, emisor: "ecobalance", origen: "regla", verificado: false, creada_por: yo?.id ?? null,
      descripcion: `3 presupuestos: ${Number(pct.valor).toLocaleString("es-ES")} % del PEM del presupuesto firmado con la contrata que presentamos, a éxito (si gana)`,
      importe: null, es_porcentaje: true, porcentaje: pct.valor, base_porcentaje: "PEM (presupuesto firmado con nuestra contrata)",
    }),
  });
  const [ficha] = (await r.json()) as { id: string }[];
  await pedir("hitos_cobro", {
    method: "POST",
    body: JSON.stringify([{ linea_facturacion_id: ficha.id, hito: "adjudicacion", orden: 1, porcentaje: 100, importe: null, estado: "pendiente",
      notas: "A éxito: cuando la obra se adjudique a la contrata que presentamos.", creado_por: yo?.id ?? null }]),
  });
  return 1;
}

// ------------------------------------------------------------ LA HOJA DE FACTURACION, ENTERA

/** Una hoja como la leen las pantallas del dinero: la version (vista facturacion_hojas) con su opp, su contrata, y sus
 *  fichas de facturacion (vista facturacion_lineas) con el bloque y los hitos de cada una. */
export type FichaLinea = {
  id: string; hoja_id: string; he_linea_id: string | null; descripcion: string | null; importe: number | null; es_porcentaje: boolean; porcentaje: number | null;
  bloque_id: string | null; emisor: string; validada_en: string | null; validada_por: string | null; editada_en: string | null; editada_por: string | null;
  creada_por: string | null; quitada_en: string | null; origen: string | null; creado_en: string; extraido: unknown; forma_cobro: string | null;
  bloque: { nombre: string; area: string | null; va_a_tecnico: boolean; va_a_faro: boolean } | null;
  hitos: { id: string; hito: string; orden: number | null; porcentaje: number | null; importe: number | null; estado: string; notas: string | null; hito_padre_id: string | null;
    fecha_cobro: string | null; fecha_prevista: string | null; en_pausa_desde: string | null; editado_por: string | null; creado_por: string | null; cerrado_en: string | null }[];
};
export type HojaFacturacion = {
  id: string; numero_hoja: string; fecha_firma: string | null; oportunidad_id: string | null; comunidad_id: string | null;
  pagador_tipo: string | null; pagador_id: string | null; pagador_contrata_id: string | null; pagador_persona_id: string | null; comercial_id: string | null;
  fase: string; firmada_documento_id: string | null; codigos_contrata: Record<string, string> | null;
  contrata: { nombre: string; cif: string | null; codigos_exigidos: string[] | null; emisor_factura: string | null } | null;
  opp: { id: string; nombre: string | null; codigo: string | null; comercial: { nombre: string; email: string | null } | null } | null;
  lineas: FichaLinea[];
};
const SEL_HOJA_F =
  "id,numero_hoja,fecha_firma,oportunidad_id,comunidad_id,pagador_tipo,pagador_id,pagador_contrata_id,pagador_persona_id,comercial_id,fase,firmada_documento_id,codigos_contrata," +
  "contrata:pagador_contrata_id(nombre,cif,codigos_exigidos,emisor_factura)," +
  "opp:oportunidad_id(id,nombre,codigo,comercial:comerciales!oportunidades_comercial_id_fkey(nombre,email))";
const SEL_FICHA =
  "id,hoja_id,he_linea_id,descripcion,importe,es_porcentaje,porcentaje,bloque_id,emisor,validada_en,validada_por,editada_en,editada_por,creada_por,quitada_en,origen,creado_en,extraido,forma_cobro," +
  "hitos:hitos_cobro(id,hito,orden,porcentaje,importe,estado,notas,hito_padre_id,fecha_cobro,fecha_prevista,en_pausa_desde,editado_por,creado_por,cerrado_en)";

/** Las hojas (versiones firmadas) que se piden, o las de una opp, con sus fichas. Solo las fichas sin quitar, del libro
 *  de Accesalia y Daniel salvo que se pida el de Ecobalance. */
export async function hojasDeFacturacion(f: { ids?: string[]; oppId?: string; fases?: readonly string[]; emisores?: string[] }): Promise<HojaFacturacion[]> {
  const fases = f.fases ? `&fase=${filtroFases(f.fases)}` : "";
  const hojas = f.ids
    ? (f.ids.length ? await porTramos<Omit<HojaFacturacion, "lineas">>(f.ids, (t) => `facturacion_hojas?select=${SEL_HOJA_F}&id=in.(${t})${fases}`) : [])
    : await leerTodo<Omit<HojaFacturacion, "lineas">>(`facturacion_hojas?select=${SEL_HOJA_F}${f.oppId ? `&oportunidad_id=eq.${f.oppId}` : ""}${fases}&order=fecha_firma`);
  if (!hojas.length) return [];
  const emisores = f.emisores ?? ["accesalia", "daniel_autonomo"];
  const fichas = await porTramos<Omit<FichaLinea, "bloque">>(hojas.map((h) => h.id),
    (t) => `facturacion_lineas?select=${SEL_FICHA}&hoja_id=in.(${t})&quitada_en=is.null&emisor=in.(${emisores.join(",")})&order=creado_en`);
  const bloques = [...new Set(fichas.map((x) => x.bloque_id).filter((x): x is string => !!x))];
  const bloque = new Map(
    (bloques.length ? await porTramos<{ id: string; nombre: string; area: string | null; va_a_tecnico: boolean; va_a_faro: boolean }>(bloques,
      (t) => `bloques?select=id,nombre,area,va_a_tecnico,va_a_faro&id=in.(${t})`) : []).map((b) => [b.id, b]),
  );
  return hojas.map((h) => ({
    ...h,
    lineas: fichas.filter((x) => x.hoja_id === h.id).map((x) => {
      const b = x.bloque_id ? bloque.get(x.bloque_id) : undefined;
      return { ...x, bloque: b ? { nombre: b.nombre, area: b.area, va_a_tecnico: b.va_a_tecnico, va_a_faro: b.va_a_faro } : null };
    }),
  }));
}

// ------------------------------------------------------------ DE UNA FICHA (o un hito) A SU HOJA

/** Lo que se pide de una ficha para saber su hoja y lo que la hoja dice de ella. Se usa embebido:
 *  `linea:linea_facturacion_id(${SEL_FICHA_HOJA})` desde hitos_cobro, o tal cual desde lineas_facturacion. */
export const SEL_FICHA_HOJA =
  "id,descripcion,importe,es_porcentaje,porcentaje,emisor,origen,he_linea_id,he_version_id,bloque:bloque_id(nombre)," +
  `he:he_linea_id(texto,importe,porcentaje,bloque:bloque_id(nombre,nombre_corto),desglose:desglose_id(nombre),version:version_id(${SEL_VERSION},opp:oportunidad_id(id,nombre,codigo))),` +
  `mano:he_version_id(${SEL_VERSION},opp:oportunidad_id(id,nombre,codigo))`;
type OppCorta = { id: string; nombre: string | null; codigo: string | null } | null;
export type FichaHoja = {
  id: string; descripcion: string | null; importe: number | null; es_porcentaje: boolean; porcentaje: number | null; emisor: string; origen: string | null;
  he_linea_id: string | null; he_version_id: string | null; bloque: { nombre: string } | null;
  he: { texto: string | null; importe: number | null; porcentaje: number | null; bloque: { nombre: string; nombre_corto: string | null } | null; desglose: { nombre: string } | null; version: (VersionHoja & { opp?: OppCorta }) | null } | null;
  mano: (VersionHoja & { opp?: OppCorta }) | null;
};
/** La version (la hoja) de una ficha: la de su linea, o la de la añadida a mano. */
export const versionDeFicha = (f: FichaHoja | null | undefined): VersionHoja | null => f?.he?.version ?? f?.mano ?? null;
/** Lo que la ficha cobra, como lo dice la hoja (o lo escrito a mano, si es añadida). */
export function lineaDeFicha(f: FichaHoja): { concepto: string; importe: number | null; esPorcentaje: boolean; porcentaje: number | null } {
  // La de Ecobalance (los 3 presupuestos) cobra su comision aparte: la linea de la hoja va incluida para la comunidad.
  if (f.he && f.emisor !== "ecobalance") return {
    concepto: conceptoDeLinea({ texto: f.he.texto, bloque: f.he.bloque ? { ...f.he.bloque, area: null, va_a_tecnico: false, va_a_faro: false } : null, desglose: f.he.desglose }),
    importe: f.he.importe == null ? null : Number(f.he.importe), esPorcentaje: f.he.importe == null && f.he.porcentaje != null,
    porcentaje: f.he.porcentaje == null ? null : Number(f.he.porcentaje),
  };
  return { concepto: (f.descripcion ?? "").trim() || f.bloque?.nombre || "Línea", importe: f.importe == null ? null : Number(f.importe), esPorcentaje: f.es_porcentaje, porcentaje: f.porcentaje == null ? null : Number(f.porcentaje) };
}

/** EL ADAPTADOR: recorre lo leido y cambia cada ficha leida con SEL_FICHA_HOJA por la forma de antes (descripcion,
 *  importe, emisor... y `hoja` con su numero, fecha de firma, opp y pagador), sacado de la hoja nueva. Asi las pantallas
 *  que solo cruzaban la ficha con su hoja para el numero o la opp siguen igual, con UNA sola forma de leerlo. */
export type HojaVieja = {
  id: string; numero_hoja: string; fecha_firma: string | null; oportunidad_id: string | null; estado: string; comunidad_id: string | null;
  pagador_tipo: string | null; pagador_contrata_id: string | null; pagador_persona_id: string | null;
  oportunidad: OppCorta; opp: OppCorta;
};
const esFicha = (x: unknown): x is FichaHoja => !!x && typeof x === "object" && "he_linea_id" in x && "mano" in x && "he" in x;
export async function adaptarFichas<T>(datos: T): Promise<T> {
  const fichas: FichaHoja[] = [];
  const buscar = (x: unknown) => {
    if (Array.isArray(x)) x.forEach(buscar);
    else if (x && typeof x === "object") { if (esFicha(x)) fichas.push(x); Object.values(x).forEach(buscar); }
  };
  buscar(datos);
  const firma = await fechasDeFirma(fichas.map((f) => versionDeFicha(f)?.id).filter((x): x is string => !!x));
  const cambiar = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(cambiar);
    if (!x || typeof x !== "object") return x;
    if (esFicha(x)) {
      const v = versionDeFicha(x) as (VersionHoja & { opp?: OppCorta }) | null;
      const l = lineaDeFicha(x);
      const { he: _he, mano: _mano, ...resto } = x as FichaHoja & Record<string, unknown>;
      void _he; void _mano;
      const hoja: HojaVieja | null = v ? {
        id: v.id, numero_hoja: numeroHoja(v), fecha_firma: firma.get(v.id) ?? null, oportunidad_id: v.oportunidad_id, estado: v.estado,
        comunidad_id: v.pagador_comunidad_id, pagador_tipo: v.pagador_tipo, pagador_contrata_id: v.pagador_contrata_id, pagador_persona_id: v.pagador_persona_id,
        oportunidad: v.opp ?? null, opp: v.opp ?? null,
      } : null;
      return { ...resto, descripcion: l.concepto, importe: l.importe, es_porcentaje: l.esPorcentaje, porcentaje: l.porcentaje, hoja_encargo_id: v?.id ?? null, hoja };
    }
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, cambiar(v)]));
  };
  return cambiar(datos) as T;
}
