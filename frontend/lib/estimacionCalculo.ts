// lib/estimacionCalculo.ts
//
// Las CUENTAS de la estimacion de costes, sin nada de servidor: las usan la
// pantalla (al momento, en el navegador) y el informe (en el servidor), para
// que digan exactamente lo mismo. Los datos salen de lib/estimacionCostes.ts.
//
// La pregunta que contesta (Monica, 11-oct-2026): "yo como vecino, ¿cuanto
// tengo que soltar?". Por eso, ademas del PEM, los TRES PRECIOS de una obra:
// PEM -> + gastos generales y beneficio -> + IVA = lo que se paga. Los
// porcentajes vienen de la tabla parametros_economicos.

export type TipoObra = "ascensor" | "sate" | "cubierta" | "fachada" | "plataforma" | "rampa";

/** Como suben los precios de un tipo de obra. */
export type Indice = {
  subidaAnual: number;
  subidaMinima: number;
  /** Periodos pasados: su nivel de precios respecto a hoy (1 = hoy). */
  periodos: { etiqueta: string; x: number; nivel: number; obras: number }[];
  /** De que obras sale, dicho con palabras. */
  base: string;
};

export type DatosEstimacion = {
  hoy: string;
  /** 0,19 y 0,10, de parametros_economicos. */
  gastosBeneficio: number;
  iva: number;
  indices: { general: Indice; sate: Indice };
  ascensorPorCaso: Record<string, number[]>;
  /** SATE: euros de PEM por m² "de fachada", a precio de hoy (la cubierta cuenta kCubierta veces). */
  satePorM2: number[];
  kCubierta: number;
  pemPorTipo: { plataforma: number[]; rampa: number[] };
};

export type Entrada = { caso: string; paradas: number; m2Fachada: number; m2Cubierta: number };
export type Estimacion = { hoy: number; bajo: number; alto: number; obras: number; nota: string | null };

export const TIPOS: { clave: TipoObra; nombre: string }[] = [
  { clave: "ascensor", nombre: "Ascensor" },
  { clave: "sate", nombre: "SATE completo (fachada y cubierta)" },
  { clave: "fachada", nombre: "SATE de fachada" },
  { clave: "cubierta", nombre: "SATE de cubierta" },
  { clave: "plataforma", nombre: "Plataforma" },
  { clave: "rampa", nombre: "Rampa" },
];

export const CASOS: [string, string][] = [
  ["A", "A · Se demuele la escalera"],
  ["B", "B · Se demuele y reconstruye la escalera"],
  ["C", "C · Se cajea la escalera"],
  ["D", "D · Solo ascensor, sin tocar la escalera"],
  ["E", "E · Mejora de accesibilidad en planta baja"],
  ["F", "F · Bajada de ascensor existente"],
];

/** Por debajo de esto, la estimacion es orientativa. */
export const MINIMO_OBRAS = 8;

export const esSate = (t: TipoObra) => t === "sate" || t === "fachada" || t === "cubierta";
export const indiceDe = (d: DatosEstimacion, t: TipoObra) => (esSate(t) ? d.indices.sate : d.indices.general);

export function cuantil(xs: number[], q: number): number {
  const a = [...xs].sort((x, y) => x - y);
  if (!a.length) return NaN;
  const p = (a.length - 1) * q;
  const i = Math.floor(p);
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (p - i);
}

export function estimar(d: DatosEstimacion, tipo: TipoObra, e: Entrada): Estimacion | null {
  if (tipo === "ascensor") {
    let base = d.ascensorPorCaso[e.caso] ?? [];
    let nota: string | null = null;
    if (base.length < MINIMO_OBRAS) {
      base = Object.values(d.ascensorPorCaso).flat();
      nota = `Del caso ${e.caso} hay solo ${(d.ascensorPorCaso[e.caso] ?? []).length} obras: se estima con todos los ascensores.`;
    }
    if (!e.paradas || e.paradas < 1 || !base.length) return null;
    return { hoy: cuantil(base, 0.5) * e.paradas, bajo: cuantil(base, 0.25) * e.paradas, alto: cuantil(base, 0.75) * e.paradas, obras: base.length, nota };
  }
  if (esSate(tipo)) {
    const m2 = (tipo === "cubierta" ? 0 : e.m2Fachada || 0) + (tipo === "fachada" ? 0 : (e.m2Cubierta || 0) * d.kCubierta);
    if (!m2 || !d.satePorM2.length) return null;
    const b = d.satePorM2;
    return { hoy: cuantil(b, 0.5) * m2, bajo: cuantil(b, 0.25) * m2, alto: cuantil(b, 0.75) * m2, obras: b.length, nota: null };
  }
  const base = d.pemPorTipo[tipo];
  if (!base.length) return { hoy: NaN, bajo: NaN, alto: NaN, obras: 0, nota: "Todavía no hay obras de este tipo con datos suficientes." };
  return {
    hoy: cuantil(base, 0.5),
    bajo: cuantil(base, 0.25),
    alto: cuantil(base, 0.75),
    obras: base.length,
    nota: base.length < MINIMO_OBRAS ? `Solo ${base.length} obras de este tipo: es orientativo.` : "Sin distinguir por tamaño.",
  };
}

/** Los tres precios: PEM, sin IVA (con gastos generales y beneficio) y lo que se paga (con IVA). */
export const tresPrecios = (d: DatosEstimacion, pem: number) => {
  const sinIva = pem * (1 + d.gastosBeneficio);
  return { pem, sinIva, conIva: sinIva * (1 + d.iva) };
};

/** El precio al cabo de unos meses, con la subida anual dada. */
export const dentroDe = (hoy: number, meses: number, subidaAnual: number) => hoy * (1 + subidaAnual) ** (meses / 12);
