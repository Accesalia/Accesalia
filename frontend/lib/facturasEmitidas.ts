// lib/facturasEmitidas.ts
//
// COBRAR › FACTURAS EMITIDAS (Monica, 16-oct-2026). Las facturas de Factusol de
// Accesalia y de Daniel de Soto (las de Ecobalance son el libro de Ana), con su
// PDF y, sobre todo, DONDE VA cada una: a que hito de que hoja ("la columna
// «Donde va» es una mina de oro"). Y las notas de facturacion de esos hitos (lo
// que se apunto al casarlas: abonos, "manda la factura", subhitos...).

import "server-only";
import { nombreDeOpp } from "./direccionOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Range: `${d}-${d + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const x = (await r.json()) as T[];
    out.push(...x);
    if (x.length < 1000) return out;
  }
}
async function porTramos<T>(ids: string[], hacer: (t: string) => string): Promise<T[]> {
  const tramos: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) tramos.push(ids.slice(i, i + 150));
  return (await Promise.all(tramos.map((t) => leer<T>(hacer(t.join(",")))))).flat();
}

/** Las facturas del libro de Accesalia: las emiten Accesalia y Daniel. */
export const EMPRESAS = { accesalia: "Accesalia", daniel: "Daniel de Soto" } as const;
export type Empresa = keyof typeof EMPRESAS;

/** Como se dice cada plazo. */
const PLAZO: Record<string, string> = {
  encargo: "al encargo", firma: "a la firma", entrega: "a la entrega", licencia: "a la licencia", inicio_obra: "al inicio de obra",
  cfo: "al fin de obra", pss: "al plan de seguridad", presentacion: "a la presentación", concesion: "a la concesión",
  adjudicacion: "a la adjudicación", otro: "otro plazo",
};

export type DondeVa = {
  /** "50 % al encargo" · "6.611,57 € de la entrega (11.500 €)". */
  plazo: string;
  /** Lo que se cobra: la linea de la hoja, corta. */
  que: string;
  hoja: string | null;
  importe: number;
};
export type NotaHito = { fecha: string; texto: string };
/** COBRADO = JUSTIFICANTE SUBIDO (Monica, 12-oct-2026), de la tabla `cobros`
 *  (hilo 68): cada fila un ingreso, una devolucion (negativa) o un confirming. */
export type Cobro = { id: string; fecha: string | null; importe: number | null; tipo: string };
/** "cobrada_factura": HASTA 2023 no se descargaban los justificantes y "la
 *  factura garantiza el cobro" (Monica, 17-oct-2026): se da por cobrada. */
export type EstadoCobro = "cobrada" | "cobrada_factura" | "parcial" | "devuelta" | "sin_justificante" | "anulada";
/** Desde que año se guardan los justificantes de cobro (antes, manda la factura). */
export const JUSTIFICANTES_DESDE = 2024;
export type FacturaEmitida = {
  id: string;
  empresa: Empresa;
  tipo: "factura" | "abono";
  numero: string;
  fecha: string | null;
  estado: string;
  base: number;
  total: number;
  pdf: boolean;
  /** La direccion: la opp de la hoja, o la de la factura, o lo que dice la factura. */
  direccion: string;
  oppId: string | null;
  pagador: string | null;
  referencia: string | null;
  donde: DondeVa[];
  /** Lo facturado que no esta casado con ningun hito. */
  sinCasar: number;
  notas: NotaHito[];
  /** Los justificantes de cobro y lo que suman (con IVA). */
  cobros: Cobro[];
  cobrado: number;
  /** Por los justificantes: cobrada si suman el total (con 1 € de margen). */
  estadoCobro: EstadoCobro;
};

type Cruda = {
  id: string; tipo: "factura" | "abono"; empresa_emisora: Empresa; anio: number; serie: string; numero: number; fecha: string | null;
  referencia: string | null; estado: string; pagador_nombre: string | null; base: number | null; total: number | null; url_pdf: string | null;
  oportunidad_id: string | null;
  opp: { id: string; nombre: string | null; codigo: string | null } | null;
  lineas: {
    base: number | null;
    enlaces: {
      importe: number | null;
      hito: {
        id: string; hito: string; porcentaje: number | null; importe: number | null; hito_padre_id: string | null;
        linea: { descripcion: string | null; hoja: { numero_hoja: string | null; oportunidad: { id: string; nombre: string | null; codigo: string | null } | null } | null } | null;
      } | null;
    }[];
  }[];
};

