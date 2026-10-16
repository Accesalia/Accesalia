// lib/trabajosTecnico.ts
//
// ASIGNAR › PROYECTOS (Monica, 16-oct-2026). La cadena, cada paso en su lista:
//   nube lista o «nube no» (lib/nubes.ts)
//   -> POR ESTIMAR: Alex marca dificultad (baja/normal/alta; solo informa: «que
//      se atasque y pida otro») y dias (por defecto los del tipo); cambia o da OK
//   -> POR ASIGNAR: Alexandra elige el tecnico A MANO (nunca se preasigna)
//   -> LA LISTA DE CADA TECNICO: se ordena, se pasa a otro, se cambian dias y
//      dificultad (queda el registro) y se marca la redaccion entregada.
// Los requerimientos van igual, colgados de su direccion: no se cobran pero
// ocupan al tecnico. Tablas: trabajos_tecnico y trabajos_tecnico_cambios.
//
// LOS DIAS POR DEFECTO salen de las obras de sus hojas firmadas
// (actuaciones_hoja) y de tiempos_estandar: la obra mas larga + cada una de las
// otras menos el ahorro de la parte comun (con un minimo). Una obra sin dias en
// la tabla no suma; si ninguna tiene, se queda sin calcular y Alex los pone.

import "server-only";
import type { Yo } from "./sesion";
import { nombresDeOpps } from "./direccionOpp";
import { datosAsignar, type DatosAsignar, type TrabajoNube } from "./nubes";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CABECERAS = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...CABECERAS, "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
async function todo<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const filas = (await (await pedir(path, { headers: { Range: `${desde}-${desde + 999}`, "Range-Unit": "items" } })).json()) as T[];
    out.push(...filas);
    if (filas.length < 1000) return out;
  }
}

const tiene = (yo: Yo, ...claves: string[]) => yo.veTodo || yo.funciones.some((f) => claves.includes(f.clave));
export const puedeEstimar = (yo: Yo) => tiene(yo, "estimacion_proyectos");
export const puedeAsignar = (yo: Yo) => tiene(yo, "facturacion", "control_produccion");

export type Dificultad = "baja" | "normal" | "alta";
export type FilaTrabajo = {
  id: string; oportunidad_id: string; tipo: "proyecto" | "requerimiento"; nombre: string | null; dificultad: Dificultad;
  dias: number | null; dias_calculados: number | null; estimado_en: string | null; tecnico_id: string | null; orden: number | null;
  asignado_en: string | null; terminado_en: string | null;
};
/** Un trabajo en pantalla: un proyecto listo (con o sin fila todavia) o un requerimiento. */
export type Trabajo = {
  id: string | null;
  oppId: string;
  tipo: "proyecto" | "requerimiento";
  /** La direccion (con municipio); en un requerimiento, ademas, su nombre. */
  direccion: string;
  nombre: string | null;
  obras: string[];
  dificultad: Dificultad;
  dias: number | null;
  diasCalculados: number | null;
  estimado: string | null;
  tecnicoId: string | null;
  orden: number;
  terminado: string | null;
  /** Lo que se cobra «a la entrega» y si paga una contrata (cobra mas tarde). */
  entrega: number;
  contrata: boolean;
};
export type DatosProyectos = {
  asignar: DatosAsignar;
  porEstimar: Trabajo[];
  porAsignar: Trabajo[];
  asignados: Trabajo[];
  /** Redaccion entregada, esperando visado y OK para cobrar. */
  entregados: Trabajo[];
  visadoDias: number;
};

type Tiempos = { porObra: Map<string, number>; ahorro: number; minimo: number; visado: number };
async function leerTiempos(): Promise<Tiempos> {
  const filas = await todo<{ contexto: string; clave: string; dias: number }>("tiempos_estandar?select=contexto,clave,dias&activo=eq.true");
  const de = (c: string, k: string) => Number(filas.find((f) => f.contexto === c && f.clave === k)?.dias ?? NaN);
  return {
    porObra: new Map(filas.filter((f) => f.contexto === "proyecto").map((f) => [f.clave, Number(f.dias)])),
    ahorro: de("mixto", "ahorro_por_obra"),
    minimo: de("mixto", "minimo_por_obra"),
    visado: de("visado", "normal"),
  };
}

