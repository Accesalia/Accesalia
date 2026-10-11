// lib/estimacionCostes.ts
//
// ESTIMACION DE COSTES DE OBRA (Monica, 11-oct-2026). Sale del historico de
// proyectos (datos_proyecto: la hoja DATOS del Proyecto de 607 obras, con el PEM
// del presupuesto del colegio). Se calcula en el servidor y se pasa a la
// pantalla lo justo para estimar al momento.
//
// EL METODO, dicho con palabras:
//  · INDICE DE PRECIOS. Con los ascensores nuevos (los mas y los mas parecidos
//    entre si) se mide como sube el PEM por parada con el tiempo. Para que no
//    lo distorsione la mezcla de casos, cada obra se compara con la mediana de
//    su caso (A-F). La tendencia es una recta en escala logaritmica sobre los
//    ultimos años, pesada por el numero de obras de cada semestre.
//  · ACTUALIZAR. Cada obra antigua se lleva a precio de HOY con esa tendencia
//    (un PEM de 2023 no vale como uno de 2026).
//  · ESTIMAR. Mediana de las obras parecidas, actualizadas, y como rango la
//    mitad central (del 25 % al 75 %). Siempre se dice con cuantas obras.
//  · PREVISION. A 1 y 2 años (no a 6 meses: Monica, "si al vecino le dices 6
//    meses, dira me espero"): la subida anual de la tendencia, y como MINIMO el
//    limite bajo de esa tendencia (ver abajo por que no la menor subida anual).
//
// Fuera: hojas copiadas de otra obra (aviso), PEM de plantilla, obras sin fecha.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export type TipoObra = "ascensor" | "sate" | "cubierta" | "fachada" | "plataforma" | "rampa";

export const TIPOS: { clave: TipoObra; nombre: string }[] = [
  { clave: "ascensor", nombre: "Ascensor" },
  { clave: "sate", nombre: "SATE completo" },
  { clave: "cubierta", nombre: "Cubierta" },
  { clave: "fachada", nombre: "Fachada" },
  { clave: "plataforma", nombre: "Plataforma" },
  { clave: "rampa", nombre: "Rampa" },
];

export const CASOS: Record<string, string> = {
  A: "A · Se demuele la escalera",
  B: "B · Se demuele y reconstruye la escalera",
  C: "C · Se cajea la escalera",
  D: "D · Solo ascensor, sin tocar la escalera",
  E: "E · Mejora de accesibilidad en planta baja",
  F: "F · Bajada de ascensor existente",
};

/** Lo que necesita la pantalla para estimar sin volver al servidor. */
export type DatosEstimacion = {
  hoy: string;
  /** Subida anual de la tendencia y la minima de los ultimos tres años. */
  subidaAnual: number;
  subidaMinima: number;
  /** Por semestre: como estaba el nivel de precios respecto a hoy (1 = hoy). */
  semestres: { semestre: string; nivel: number; obras: number }[];
  /** Ascensor: PEM por parada actualizado a hoy, por caso. */
  ascensorPorCaso: Record<string, number[]>;
  /** El resto: PEM actualizado a hoy, por tipo (sin medida de tamaño todavia). */
  pemPorTipo: Record<Exclude<TipoObra, "ascensor">, number[]>;
};

type Fila = {
  tipo_obra: string | null;
  caso_actuacion: string | null;
  asc_paradas: number | null;
  pem: number | null;
  fecha_documento: string | null;
  avisos: string[] | null;
};

const llano = (s: string | null) => (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();

function tipoDe(t: string | null): TipoObra | null {
  const s = llano(t);
  if (!s) return null;
  if (s.includes("ASCENSOR") && s.includes("INSTAL") && !/ENVOLVENTE|FACHADA|SATE|SUSTITU|MODERNIZ|BAJADA/.test(s)) return "ascensor";
  if (/ENVOLVENTE|SATE|REHABILITACION ENERGETICA/.test(s)) return "sate";
  if (s.includes("PLATAFORMA")) return "plataforma";
  if (s.includes("RAMPA")) return "rampa";
  if (/CUBIERTA|IMPERMEABILIZ/.test(s)) return "cubierta";
  if (s.includes("FACHADA")) return "fachada";
  return null;
}

/** "2024-S1": el semestre de una fecha, y su punto medio en años. */
const semestreDe = (iso: string) => `${iso.slice(0, 4)}-S${Number(iso.slice(5, 7)) <= 6 ? 1 : 2}`;
const enAños = (iso: string) => Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 0.5) / 12;
const medioSemestre = (s: string) => Number(s.slice(0, 4)) + (s.endsWith("S1") ? 0.25 : 0.75);

export function cuantil(xs: number[], q: number): number {
  const a = [...xs].sort((x, y) => x - y);
  if (!a.length) return NaN;
  const p = (a.length - 1) * q;
  const i = Math.floor(p);
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (p - i);
}

