// lib/estimacionCalculo.ts
//
// Las CUENTAS de la estimacion de costes, sin nada de servidor: las usan la
// pantalla (al momento, en el navegador) y el informe (en el servidor), para
// que digan exactamente lo mismo. Los datos salen de lib/estimacionCostes.ts.

export type TipoObra = "ascensor" | "sate" | "cubierta" | "fachada" | "plataforma" | "rampa";

export type DatosEstimacion = {
  hoy: string;
  subidaAnual: number;
  subidaMinima: number;
  semestres: { semestre: string; nivel: number; obras: number }[];
  ascensorPorCaso: Record<string, number[]>;
  pemPorTipo: Record<Exclude<TipoObra, "ascensor">, number[]>;
};

export type Estimacion = { hoy: number; bajo: number; alto: number; obras: number; nota: string | null };

export const TIPOS: { clave: TipoObra; nombre: string }[] = [
  { clave: "ascensor", nombre: "Ascensor" },
  { clave: "sate", nombre: "SATE completo" },
  { clave: "cubierta", nombre: "Cubierta" },
  { clave: "fachada", nombre: "Fachada" },
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

export function cuantil(xs: number[], q: number): number {
  const a = [...xs].sort((x, y) => x - y);
  if (!a.length) return NaN;
  const p = (a.length - 1) * q;
  const i = Math.floor(p);
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (p - i);
}

export function estimar(d: DatosEstimacion, tipo: TipoObra, caso: string, paradas: number): Estimacion | null {
  if (tipo === "ascensor") {
    let base = d.ascensorPorCaso[caso] ?? [];
    let nota: string | null = null;
    if (base.length < MINIMO_OBRAS) {
      base = Object.values(d.ascensorPorCaso).flat();
      nota = `Del caso ${caso} hay solo ${(d.ascensorPorCaso[caso] ?? []).length} obras: se estima con todos los ascensores.`;
    }
    if (!paradas || paradas < 1 || !base.length) return null;
    return { hoy: cuantil(base, 0.5) * paradas, bajo: cuantil(base, 0.25) * paradas, alto: cuantil(base, 0.75) * paradas, obras: base.length, nota };
  }
  const base = d.pemPorTipo[tipo];
  if (!base.length) return { hoy: NaN, bajo: NaN, alto: NaN, obras: 0, nota: "Todavía no hay obras de este tipo con datos suficientes." };
  return {
    hoy: cuantil(base, 0.5),
    bajo: cuantil(base, 0.25),
    alto: cuantil(base, 0.75),
    obras: base.length,
    nota:
      base.length < MINIMO_OBRAS
        ? `Solo ${base.length} obras de este tipo: es orientativo. Falta completar sus datos (los m² de las mediciones).`
        : "Sin distinguir por tamaño: falta completar los m² de las mediciones.",
  };
}

/** El precio al cabo de unos meses, con la subida anual dada. */
export const dentroDe = (hoy: number, meses: number, subidaAnual: number) => hoy * (1 + subidaAnual) ** (meses / 12);
