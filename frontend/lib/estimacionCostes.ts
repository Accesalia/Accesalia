// lib/estimacionCostes.ts
//
// ESTIMACION DE COSTES DE OBRA (Monica, 11-oct-2026). Sale del historico de
// proyectos: la hoja DATOS del Proyecto (datos_proyecto) y el presupuesto del
// colegio con sus capitulos y mediciones (presupuestos_proyecto). Se calcula en
// el servidor y se pasa a la pantalla lo justo para estimar al momento (las
// cuentas, en lib/estimacionCalculo.ts).
//
// EL METODO, dicho con palabras:
//  · INDICE DE PRECIOS, por familia de obra:
//      - general (ascensores, rampas, plataformas): el PEM por parada de los
//        ascensores nuevos, cada obra comparada con la mediana de su caso
//        (A-F) para que no lo distorsione la mezcla de casos;
//      - SATE (fachada, cubierta, envolvente): el PEM por m² aislado de las
//        obras de SATE "puro".
//    La tendencia es una recta en escala logaritmica sobre los ultimos 4 años.
//  · ACTUALIZAR. Cada obra antigua se lleva a precio de HOY con su tendencia.
//  · ESTIMAR. Mediana de las obras parecidas, actualizadas, y como rango la
//    mitad central (25 %-75 %). Siempre se dice con cuantas obras.
//  · PREVISION a 1 y 2 años (no a 6 meses: "si al vecino le dices 6 meses,
//    dira me espero"): la subida de la tendencia y, como MINIMO, su limite
//    bajo (pendiente menos 1,28 errores tipicos, medido entre periodos). Se
//    probo "la menor subida anual de los ultimos tres años" y no vale: en los
//    ascensores 2024 salio por debajo de 2023 (-5,7 %).
//  · SATE (Monica: "da igual si es envolvente completa, cubierta o fachada: m²
//    x precio de SATE instalado"). Los m² salen de las MEDICIONES del
//    presupuesto (los de la hoja traian los de la plantilla: 2.151 m² en 6
//    obras). "SATE puro" = sin capitulos de ascensor y con fachada, cubierta y
//    lo necesario para hacerlas (andamio, seguridad, residuos, control,
//    demoliciones, pintura, cerrajeria) en el 90 % o mas del PEM. La cubierta
//    pesa lo que diga la mediana de sus capitulos frente a los de fachada
//    (salio 1,10). Atipicas fuera: mas del doble o menos de la mitad de la
//    mediana (San Claudio 117 salia a 628 €/m²: su presupuesto lleva otra cosa).
//
// Fuera siempre: hojas copiadas de otra obra (aviso), PEM de plantilla, sin fecha.

import "server-only";
import { cuantil, type DatosEstimacion, type Indice, type TipoObra } from "./estimacionCalculo";

export type { DatosEstimacion, TipoObra };

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(q: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${q}`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Range: `${desde}-${desde + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const tramo = (await r.json()) as T[];
    todo.push(...tramo);
    if (tramo.length < 1000) return todo;
  }
}

const llano = (s: string | null) => (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();

function tipoDe(t: string | null): TipoObra | null {
  const s = llano(t);
  if (!s) return null;
  if (s.includes("ASCENSOR") && s.includes("INSTAL") && !/ENVOLVENTE|FACHADA|SATE|SUSTITU|MODERNIZ|BAJADA/.test(s)) return "ascensor";
  if (s.includes("PLATAFORMA")) return "plataforma";
  if (s.includes("RAMPA")) return "rampa";
  return null;
}

/** Por encima de este PEM, una rampa o plataforma es parte de una obra mayor. */
const MAXIMO_ACCESIBILIDAD = 100000;

const enAños = (iso: string) => Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 0.5) / 12;
const semestreDe = (iso: string) => `${iso.slice(0, 4)}-S${Number(iso.slice(5, 7)) <= 6 ? 1 : 2}`;
const medioSemestre = (s: string) => Number(s.slice(0, 4)) + (s.endsWith("S1") ? 0.25 : 0.75);

/** La tendencia de unos valores relativos en el tiempo, por semestres, y su
 *  nivel por periodo respecto a hoy. */
