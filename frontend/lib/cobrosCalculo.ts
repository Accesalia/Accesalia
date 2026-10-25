// lib/cobrosCalculo.ts
//
// Lo de la pantalla de facturacion que sirve igual en el servidor y en el
// navegador: los tipos, los textos y las cuentas de cada hito y documento
// (ver lib/cobros.ts). Sin "server-only" a proposito.

// ------------------------------------------------------------------ tipos

export type TipoDocumento = "hoja_encargo" | "contrato" | "pedido" | "nota_responsabilidad";
export const TEXTO_DOCUMENTO: Record<TipoDocumento, string> = {
  hoja_encargo: "Hoja de encargo",
  contrato: "Contrato",
  pedido: "Pedido",
  nota_responsabilidad: "Nota de responsabilidad",
};
export const TEXTO_HITO: Record<string, string> = {
  firma: "A la firma",
  encargo: "Al encargo",
  entrega: "A la entrega del proyecto",
  licencia: "A la licencia",
  pss: "A la firma del PSS",
  inicio_obra: "Al inicio de obra",
  cfo: "Al CFO",
  presentacion: "A la presentación de la subvención",
  concesion: "A la concesión",
  otro: "Pactado",
};

export type FacturaDeHito = { id: string; numero: string; fecha: string | null; estado: string; importe: number; pdf: boolean };
export type Hito = {
  id: string;
  tipo: string;
  orden: number;
  importe: number | null;
  porcentaje: number | null;
  estado: string;
  fechaPrevista: string | null;
  enPausaDesde: string | null;
  texto: string | null;
  facturas: FacturaDeHito[];
  subhitos: Hito[];
  notas: { fecha: string | null; texto: string; autor: string | null }[];
  /** Hito a exito cerrado a mano (25-oct-2026): ya no lleva mas concesiones. */
  cerrado?: string | null;
};
export type LineaFacturable = { id: string; descripcion: string; importe: number | null; esPorcentaje: boolean; porcentaje: number | null; hitos: Hito[] };
export type Documento = {
  id: string;
  codigo: string | null;
  tipo: TipoDocumento;
  titulo: string;
  fecha: string | null;
  estado: string;
  importe: number;
  /** El documento para verlo: el firmado si lo hay; si no, el generado. */
  visor: { etiqueta: string; url: string }[];
  responsable: string | null;
  motivoSinFirma: string | null;
  lineas: LineaFacturable[];
};

// ---------------------------------------------------------- los calculos

/** Lo que un hito (o subhito) ha facturado y cobrado. Las facturas anuladas no
 *  cuentan. El de un hito fraccionado es la suma de sus subhitos. */
export function cuentasDeHito(h: Hito): { importe: number; facturado: number; cobrado: number; porFacturar: number; aExito: boolean; enPausa: boolean } {
  const enPausa = !!h.enPausaDesde;
  if (h.subhitos.length) {
    const s = h.subhitos.map(cuentasDeHito);
    const facturado = s.reduce((a, x) => a + x.facturado, 0);
    const cobrado = s.reduce((a, x) => a + x.cobrado, 0);
    const imp = Number(h.importe) || s.reduce((a, x) => a + x.importe, 0);
    return { importe: imp, facturado, cobrado, porFacturar: h.estado === "anulado" ? 0 : Math.max(0, imp - facturado), aExito: false, enPausa };
  }
  const validas = h.facturas.filter((f) => f.estado !== "anulada");
  const facturado = validas.reduce((a, f) => a + f.importe, 0);
  const cobrado = validas.filter((f) => f.estado === "cobrada").reduce((a, f) => a + f.importe, 0);
  const imp = Number(h.importe) || 0;
  const aExito = h.importe == null;
  // Un hito completado sin factura cargada (anterior a 2025, o cobrado de otra forma) no queda por facturar.
  const porFacturar = aExito || h.estado === "anulado" || h.estado === "completado" ? 0 : Math.max(0, imp - facturado);
  return { importe: imp, facturado, cobrado, porFacturar, aExito, enPausa };
}

export function cuentasDeDocumento(d: Documento) {
  const hs = d.lineas.flatMap((l) => l.hitos);
  const c = hs.map(cuentasDeHito);
  const sumaHitos = c.reduce((a, x) => a + x.importe, 0);
  const sumaLineas = d.lineas.filter((l) => !l.esPorcentaje).reduce((a, l) => a + (Number(l.importe) || 0), 0);
  return {
    firmado: d.importe || sumaLineas,
    sumaLineas,
    sumaHitos,
    facturado: c.reduce((a, x) => a + x.facturado, 0),
    cobrado: c.reduce((a, x) => a + x.cobrado, 0),
    porFacturar: c.filter((x) => !x.enPausa).reduce((a, x) => a + x.porFacturar, 0),
    enPausa: c.filter((x) => x.enPausa).reduce((a, x) => a + x.porFacturar, 0),
    aExito: c.filter((x) => x.aExito).length,
  };
}