/** Los dias de un proyecto con varias obras: la mas larga entera; las demas, menos la parte comun. */
export function diasDeObras(claves: string[], t: Tiempos): number | null {
  const dias = claves.map((c) => t.porObra.get(c)).filter((d): d is number => d != null).sort((a, b) => b - a);
  if (!dias.length) return null;
  const extra = dias.slice(1).reduce((s, d) => s + Math.max(Number.isNaN(t.minimo) ? 0 : t.minimo, d - (Number.isNaN(t.ahorro) ? 0 : t.ahorro)), 0);
  return Math.round((dias[0] + extra) * 2) / 2;
}

export async function datosProyectos(): Promise<DatosProyectos> {
  const [asignar, filas, tiempos, actuaciones] = await Promise.all([
    datosAsignar(),
    todo<FilaTrabajo>(
      "trabajos_tecnico?select=id,oportunidad_id,tipo,nombre,dificultad,dias,dias_calculados,estimado_en,tecnico_id,orden,asignado_en,terminado_en" +
        "&or=(tipo.eq.proyecto,terminado_en.is.null)",
    ),
    leerTiempos(),
    todo<{ hoja: { oportunidad_id: string | null } | null; tipo: { clave: string; nombre: string } | null }>(
      "actuaciones_hoja?select=hoja:hoja_encargo_id!inner(oportunidad_id),tipo:tipo_proyecto_id(clave,nombre)&hoja.estado=eq.devuelta_firmada",
    ),
  ]);
  const obrasDe = new Map<string, Map<string, string>>();
  for (const a of actuaciones) {
    const opp = a.hoja?.oportunidad_id;
    if (!opp || !a.tipo) continue;
    if (!obrasDe.has(opp)) obrasDe.set(opp, new Map());
    obrasDe.get(opp)!.set(a.tipo.clave, a.tipo.nombre);
  }
  const proyectoDe = new Map(filas.filter((f) => f.tipo === "proyecto").map((f) => [f.oportunidad_id, f]));
  const listos = new Map(asignar.aProyectos.map((t) => [t.oppId, t]));
  // Lo asignado cuya entrega ya se facturo ya no esta en «listos»: ha terminado del todo.
  const rqs = filas.filter((f) => f.tipo === "requerimiento");
  const nombres = await nombresDeOpps(rqs.map((f) => f.oportunidad_id).filter((id) => !listos.has(id)));

  const deProyecto = (t: TrabajoNube): Trabajo => {
    const f = proyectoDe.get(t.oppId);
    const obras = obrasDe.get(t.oppId);
    const calculados = diasDeObras([...(obras?.keys() ?? [])], tiempos);
    return {
      id: f?.id ?? null, oppId: t.oppId, tipo: "proyecto", direccion: t.nombre, nombre: null,
      // Las obras que cuentan dias (las de la tabla); CSS, subvenciones... no.
      obras: [...(obras?.entries() ?? [])].filter(([clave]) => tiempos.porObra.has(clave)).map(([, nombre]) => nombre),
      dificultad: f?.dificultad ?? "normal", dias: f?.dias != null ? Number(f.dias) : null,
      diasCalculados: f?.dias_calculados != null ? Number(f.dias_calculados) : calculados,
      estimado: f?.estimado_en ?? null, tecnicoId: f?.tecnico_id ?? null, orden: f?.orden ?? 0, terminado: f?.terminado_en ?? null,
      entrega: t.entrega, contrata: t.contrata,
    };
  };
  const proyectos = asignar.aProyectos.map(deProyecto);
  const requerimientos: Trabajo[] = rqs.map((f) => ({
    id: f.id, oppId: f.oportunidad_id, tipo: "requerimiento", direccion: listos.get(f.oportunidad_id)?.nombre ?? nombres.get(f.oportunidad_id) ?? "—",
    nombre: f.nombre, obras: [], dificultad: f.dificultad, dias: f.dias != null ? Number(f.dias) : null, diasCalculados: null,
    estimado: f.estimado_en, tecnicoId: f.tecnico_id, orden: f.orden ?? 0, terminado: null, entrega: 0, contrata: false,
  }));
  const vivos = [...proyectos.filter((p) => !p.terminado), ...requerimientos];
  return {
    asignar,
    porEstimar: proyectos.filter((p) => !p.estimado),
    porAsignar: vivos.filter((p) => (p.tipo === "requerimiento" || p.estimado) && !p.tecnicoId),
    asignados: vivos.filter((p) => p.tecnicoId).sort((a, b) => a.orden - b.orden),
    entregados: proyectos.filter((p) => p.terminado),
    visadoDias: Number.isNaN(tiempos.visado) ? 5 : tiempos.visado,
  };
}

