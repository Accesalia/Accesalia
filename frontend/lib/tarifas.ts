// lib/tarifas.ts
//
// LAS TARIFAS (Monica, 17-oct-2026). Los precios habituales por tipo de
// cliente: la general (comunidades y pequeñas contratas) y los convenios
// (ascensoristas, rehabilitadores completos...). Se mantienen a mano en su
// pantalla, por bloques logicos (los precios los marca el mercado). El generador de hojas
// toma de aqui el precio prerrelleno, siempre modificable.
//
// Tres reglas:
//   - UN PRECIO = tarifa + concepto + que se hace (si importa) + tramo de
//     viviendas del edificio (si importa).
//   - CAMBIAR NO BORRA: cada cambio es una fila nueva con su "vigente desde";
//     la vigente es la ultima que ya ha empezado. Si se cambia el mismo dia,
//     se corrige esa fila (no se llena el historial de erratas).
//   - Las hojas copian el importe: tocar una tarifa no cambia nada firmado.
//
// Quien entra: los mismos que el catalogo de bloques (direccion y secretaria).

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CABECERAS = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...CABECERAS, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
const leer = async <T,>(path: string) => (await (await pedir(path)).json()) as T;

export type Forma = "fijo" | "pct_pem" | "pct_exito";

export type Tarifa = { id: string; nombre: string; descripcion: string | null; general: boolean };
/** Una version de un precio (una fila). */
export type VersionPrecio = {
  id: string;
  forma: Forma;
  importe: number | null;
  porcentaje: number | null;
  incluye: string[];
  nota: string | null;
  vigenteDesde: string;
  baja: boolean;
};
/** Un precio de una tarifa: su clave y sus versiones, de la mas nueva a la mas vieja. */
export type Precio = {
  clave: string;
  tarifaId: string;
  bloqueId: string;
  tipoId: string | null;
  desde: number | null;
  hasta: number | null;
  /** La que vale hoy (null = dado de baja o aun no empezado). */
  vigente: VersionPrecio | null;
  /** Una que empieza mas adelante. */
  proxima: VersionPrecio | null;
  anteriores: VersionPrecio[];
};
export type DatosTarifas = {
  tarifas: Tarifa[];
  precios: Precio[];
  bloques: { id: string; codigo: string; nombre: string; area: string | null }[];
  tipos: { id: string; nombre: string }[];
  contratas: { id: string; nombre: string; tarifaId: string | null }[];
};

type Fila = {
  id: string;
  tarifa_id: string;
  bloque_id: string;
  tipo_proyecto_id: string | null;
  viviendas_desde: number | null;
  viviendas_hasta: number | null;
  forma: Forma;
  importe: string | null;
  porcentaje: string | null;
  incluye: string[];
  nota: string | null;
  vigente_desde: string;
  baja: boolean;
};

export const claveDe = (f: { tarifa_id: string; bloque_id: string; tipo_proyecto_id: string | null; viviendas_desde: number | null; viviendas_hasta: number | null }) =>
  [f.tarifa_id, f.bloque_id, f.tipo_proyecto_id ?? "", f.viviendas_desde ?? "", f.viviendas_hasta ?? ""].join("|");

const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

const version = (f: Fila): VersionPrecio => ({
  id: f.id,
  forma: f.forma,
  importe: f.importe == null ? null : Number(f.importe),
  porcentaje: f.porcentaje == null ? null : Number(f.porcentaje),
  incluye: f.incluye ?? [],
  nota: f.nota,
  vigenteDesde: f.vigente_desde,
  baja: f.baja,
});

/** Agrupa las filas por precio y separa la vigente, la proxima y el historial. */
export function agrupar(filas: Fila[], fecha = hoy()): Precio[] {
  const porClave = new Map<string, Fila[]>();
  for (const f of filas) porClave.set(claveDe(f), [...(porClave.get(claveDe(f)) ?? []), f]);
  return [...porClave.entries()].map(([clave, fs]) => {
    const orden = [...fs].sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde) || b.id.localeCompare(a.id));
    const empezadas = orden.filter((f) => f.vigente_desde <= fecha);
    const futura = orden.filter((f) => f.vigente_desde > fecha).at(-1) ?? null;
    const actual = empezadas[0] ?? null;
    const f0 = fs[0];
    return {
      clave,
      tarifaId: f0.tarifa_id,
      bloqueId: f0.bloque_id,
      tipoId: f0.tipo_proyecto_id,
      desde: f0.viviendas_desde,
      hasta: f0.viviendas_hasta,
      vigente: actual && !actual.baja ? version(actual) : null,
      proxima: futura ? version(futura) : null,
      anteriores: empezadas.slice(1).map(version),
    };
  });
}

const COLUMNAS = "id,tarifa_id,bloque_id,tipo_proyecto_id,viviendas_desde,viviendas_hasta,forma,importe,porcentaje,incluye,nota,vigente_desde,baja";