function tendencia(valores: { x: number; v: number; s: string }[], xHoy: number, base: string): Indice & { pendiente: number } {
  const porSem = new Map<string, number[]>();
  for (const p of valores) porSem.set(p.s, [...(porSem.get(p.s) ?? []), p.v]);
  const desde = xHoy - 4;
  const puntos = [...porSem]
    .map(([s, v]) => ({ s, x: medioSemestre(s), y: Math.log(cuantil(v, 0.5)), n: v.length }))
    .filter((p) => p.x >= desde && p.n >= 3);
  const W = puntos.reduce((t, p) => t + p.n, 0);
  const mx = puntos.reduce((t, p) => t + p.n * p.x, 0) / W;
  const my = puntos.reduce((t, p) => t + p.n * p.y, 0) / W;
  const b = puntos.reduce((t, p) => t + p.n * (p.x - mx) * (p.y - my), 0) / puntos.reduce((t, p) => t + p.n * (p.x - mx) ** 2, 0);
  const yHoy = my + b * (xHoy - mx);
  // El error se mide con lo que se mueven los PERIODOS entre si (no pesado por
  // obras: pesarlo daba una seguridad que los datos no tienen).
  const k = puntos.length;
  const xm = puntos.reduce((t, p) => t + p.x, 0) / k;
  const sxx = puntos.reduce((t, p) => t + (p.x - xm) ** 2, 0);
  const sse = puntos.reduce((t, p) => t + (p.y - (my + b * (p.x - mx))) ** 2, 0);
  const error = k > 2 ? Math.sqrt(sse / (k - 2) / sxx) : 0;
  return {
    pendiente: b,
    subidaAnual: Math.exp(b) - 1,
    subidaMinima: Math.exp(Math.max(0, b - 1.28 * error)) - 1,
    periodos: puntos
      .filter((p) => p.x >= xHoy - 3.5)
      .sort((p, q) => p.x - q.x)
      .map((p) => ({ etiqueta: p.s.replace("-S1", " · 1er semestre").replace("-S2", " · 2º semestre"), x: p.x, nivel: Math.exp(p.y - yHoy), obras: p.n })),
    base,
  };
}

