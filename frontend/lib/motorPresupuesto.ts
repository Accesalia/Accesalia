// lib/motorPresupuesto.ts
//
// EL MOTOR DE PRESUPUESTOS (Monica, 10-oct-2026). Es el mismo que se valido
// contra Factusol (scripts/facturacion/generar_presupuestos_app.py: 137 de 213
// iguales, el resto datos historicos o erratas de Factusol), pasado aqui para
// que la pantalla enseñe el presupuesto mientras se marcan las hojas.
//
// Sus reglas (v2, Monica, 10-oct):
//   - Solo lo que SE COBRA es una linea con precio. La primera de cada hoja lleva
//     el texto fijo: "Segun hoja de encargo de fecha ..., honorarios a la
//     contratacion por <concepto> en edificio residencial existente en:
//     <direccion>. El total de los honorarios incluye: - ...".
//   - Lo que va A EXITO aparece, pero no cuenta: en una linea a 0. Tambien el %
//     de un concepto que ademas tiene parte fija (documentacion tecnica 1.980 +
//     tramitacion 3,5 % a exito): la parte fija es linea con precio.
//   - Los bloques 'no_aparece' no salen (ya vienen fuera de `incluidos`).
//
// No lleva "server-only": lo usan la pantalla (en vivo) y el servidor (al
// guardar), y asi los dos calculan exactamente lo mismo.

export type Cobro = { nombre: string; importe: number | null; pct: number | null; lineaId: string | null };

/** Una hoja tal como entra en el motor: lo que se cobra y lo incluido. */
export type HojaMotor = {
  id: string;
  codigo: string | null;
  versionId: string | null;
  /** fecha de la hoja (la de su ultima version) y, si esta firmada, la de la firma */
  fecha: string | null;
  fechaFirma: string | null;
  cobra: Cobro[];
  incluidos: string[];
};

export type LineaPresupuesto = { concepto: string; importe: number; hojaId: string; lineaId: string | null };

const PCT = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
const ddmmaaaa = (f: string | null) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "");

export function lineasDelPresupuesto(hojas: HojaMotor[], direccion: string): LineaPresupuesto[] {
  const items: LineaPresupuesto[] = [];
  for (const h of [...hojas].sort((a, b) => (a.codigo ?? "").localeCompare(b.codigo ?? ""))) {
    const conPrecio = h.cobra.filter((x) => x.importe);
    const aExito = h.cobra
      .filter((x) => !x.importe || x.pct)
      .map((x) => `${x.nombre} (a éxito${x.pct ? `, ${PCT.format(x.pct)} %` : ""})`);
    conPrecio.forEach((x, k) => {
      let txt = x.nombre;
      if (k === 0) {
        txt =
          `Según hoja de encargo de fecha ${ddmmaaaa(h.fecha)}` +
          (h.fechaFirma ? ` y recibida firmada en fecha ${ddmmaaaa(h.fechaFirma)}` : "") +
          `, honorarios a la contratación por ${x.nombre} en edificio residencial existente en: ${direccion}`;
        if (h.incluidos.length) txt += ". El total de los honorarios incluye: " + h.incluidos.map((i) => "- " + i).join(" ");
      }
      items.push({ concepto: txt, importe: Number(x.importe), hojaId: h.id, lineaId: x.lineaId });
    });
    if (aExito.length)
      items.push({
        concepto: "Incluido en el presupuesto, sin coste en este momento: " + aExito.map((i) => "- " + i).join(" "),
        importe: 0,
        hojaId: h.id,
        lineaId: null,
      });
  }
  return items;
}

export const IVA = 21;

export function totales(lineas: LineaPresupuesto[]) {
  const base = Math.round(lineas.reduce((s, l) => s + (l.importe || 0), 0) * 100) / 100;
  const cuota = Math.round(base * IVA) / 100;
  return { base, cuota, total: Math.round((base + cuota) * 100) / 100 };
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