// ---------------------------------------------------------------- escribir

async function cambio(trabajo: string, campo: "dias" | "dificultad" | "tecnico", antes: unknown, despues: unknown, yo: Yo) {
  if (String(antes ?? "") === String(despues ?? "")) return;
  await pedir("trabajos_tecnico_cambios", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ trabajo_id: trabajo, campo, antes: antes == null ? null : String(antes), despues: despues == null ? null : String(despues), por: yo.id }),
  });
}
async function leerUno(id: string): Promise<FilaTrabajo> {
  const [f] = (await (await pedir(`trabajos_tecnico?select=*&id=eq.${id}`)).json()) as FilaTrabajo[];
  if (!f) throw new Error("Ese trabajo ya no existe");
  return f;
}
const uuid = (v: string) => {
  if (!/^[0-9a-f-]{36}$/.test(v)) throw new Error("Identificador no valido");
  return v;
};
const diasValidos = (d: number) => {
  if (!(d > 0 && d <= 200)) throw new Error("Los días tienen que estar entre 0,5 y 200");
  return Math.round(d * 2) / 2;
};

/** EL OK DE ALEX: dificultad y dias de un proyecto (crea su fila la primera vez). */
export async function estimar(oppId: string, dificultad: Dificultad, dias: number, calculados: number | null, yo: Yo) {
  uuid(oppId);
  const d = diasValidos(dias);
  const [f] = (await (await pedir(`trabajos_tecnico?select=*&oportunidad_id=eq.${oppId}&tipo=eq.proyecto`)).json()) as FilaTrabajo[];
  const datos = { dificultad, dias: d, dias_calculados: calculados, estimado_en: new Date().toISOString(), estimado_por: yo.id };
  if (f) await pedir(`trabajos_tecnico?id=eq.${f.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(datos) });
  else await pedir("trabajos_tecnico", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ oportunidad_id: oppId, tipo: "proyecto", creado_por: yo.id, ...datos }) });
}

/** Cambiar dias o dificultad ya estimado (lo hace Alexandra cuando el tecnico avisa). */
export async function corregir(id: string, cambios: { dias?: number; dificultad?: Dificultad }, yo: Yo) {
  const f = await leerUno(uuid(id));
  const datos: Record<string, unknown> = {};
  if (cambios.dias != null) datos.dias = diasValidos(cambios.dias);
  if (cambios.dificultad) datos.dificultad = cambios.dificultad;
  await pedir(`trabajos_tecnico?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(datos) });
  if ("dias" in datos) await cambio(id, "dias", f.dias, datos.dias, yo);
  if ("dificultad" in datos) await cambio(id, "dificultad", f.dificultad, datos.dificultad, yo);
}

/** Deja la lista de un tecnico en este orden (y trae a ella lo que venga de otro o de «por asignar»). */
export async function ordenar(tecnicoId: string | null, ids: string[], yo: Yo) {
  if (tecnicoId) uuid(tecnicoId);
  for (const [i, id] of ids.entries()) {
    const f = await leerUno(uuid(id));
    const datos: Record<string, unknown> = { orden: tecnicoId ? i + 1 : null };
    if (f.tecnico_id !== tecnicoId) Object.assign(datos, { tecnico_id: tecnicoId, asignado_en: tecnicoId ? new Date().toISOString() : null, asignado_por: tecnicoId ? yo.id : null });
    await pedir(`trabajos_tecnico?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(datos) });
    await cambio(id, "tecnico", f.tecnico_id, tecnicoId, yo);
  }
}

export async function nuevoRequerimiento(oppId: string, nombre: string, dias: number, yo: Yo) {
  const n = nombre.trim().slice(0, 200);
  if (!n) throw new Error("Ponle un nombre al requerimiento");
  await pedir("trabajos_tecnico", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ oportunidad_id: uuid(oppId), tipo: "requerimiento", nombre: n, dias: diasValidos(dias), estimado_en: new Date().toISOString(), estimado_por: yo.id, creado_por: yo.id }),
  });
}

/** Proyecto: redaccion entregada. Requerimiento: hecho. (null = deshacer) */
export async function terminar(id: string, hecho: boolean, yo: Yo) {
  await pedir(`trabajos_tecnico?id=eq.${uuid(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ terminado_en: hecho ? new Date().toISOString() : null, terminado_por: hecho ? yo.id : null }),
  });
}
