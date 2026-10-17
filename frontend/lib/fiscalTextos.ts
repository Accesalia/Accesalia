// Tipos y nombres del calendario fiscal, sin nada de servidor (ver lib/fiscal.ts).

export type LibroFiscal = "accesalia" | "ecobalance";
export type Empresa = "accesalia" | "daniel_autonomo" | "ecobalance";
export const EMPRESAS: Record<LibroFiscal, Empresa[]> = { accesalia: ["accesalia", "daniel_autonomo"], ecobalance: ["ecobalance"] };
export const EMPRESA_LABEL: Record<Empresa, string> = { accesalia: "Accesalia", daniel_autonomo: "Daniel (autónomo)", ecobalance: "Ecobalance" };
export const LIBRO_LABEL: Record<LibroFiscal, string> = { accesalia: "Accesalia y Daniel de Soto", ecobalance: "Ecobalance" };

/** Un pago o una presentacion en el calendario: un vencimiento, o un plazo de uno fraccionado. */
export type Pago = {
  clave: string;
  empresa: Empresa;
  modelo: string;
  nombre: string;
  periodo: string;       // "3T-2026", "Año 2025", "sept 2026"
  plazo?: string;        // "plazo 2 de 6"
  fecha: string;         // el dia que sale el dinero (o el ultimo para presentar)
  vigilar: string;       // el dia que hay que tenerlo hecho (domiciliado: unos dias antes)
  importe: number | null;
  estimado: boolean;
  /** Lo previsto (importe_estimado) y lo real (importe), por separado: la desviacion. */
  previsto: number | null;
  real: number | null;
  /** Que impuesto es (la obligacion), para agrupar en su tarjeta. */
  obligacion: string;
  sinCargo: boolean;     // se presenta pero no se paga (informativas, cuentas)
  estado: "pendiente" | "hecho" | "fraccionado";
  estadoTexto: string;
  notas: string | null;
};

/** Una obligacion con lo que es en cristiano (obligaciones_fiscales.explicacion). */
export type Obligacion = { id: string; empresa: Empresa; modelo: string; nombre: string; domiciliado: boolean; explicacion: string | null };
