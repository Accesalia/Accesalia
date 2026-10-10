// lib/calculoTasas.ts
//
// LAS CUENTAS DE LAS TASAS, sin nada de servidor: las usa la calculadora de
// Documentacion de referencia (y las usara la viabilidad). Una regla de
// reglas_tasas + los datos de la obra -> cuanto se adelanta y cuanto acaba
// costando, o por que no se puede calcular todavia.
//
// Solo se usan las reglas VIGENTES (las cerradas se quedan como referencia de
// lo ya emitido: Monica, 10-oct-2026).

export type Via = "licencia" | "declaracion_responsable";
export type Canal = "directo" | "ecu";

export type Regla = {
  id: string;
  organismo: string;
  concepto: string;
  subtipo: string | null;
  via: "licencia" | "declaracion_responsable" | "ambas";
  canal: "directo" | "ecu" | "ambos";
  metodo: string;
  base: string;
  porcentaje: number | null;
  importeFijo: number | null;
  importeUnidad: number | null;
  minimo: number | null;
  maximo: number | null;
  tramos: { desde: number; hasta: number | null; importe: number }[] | null;
  formula: string | null;
  bonificacionPct: number | null;
  bonificacionAlcance: string | null;
  bonificacionForma: string | null;
  bonificacionRequisitos: string | null;
  bonificacionPlazo: string | null;
  requiereDescargo: boolean;
  liquida: string | null;
  momento: string | null;
  validezDias: number | null;
  regulariza: boolean | null;
  aviso: string | null;
  notas: string | null;
  normativa: string | null;
  evidencia: string | null;
  validada: boolean;
  /** Claves de tipos_proyecto. Vacio = todas las obras. */
  tipos: string[];
};

export type Obra = {
  /** Clave del tipo elegido (ascensor, accesibilidad, eficiencia_energetica...). */
  tipo: string;
  via: Via;
  canal: Canal;
  pem: number | null;
  m2: number | null;
  m3: number | null;
  conBonificacion: boolean;
};

export type Linea = {
  regla: Regla;
  /** Lo que se paga al principio (null = no se puede calcular aun). */
  adelanto: number | null;
  /** Lo que acaba costando, con la bonificacion (null = no se puede calcular). */
  final: number | null;
  /** Por que no hay cifra, o de donde sale. */
  explicacion: string;
};

export const CONCEPTO: Record<string, string> = {
  tasa_urbanistica: "Tasa urbanística (licencia)",
  icio: "ICIO (impuesto de construcciones)",
  precio_ecu: "Precio de la ECU",
  fianza_residuos: "Fianza de residuos",
  fianza_reposicion: "Fianza de reposición de pavimento",
  ocupacion_via_publica: "Ocupación de vía pública",
  calas_zanjas: "Calas y zanjas",
  garantia_demanial: "Garantía por ocupar suelo público",
  otro: "Otro",
};

export const MOMENTO: Record<string, string> = {
  antes_de_presentar: "antes de presentar",
  al_presentar: "al presentar",
  tras_concesion: "tras la concesión",
  durante_obra: "durante la obra",
  fin_de_obra: "al final de la obra",
};

export const FORMA_BONIF: Record<string, string> = {
  en_autoliquidacion: "se descuenta al pagar",
  pago_reducido: "se paga ya reducido",
  devolucion_posterior: "se paga entero y se devuelve después",
  en_liquidacion: "llega ya descontada en la liquidación",
};

export const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/** ¿Vale la regla para esta obra? Un tipo de la regla vale si es el elegido,
 *  uno de sus antepasados (la familia) o uno de sus hijos. */
export function aplica(r: Regla, o: Obra, familia: (clave: string) => string[]): boolean {
  if (r.via !== "ambas" && r.via !== o.via) return false;
  if (r.canal !== "ambos" && r.canal !== o.canal) return false;
  if (!r.tipos.length) return true;
  const linaje = familia(o.tipo);
  return r.tipos.some((t) => linaje.includes(t) || familia(t).includes(o.tipo));
}

function cuota(r: Regla, o: Obra): { n: number | null; por: string } {
  const falta = (que: string) => ({ n: null, por: `Falta ${que}.` });
  switch (r.metodo) {
    case "porcentaje":
      if (r.base !== "pem" || r.porcentaje === null) return { n: null, por: "Sin porcentaje." };
      if (o.pem === null) return falta("el PEM");
      return { n: Math.max(r.minimo ?? 0, (o.pem * r.porcentaje) / 100), por: `${r.porcentaje.toLocaleString("es-ES")} % del PEM` };
    case "cuota_fija":
      return r.importeFijo === null ? { n: null, por: "Sin importe." } : { n: r.importeFijo, por: "cuota fija" };
    case "por_unidad":
      if (r.importeUnidad === null) return { n: null, por: "Sin tarifa." };
      if (r.base === "m3_residuos") {
        if (o.m3 === null) return falta("el volumen de residuos (m³) del estudio de gestión");
        return { n: Math.max(r.minimo ?? 0, o.m3 * r.importeUnidad), por: `${eur(r.importeUnidad)}/m³` };
      }
      if (r.base === "m2_afectados") {
        if (o.m2 === null) return falta("la superficie afectada (m²)");
        return { n: Math.max(r.minimo ?? 0, o.m2 * r.importeUnidad), por: `${eur(r.importeUnidad)}/m²` };
      }
      return { n: null, por: "Depende de datos que no se piden aquí." };
    case "fijo_mas_unidad":
      if (r.base === "m2_afectados") {
        if (o.m2 === null) return falta("la superficie afectada (m²)");
        return { n: (r.importeFijo ?? 0) + o.m2 * (r.importeUnidad ?? 0), por: "fijo + €/m²" };
      }
      return { n: null, por: "Depende de los m² y los días de ocupación." };
    case "tramos": {
      if (!r.tramos?.length) return { n: null, por: "Falta la tabla de tramos." };
      if (o.pem === null) return falta("el PEM");
      const t = r.tramos.find((x) => o.pem! >= x.desde && (x.hasta === null || o.pem! < x.hasta));
      return t ? { n: t.importe, por: "tramo del PEM" } : { n: null, por: "El PEM no cae en ningún tramo." };
    }
    case "segun_estudio_residuos":
      return { n: null, por: "Sale del estudio de gestión de residuos del proyecto." };
    default:
      return { n: null, por: "No se calcula solo." };
  }
}

export function calcular(r: Regla, o: Obra): Linea {
  const { n, por } = cuota(r, o);
  if (n === null) return { regla: r, adelanto: null, final: null, explicacion: por };
  const pct = o.conBonificacion && r.bonificacionPct ? r.bonificacionPct / 100 : 0;
  const final = n * (1 - pct);
  const adelanto = pct && r.bonificacionForma === "devolucion_posterior" ? n : final;
  const bon = pct ? ` − ${r.bonificacionPct?.toLocaleString("es-ES")} % de bonificación` : "";
  return { regla: r, adelanto, final, explicacion: por + bon };
}
