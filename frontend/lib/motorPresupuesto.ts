// lib/motorPresupuesto.ts
//
// EL MOTOR DE PRESUPUESTOS (Monica, 10-oct-2026). Es el mismo que se valido
// contra Factusol (scripts/facturacion/generar_presupuestos_app.py: 137 de 213
// iguales, el resto datos historicos o erratas de Factusol), pasado aqui para
// que la pantalla enseñe el presupuesto mientras se marcan las hojas.
//
// Sus reglas (v3, Monica, 27-oct: el presupuesto es PARA LA SUBVENCION):
//   - Solo lo que la comunidad PAGA y tendra factura que enseñar. Lo que va A
//     EXITO (el 3 %, el 3,5 % de la tramitacion...) NO sale: ni a 0. De un
//     concepto con parte fija y parte a exito, sale la parte fija.
//   - Cada hoja abre con «Segun hoja de encargo HE-XXXX-XXXX vN:» (sin importe:
//     «nos orienta a nosotros») y debajo sus conceptos, con el TEXTO DE LA HOJA
//     tal cual («si se cambia a mano, cuadra»).
//   - Lo incluido sin coste se queda como texto, sin importe (es parte de «que
//     hacemos»). Los bloques 'no_aparece' no salen (ya vienen fuera de `incluidos`).
//   - IVA EXPLICITO en cada concepto: base + 21 % (cuota) = total.
//
// No lleva "server-only": lo usan la pantalla (en vivo) y el servidor (al
// guardar), y asi los dos calculan exactamente lo mismo.

export type Cobro = { nombre: string; importe: number | null; pct: number | null; lineaId: string | null };

/** Una hoja tal como entra en el motor: lo que se cobra y lo incluido. */
export type HojaMotor = {
  id: string;
  /** HE-XXXX-XXXX vN */
  codigo: string | null;
  versionId: string | null;
  /** fecha de la hoja (la de su ultima version) y, si esta firmada, la de la firma */
  fecha: string | null;
  fechaFirma: string | null;
  cobra: Cobro[];
  incluidos: string[];
};

/** importe null = fila de texto (la cabecera de la hoja, lo incluido sin coste). */
export type LineaPresupuesto = { concepto: string; importe: number | null; hojaId: string; lineaId: string | null };

export const IVA = 21;

const red = (x: number) => Math.round(x * 100) / 100;
/** El IVA de un concepto, redondeado al centimo. */
export const cuotaDe = (base: number) => red((base * IVA) / 100);

export function lineasDelPresupuesto(hojas: HojaMotor[], _direccion?: string): LineaPresupuesto[] {
  const items: LineaPresupuesto[] = [];
  for (const h of [...hojas].sort((a, b) => (a.codigo ?? "").localeCompare(b.codigo ?? ""))) {
    // Lo que se cobra con importe fijo; lo que va solo a exito (sin importe) fuera.
    const conPrecio = h.cobra.filter((x) => x.importe);
    if (!conPrecio.length) continue;
    items.push({ concepto: `Según hoja de encargo ${h.codigo ?? "(número pendiente del ok)"}:`, importe: null, hojaId: h.id, lineaId: null });
    for (const x of conPrecio) items.push({ concepto: x.nombre, importe: Number(x.importe), hojaId: h.id, lineaId: x.lineaId });
    if (h.incluidos.length)
      items.push({ concepto: "Incluye, sin coste: " + h.incluidos.map((i) => "- " + i).join(" "), importe: null, hojaId: h.id, lineaId: null });
  }
  return items;
}

/** Base, IVA y total: la suma de los de cada concepto, para que el pie cuadre con las lineas. */
export function totales(lineas: LineaPresupuesto[]) {
  const con = lineas.filter((l) => l.importe);
  const base = red(con.reduce((s, l) => s + (l.importe ?? 0), 0));
  const cuota = red(con.reduce((s, l) => s + cuotaDe(l.importe ?? 0), 0));
  return { base, cuota, total: red(base + cuota) };
}

/** Quien paga, tal como sale en el documento (los datos del de Factusol). */
export type Cliente = {
  nombre: string;
  nif: string;
  domicilio: string;
  cp: string;
  poblacion: string;
  provincia: string;
};

export type FormaPago = "cargo_en_cuenta" | "transferencia";

/** Lo que Factusol imprime en "forma de pago" (sus formas 02 y 01). */
export const TEXTO_FORMA_PAGO: Record<FormaPago, string> = {
  cargo_en_cuenta: "CARGO EN CUENTA",
  transferencia: "TRANSFERENCIA: ES26 2100 1258 8102 0027 8980",
};

/** El emisor, como en la cabecera del de Factusol. */
export const EMISOR = {
  nombre: "SOLUCIONES DE ACCESIBILIDAD Y ECOEFICIENCIA ACCESALIA S.L.",
  domicilio: "ALHAMBRA 24",
  cp: "28047",
  poblacion: "MADRID",
  provincia: "MADRID",
  telefono: "644482971",
  nif: "B86374055",
};