export async function datosEstimacion(): Promise<DatosEstimacion> {
  type Fila = { oportunidad_id: string | null; tipo_obra: string | null; caso_actuacion: string | null; asc_paradas: number | null; pem: number | null; fecha_documento: string | null; avisos: string[] | null;
    pp: { caps: { capitulo: string }[] }[] };
  type Ppto = {
    pem: number | null;
    datos: { fecha_documento: string | null; avisos: string[] | null } | null;
    caps: { capitulo: string; medicion: number | null; importe: number }[];
  };
  const [filasTodas, pptos, params, marcas] = await Promise.all([
    leer<Fila>("datos_proyecto?select=oportunidad_id,tipo_obra,caso_actuacion,asc_paradas,pem,fecha_documento,avisos,pp:presupuestos_proyecto(caps:presupuesto_proyecto_capitulos(capitulo))&pem=gt.1000&fecha_documento=not.is.null"),
    leer<Ppto>("presupuestos_proyecto?select=pem,datos:datos_proyecto_id(fecha_documento,avisos),caps:presupuesto_proyecto_capitulos(capitulo,medicion,importe)&pem=gt.1000"),
    leer<{ clave: string; valor: number }>("parametros_economicos?select=clave,valor"),
    leer<{ oportunidad_id: string; tipo: { clave: string } | null }>("oportunidad_tipos?select=oportunidad_id,tipo:tipo_id(clave)"),
  ]);
  // Los tipos marcados en cada opp (catalogo tipos_proyecto).
  const tiposOpp = new Map<string, Set<string>>();
  for (const m of marcas) if (m.tipo) tiposOpp.set(m.oportunidad_id, (tiposOpp.get(m.oportunidad_id) ?? new Set()).add(m.tipo.clave));
  const copiada = (a: string[] | null) => (a ?? []).some((x) => x.startsWith("hoja copiada"));
  const filas = filasTodas.filter((f) => !copiada(f.avisos) && Number(f.pem) !== 100000);
  const hoy = new Date().toISOString().slice(0, 10);
  const xHoy = enAños(hoy);
  // Sin valor por defecto a proposito: si falta en la tabla, que se vea.
  const param = (c: string) => {
    const p = params.find((x) => x.clave === c);
    if (!p) throw new Error(`Falta el parámetro ${c} en parametros_economicos`);
    return Number(p.valor) / 100;
  };

  // ---------------------------------------------------------- general: ascensores
  const asc = filas
    .filter((f) => tipoDe(f.tipo_obra) === "ascensor" && f.caso_actuacion && f.asc_paradas && f.asc_paradas >= 2 && f.asc_paradas <= 14)
    .map((f) => ({ caso: f.caso_actuacion!, fecha: f.fecha_documento!, ppp: Number(f.pem) / f.asc_paradas! }))
    .filter((f) => f.ppp > 5000 && f.ppp < 80000);
  const medianaCaso: Record<string, number> = {};
  for (const c of new Set(asc.map((a) => a.caso))) medianaCaso[c] = cuantil(asc.filter((a) => a.caso === c).map((a) => a.ppp), 0.5);
  const general = tendencia(
    asc.map((a) => ({ x: enAños(a.fecha), v: a.ppp / medianaCaso[a.caso], s: semestreDe(a.fecha) })),
    xHoy,
    `${asc.length} ascensores nuevos`,
  );
  const aHoyG = (iso: string) => Math.exp(general.pendiente * (xHoy - enAños(iso)));

  // ---------------------------------------------------------- SATE
  const PROPIOS = new Set(["sate_fachadas", "sate_cubiertas", "medios_auxiliares", "seguridad_salud", "gestion_residuos", "control_calidad", "demoliciones", "pinturas", "cerrajeria"]);
  const fach: number[] = [], cub: number[] = [];
  for (const p of pptos)
    for (const c of p.caps) {
      if (c.capitulo === "sate_fachadas" && c.medicion) fach.push(c.importe / c.medicion);
      if (c.capitulo === "sate_cubiertas" && c.medicion) cub.push(c.importe / c.medicion);
    }
  const kCubierta = fach.length && cub.length ? cuantil(cub, 0.5) / cuantil(fach, 0.5) : 1;
  let sate = pptos
    .filter((p) => p.datos?.fecha_documento && !copiada(p.datos.avisos) && !p.caps.some((c) => c.capitulo === "medios_elevacion" || c.capitulo === "estructura"))
    .map((p) => {
      const m2f = p.caps.filter((c) => c.capitulo === "sate_fachadas").reduce((t, c) => t + Number(c.medicion ?? 0), 0);
      const m2c = p.caps.filter((c) => c.capitulo === "sate_cubiertas").reduce((t, c) => t + Number(c.medicion ?? 0), 0);
      const propio = p.caps.filter((c) => PROPIOS.has(c.capitulo)).reduce((t, c) => t + Number(c.importe), 0) / Number(p.pem);
      return { fecha: p.datos!.fecha_documento!, m2: m2f + kCubierta * m2c, m2f, propio, pem: Number(p.pem) };
    })
    .filter((s) => s.m2f >= 100 && s.propio >= 0.9)
    .map((s) => ({ fecha: s.fecha, v: s.pem / s.m2 }));
  const medSate = cuantil(sate.map((s) => s.v), 0.5);
  sate = sate.filter((s) => s.v <= 2 * medSate && s.v >= medSate / 2);
  const indSate = tendencia(sate.map((s) => ({ x: enAños(s.fecha), v: s.v / medSate, s: semestreDe(s.fecha) })), xHoy, `${sate.length} obras de SATE`);

  // ---------------------------------------------------------- lo que se estima (ultimos 4 años, a hoy)
  const desde = xHoy - 4;
  const ascensorPorCaso: Record<string, number[]> = {};
  for (const a of asc) if (enAños(a.fecha) >= desde) (ascensorPorCaso[a.caso] ??= []).push(a.ppp * aHoyG(a.fecha));
  const satePorM2 = sate.filter((s) => enAños(s.fecha) >= desde).map((s) => s.v * Math.exp(indSate.pendiente * (xHoy - enAños(s.fecha))));
  // Rampa y plataforma: por el tipo marcado en la opp (Monica, 11-oct-2026: la
  // plataforma lleva la maquina en el presupuesto, la rampa es solo obra civil).
  // Una opp puede tener varios proyectos (el ascensor y, aparte, la rampa), asi
  // que lo mixto se mira en LA OBRA: fuera si es de ascensor (caso A-D o F, o
  // tipo de obra), si trae SATE, o si pasa de MAXIMO_ACCESIBILIDAD de PEM (la
  // rampa es entonces una parte de una obra mayor). Si la opp lleva rampa Y
  // plataforma, no se sabe cual es esta obra: no cuenta.
  const pemPorTipo = { plataforma: [] as number[], rampa: [] as number[] };
  for (const f of filas) {
    const m = tiposOpp.get(f.oportunidad_id ?? "");
    if (!m || m.has("rampa") === m.has("plataforma")) continue;
    const ascensor = tipoDe(f.tipo_obra) === "ascensor" || "ABCDF".includes(f.caso_actuacion || "-");
    const conSate = f.pp.some((p) => p.caps.some((c) => c.capitulo.startsWith("sate")));
    if (ascensor || conSate || Number(f.pem) > MAXIMO_ACCESIBILIDAD || enAños(f.fecha_documento!) < desde) continue;
    pemPorTipo[m.has("plataforma") ? "plataforma" : "rampa"].push(Number(f.pem) * aHoyG(f.fecha_documento!));
  }

  const limpio = ({ pendiente: _p, ...i }: Indice & { pendiente: number }): Indice => i; // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    hoy,
    gastosBeneficio: param("gastos_generales_beneficio_pct"),
    iva: param("iva_obra_pct"),
    indices: { general: limpio(general), sate: limpio(indSate) },
    ascensorPorCaso,
    satePorM2,
    kCubierta,
    pemPorTipo,
  };
}