export async function datosTarifas(): Promise<DatosTarifas> {
  const [tarifas, filas, bloques, tipos, contratas] = await Promise.all([
    leer<{ id: string; nombre: string; descripcion: string | null; general: boolean }[]>("tarifas?select=id,nombre,descripcion,general&activa=is.true&order=orden.asc.nullslast,nombre.asc"),
    leer<Fila[]>(`precios_tarifa?select=${COLUMNAS}&limit=5000`),
    leer<{ id: string; codigo: string; nombre_corto: string | null; nombre: string; area: string | null }[]>("bloques?select=id,codigo,nombre_corto,nombre,area&activo=is.true&order=orden.asc.nullslast"),
    leer<{ id: string; nombre: string }[]>("tipos_proyecto?select=id,nombre&activo=is.true&elegible=is.true&contratable=is.true&order=orden.asc"),
    leer<{ id: string; nombre: string; tarifa_id: string | null }[]>("contratas?select=id,nombre,tarifa_id&order=nombre.asc&limit=2000"),
  ]);
  return {
    tarifas,
    precios: agrupar(filas),
    bloques: bloques.map((b) => ({ id: b.id, codigo: b.codigo, nombre: b.nombre_corto ?? b.nombre, area: b.area })),
    tipos,
    contratas: contratas.map((c) => ({ id: c.id, nombre: c.nombre, tarifaId: c.tarifa_id })),
  };
}

export type DatosPrecio = {
  tarifaId: string;
  bloqueId: string;
  tipoId: string | null;
  desde: number | null;
  hasta: number | null;
  forma: Forma;
  importe: number | null;
  porcentaje: number | null;
  incluye: string[];
  nota: string | null;
};

const fila = (d: DatosPrecio) => ({
  tarifa_id: d.tarifaId,
  bloque_id: d.bloqueId,
  tipo_proyecto_id: d.tipoId,
  viviendas_desde: d.desde,
  viviendas_hasta: d.hasta,
  forma: d.forma,
  importe: d.forma === "fijo" ? d.importe : null,
  porcentaje: d.forma === "fijo" ? null : d.porcentaje,
  incluye: d.incluye,
  nota: d.nota,
});

/** Las filas de un precio (por su clave), para saber si hoy ya hay una. */
async function filasDe(d: { tarifaId: string; bloqueId: string; tipoId: string | null; desde: number | null; hasta: number | null }) {
  const eq = (c: string, v: string | number | null) => (v == null ? `${c}=is.null` : `${c}=eq.${v}`);
  return leer<{ id: string; vigente_desde: string }[]>(
    `precios_tarifa?select=id,vigente_desde&tarifa_id=eq.${d.tarifaId}&bloque_id=eq.${d.bloqueId}&${eq("tipo_proyecto_id", d.tipoId)}&${eq("viviendas_desde", d.desde)}&${eq("viviendas_hasta", d.hasta)}`,
  );
}

/** CAMBIAR UN PRECIO: version nueva desde hoy, o se corrige la de hoy. Si la
 *  clave (que se hace, tramo) cambia, la vieja se da de baja y nace la nueva. */
export async function guardarPrecio(d: DatosPrecio, quien: string | null, antes: DatosPrecio | null) {
  const fecha = hoy();
  if (antes && claveDe(fila(antes) as never) !== claveDe(fila(d) as never)) await darDeBaja(antes, quien);
  const deHoy = (await filasDe(d)).find((f) => f.vigente_desde === fecha);
  if (deHoy) await pedir(`precios_tarifa?id=eq.${deHoy.id}`, { method: "PATCH", body: JSON.stringify({ ...fila(d), baja: false }) });
  else await pedir("precios_tarifa", { method: "POST", body: JSON.stringify({ ...fila(d), vigente_desde: fecha, creado_por: quien }) });
}

/** QUITAR UN PRECIO: deja de aplicarse desde hoy (el historial se queda). */
export async function darDeBaja(d: DatosPrecio, quien: string | null) {
  const fecha = hoy();
  const deHoy = (await filasDe(d)).find((f) => f.vigente_desde === fecha);
  if (deHoy) await pedir(`precios_tarifa?id=eq.${deHoy.id}`, { method: "PATCH", body: JSON.stringify({ baja: true }) });
  else await pedir("precios_tarifa", { method: "POST", body: JSON.stringify({ ...fila(d), vigente_desde: fecha, baja: true, creado_por: quien }) });
}

/** A que tarifa va una contrata (null = la general). */
export async function asignarTarifa(contrataId: string, tarifaId: string | null) {
  await pedir(`contratas?id=eq.${contrataId}`, { method: "PATCH", body: JSON.stringify({ tarifa_id: tarifaId }) });
}