export async function datosEstimacion(): Promise<DatosEstimacion> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/datos_proyecto?select=tipo_obra,caso_actuacion,asc_paradas,pem,fecha_documento,avisos&pem=gt.1000&fecha_documento=not.is.null`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`Supabase REST ${r.status}`);
  const filas = ((await r.json()) as Fila[]).filter(
    (f) => !(f.avisos ?? []).some((a) => a.startsWith("hoja copiada")) && Number(f.pem) !== 100000,
  );
  const hoy = new Date().toISOString().slice(0, 10);
  const xHoy = enAños(hoy);

  // ---- el indice, con los ascensores nuevos
  const asc = filas
    .filter((f) => tipoDe(f.tipo_obra) === "ascensor" && f.caso_actuacion && f.asc_paradas && f.asc_paradas >= 2 && f.asc_paradas <= 14)
    .map((f) => ({ caso: f.caso_actuacion!, fecha: f.fecha_documento!, ppp: Number(f.pem) / f.asc_paradas! }))
    .filter((f) => f.ppp > 5000 && f.ppp < 80000);
  const medianaCaso: Record<string, number> = {};
  for (const c of new Set(asc.map((a) => a.caso))) medianaCaso[c] = cuantil(asc.filter((a) => a.caso === c).map((a) => a.ppp), 0.5);
  const porSemestre = new Map<string, number[]>();
  for (const a of asc) {
    const s = semestreDe(a.fecha);
    porSemestre.set(s, [...(porSemestre.get(s) ?? []), a.ppp / medianaCaso[a.caso]]);
  }
  // Tendencia: recta en log sobre los ultimos 4 años, pesada por obras.
  const desde = xHoy - 4;
  const puntos = [...porSemestre].map(([s, v]) => ({ s, x: medioSemestre(s), y: Math.log(cuantil(v, 0.5)), n: v.length })).filter((p) => p.x >= desde && p.n >= 3);
  const W = puntos.reduce((t, p) => t + p.n, 0);
  const mx = puntos.reduce((t, p) => t + p.n * p.x, 0) / W;
  const my = puntos.reduce((t, p) => t + p.n * p.y, 0) / W;
  const b = puntos.reduce((t, p) => t + p.n * (p.x - mx) * (p.y - my), 0) / puntos.reduce((t, p) => t + p.n * (p.x - mx) ** 2, 0);
  const yHoy = my + b * (xHoy - mx);
  const aHoy = (x: number) => Math.exp(b * (xHoy - x)); // factor para llevar un precio de x a hoy

  // EL MINIMO. Se probo "la menor subida anual de los ultimos tres años" y no
  // vale: 2024 salio por debajo de 2023 (-5,7 %) y no se puede decir "como
  // minimo sube" con un numero negativo. Se usa el LIMITE BAJO de la tendencia
  // (su pendiente menos 1,28 errores tipicos: lo que, con estos datos, se puede
  // dar por casi seguro, al 90 %). Nunca por debajo de cero.
  // El error se mide con lo que se mueven los SEMESTRES entre si (no pesado
  // por obras: pesarlo daba una seguridad que unos datos que bajaron en 2024 no
  // tienen).
  const k = puntos.length;
  const xm = puntos.reduce((t, p) => t + p.x, 0) / k;
  const sxx = puntos.reduce((t, p) => t + (p.x - xm) ** 2, 0);
  const sse = puntos.reduce((t, p) => t + (p.y - (my + b * (p.x - mx))) ** 2, 0);
  const errorPendiente = k > 2 ? Math.sqrt(sse / (k - 2) / sxx) : 0;
  const pendienteMinima = Math.max(0, b - 1.28 * errorPendiente);

  const semestres = [...porSemestre]
    .filter(([s, v]) => medioSemestre(s) >= xHoy - 3.5 && v.length >= 3)
    .sort(([a], [z]) => a.localeCompare(z))
    .map(([s, v]) => ({ semestre: s, nivel: Math.exp(Math.log(cuantil(v, 0.5)) - yHoy), obras: v.length }));

  // ---- lo que se estima: todo llevado a hoy, de los ultimos 4 años
  const recientes = (f: { fecha: string }) => enAños(f.fecha) >= desde;
  const ascensorPorCaso: Record<string, number[]> = {};
  for (const a of asc.filter(recientes)) (ascensorPorCaso[a.caso] ??= []).push(a.ppp * aHoy(enAños(a.fecha)));
  const pemPorTipo = { sate: [], cubierta: [], fachada: [], plataforma: [], rampa: [] } as Record<Exclude<TipoObra, "ascensor">, number[]>;
  for (const f of filas) {
    const t = tipoDe(f.tipo_obra);
    if (!t || t === "ascensor" || enAños(f.fecha_documento!) < desde) continue;
    pemPorTipo[t].push(Number(f.pem) * aHoy(enAños(f.fecha_documento!)));
  }

  return {
    hoy,
    subidaAnual: Math.exp(b) - 1,
    subidaMinima: Math.exp(pendienteMinima) - 1,
    semestres,
    ascensorPorCaso,
    pemPorTipo,
  };
}