// "always": en español, sin el, los miles de cuatro cifras no llevan punto (3850).
const eur = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const pct = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const corta = (d: string | null) => (d ?? "").split(/\s+[—–-]\s+|\s*\(/)[0].trim().slice(0, 60);

/** Las facturas de un año (o de todos: null). */
export async function facturasEmitidas(anio: number | null): Promise<FacturaEmitida[]> {
  const fa = await leer<Cruda>(
    `facturas?select=id,tipo,empresa_emisora,anio,serie,numero,fecha,referencia,estado,pagador_nombre,base,total,url_pdf,oportunidad_id,` +
      `opp:oportunidad_id(id,nombre,codigo),` +
      `lineas:factura_lineas(base,enlaces:factura_linea_hitos(importe,hito:hito_cobro_id(id,hito,porcentaje,importe,hito_padre_id,` +
      `linea:linea_facturacion_id(descripcion,hoja:hoja_encargo_id(numero_hoja,oportunidad:oportunidad_id(id,nombre,codigo))))))` +
      `&empresa_emisora=in.(accesalia,daniel)${anio ? `&anio=eq.${anio}` : ""}&order=fecha.desc.nullslast,numero.desc`,
  );
  // Los hitos padre de los subhitos (para decir "de la entrega de 11.500") y las notas de todos.
  const hitos = fa.flatMap((f) => f.lineas.flatMap((l) => l.enlaces.map((e) => e.hito).filter((h): h is NonNullable<typeof h> => !!h)));
  const padresIds = [...new Set(hitos.map((h) => h.hito_padre_id).filter((x): x is string => !!x))];
  const todosIds = [...new Set([...hitos.map((h) => h.id), ...padresIds])];
  const [padres, notas, cobros] = await Promise.all([
    porTramos<{ id: string; hito: string; importe: number | null }>(padresIds, (t) => `hitos_cobro?select=id,hito,importe&id=in.(${t})`),
    porTramos<{ hito_cobro_id: string; fecha: string | null; texto: string }>(todosIds,
      (t) => `notas_facturacion?select=hito_cobro_id,fecha,texto&hito_cobro_id=in.(${t})&order=fecha`),
    porTramos<{ id: string; factura_id: string; fecha_cobro: string | null; importe: number | null; tipo: string }>(fa.map((f) => f.id),
      (t) => `cobros?select=id,factura_id,fecha_cobro,importe,tipo&factura_id=in.(${t})&order=fecha_cobro`).catch(() => []),
  ]);
  const cobrosDe = new Map<string, Cobro[]>();
  for (const c of cobros)
    cobrosDe.set(c.factura_id, [...(cobrosDe.get(c.factura_id) ?? []), { id: c.id, fecha: c.fecha_cobro, importe: c.importe == null ? null : Number(c.importe), tipo: c.tipo }]);
  const padreDe = new Map(padres.map((p) => [p.id, p]));
  const notasDe = new Map<string, NotaHito[]>();
  for (const n of notas) notasDe.set(n.hito_cobro_id, [...(notasDe.get(n.hito_cobro_id) ?? []), { fecha: n.fecha ?? "", texto: n.texto }]);

  return fa.map((f) => {
    const donde: DondeVa[] = [];
    const vistas = new Set<string>();
    const susNotas: NotaHito[] = [];
    let casado = 0;
    let opp = f.opp;
    for (const l of f.lineas)
      for (const e of l.enlaces) {
        const h = e.hito;
        if (!h) continue;
        const importe = Number(e.importe) || 0;
        casado += importe;
        const padre = h.hito_padre_id ? padreDe.get(h.hito_padre_id) : null;
        const plazo = padre
          ? `${eur(importe)} ${PLAZO[padre.hito] ?? padre.hito}${padre.importe ? ` (de ${eur(Number(padre.importe))})` : ""}`
          : `${h.porcentaje ? `${pct(Number(h.porcentaje))} % ` : ""}${PLAZO[h.hito] ?? h.hito}`;
        donde.push({ plazo, que: corta(h.linea?.descripcion ?? null), hoja: h.linea?.hoja?.numero_hoja ?? null, importe });
        opp = opp ?? h.linea?.hoja?.oportunidad ?? null;
        for (const id of [h.id, h.hito_padre_id])
          if (id && !vistas.has(id)) {
            vistas.add(id);
            susNotas.push(...(notasDe.get(id) ?? []));
          }
      }
    const base = Number(f.base) || 0;
    const total = Number(f.total) || 0;
    const susCobros = cobrosDe.get(f.id) ?? [];
    const cobrado = Math.round(susCobros.reduce((s, c) => s + (c.importe ?? 0), 0) * 100) / 100;
    // Las reglas de Monica (hilo 68): con justificante = alguna fila; cobrada = suman
    // el total (1 € de margen); devuelta = alguna devolucion y no llega al total. Una
    // fila sin importe leido cuenta como cobrada (hay justificante, falta leerlo).
    const estadoCobro: EstadoCobro =
      f.estado === "anulada" || f.tipo === "abono" ? "anulada"
      : !susCobros.length ? (f.anio < JUSTIFICANTES_DESDE ? "cobrada_factura" : "sin_justificante")
      : cobrado >= total - 1 || susCobros.some((c) => c.importe == null) ? "cobrada"
      : susCobros.some((c) => c.tipo === "devolucion") ? "devuelta"
      : "parcial";
    return {
      id: f.id,
      empresa: f.empresa_emisora,
      tipo: f.tipo,
      numero: `${f.anio}/${f.numero}`,
      fecha: f.fecha,
      estado: f.estado,
      base,
      total,
      pdf: !!f.url_pdf,
      direccion: opp ? nombreDeOpp(opp) : (f.referencia ?? f.pagador_nombre ?? "—"),
      oppId: opp?.id ?? null,
      pagador: f.pagador_nombre,
      referencia: f.referencia,
      donde,
      sinCasar: f.tipo === "factura" && f.estado !== "anulada" ? Math.max(0, Math.round((base - casado) * 100) / 100) : 0,
      notas: susNotas,
      cobros: susCobros,
      cobrado,
      estadoCobro,
    };
  });
}
