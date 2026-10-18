// lib/comisionesComercial.ts
//
// LAS COMISIONES DE NUESTROS COMERCIALES (Monica, 18-oct-2026). Cada comercial ve la
// suya; direccion, todas con un selector. Reglas (memoria comision-del-comercial):
//   - la cobra SIEMPRE el responsable de la opp (oportunidades.comercial_id), «JAMAS»
//     el captador; su % es comerciales.comision_pct;
//   - se devenga hito a hito CUANDO ACCESALIA COBRA, proporcional a lo cobrado;
//   - sobre el precio SIN la comision del administrador (la de su acuerdo verificado;
//     en las hojas nuevas, conceptos_hoja.comision_importe dice lo mismo);
//   - solo cuenta desde el 1-ene-2026: una opp cuya primera factura es de 2025 o antes,
//     no; y direccion puede marcar una opp como «no cuenta» (heredadas para gestion);
//   - solo lo de importe fijo: lo «a exito» no lleva importe y no comisiona.
// Lo de Ecobalance (3 presupuestos, CAES) no es de Accesalia: fuera.

import "server-only";
import type { Yo } from "./sesion";
import { nombreDeOpp } from "./direccionOpp";
import { enlacesPorHito, montarHitos, type FilaEnlace, type FilaHito } from "./cobros";
import type { Hito } from "./cobrosCalculo";
import { comisionAdminPorOpp, type Paso } from "./comisionesAdmin";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function leer<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CAB, Range: `${d}-${d + 999}` }, cache: "no-store" });
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
async function pedir(ruta: string, init: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

/** Desde cuando cuenta la comision interna: la primera factura de la opp, de 2026 en adelante. */
export const DESDE = "2026-01-01";
const r2 = (n: number) => Math.round(n * 100) / 100;

export type Comercial = { id: string; nombre: string; pct: number | null; nota: string | null };

/** En que esta la factura de un hito, para el comercial. */
export type EstadoHito = "pendiente_emitir" | "emitida" | "cobrada" | "devuelta" | "a_exito" | "anulado" | "completado_sin_factura";
export type HitoComision = {
  id: string;
  texto: string;
  importe: number | null;
  estado: EstadoHito;
  factura: string | null;
  fechaCobro: string | null;
  /** Su parte de este hito (null si no lleva: a exito, anulado). */
  comision: number | null;
  devengada: boolean;
  pagada: boolean;
  fechaPago: string | null;
  sub: boolean;
};
export type LineaComision = { id: string; hojaId: string; descripcion: string; importe: number; hitos: HitoComision[]; comision: number };
/** Una hoja firmada: su codigo, que lleva en corto («Proyecto + CSS») y su total. */
export type HojaComision = { id: string; codigo: string | null; fecha: string | null; que: string; total: number };
export type OppComisionComercial = {
  id: string;
  nombre: string;
  codigo: string | null;
  hojas: HojaComision[];
  primeraFactura: string | null;
  /** Lo firmado de Accesalia (suma de sus hitos con importe). */
  firmado: number;
  admin: { persona: string | null; importe: number; paso: Paso | null; pagada: boolean; fechaPago: string | null } | null;
  paraAccesalia: number;
  /** Su comision total en esta opp, y lo devengado (cobrado), pagado y pendiente de pagarle. */
  suya: number;
  devengada: number;
  pagada: number;
  porPagar: number;
  lineas: LineaComision[];
  /** Por que no cuenta: anterior a 2026, o marcada por direccion. */
  fuera: { motivo: "antes_de_2026" | "marcada"; nota: string | null } | null;
};

export async function listaComerciales(): Promise<Comercial[]> {
  const cs = await leer<{ id: string; nombre: string; apellidos: string | null; comision_pct: number | null; notas_comision: string | null; activo: boolean }>(
    "comerciales?select=id,nombre,apellidos,comision_pct,notas_comision,activo&activo=is.true&order=nombre",
  );
  return cs.map((c) => ({ id: c.id, nombre: [c.nombre, c.apellidos].filter(Boolean).join(" "), pct: c.comision_pct == null ? null : Number(c.comision_pct), nota: c.notas_comision }));
}

const TEXTO: Record<string, string> = {
  encargo: "al encargo", firma: "a la firma", entrega: "a la entrega", licencia: "a la licencia", concesion: "a la concesión",
  adjudicacion: "a la adjudicación", fin_obra: "al fin de obra", inicio_obra: "al inicio de obra", presentacion: "a la presentación", otro: "otro plazo",
};

/** Lo que lleva una linea, en corto, para el titulo de su hoja («Proyecto + CSS»). */
const CORTO: Record<string, string> = {
  "REDACCION PROYECTO": "Proyecto", CSS: "CSS", DF: "DF", "CERTIFICADO FIN DE OBRA": "CFO", "TRAMITACION SUBVENCIONES": "Subvenciones",
  "TRAMITACION SUBVENCIONES ACCESIBILIDAD": "Subvenciones", "TRAMITACION SUBVENCIONES EFICIENCIA ENERGETICA": "Subvenciones",
  "DOCUMENTACION TECNICA SUBVENCIONES": "Doc. técnica subvenciones", "TRAMITACION LICENCIAS": "Licencias", "SATE CON CESION DE CAES": "SATE con CAES",
  "SATE + ASCENSOR CON CESION DE CAES": "SATE + ascensor con CAES", "TOMA DE DATOS Y MODELADO 3D": "Toma de datos y 3D", LEE: "Libro del edificio",
};
function corto(b: { codigo: string; nombre_corto: string | null } | null, desc: string | null): string {
  if (b) return CORTO[b.codigo] ?? b.nombre_corto ?? b.codigo;
  const t = desc ?? "";
  if (/seguridad/i.test(t)) return "CSS";
  if (/subvenci/i.test(t)) return "Subvenciones";
  if (/direcci[oó]n facultativa/i.test(t)) return "DF";
  if (/proyecto/i.test(t)) return "Proyecto";
  return "Otros";
}

/** TODO LO DE UN COMERCIAL: sus opps con hoja firmada, linea a linea y hito a hito. */
export async function comisionesDe(c: Comercial): Promise<OppComisionComercial[]> {
  type O = { id: string; nombre: string | null; codigo: string | null; hojas: { id: string; numero_hoja: string | null; fecha_firma: string | null }[] };
  const ops = await leer<O>(
    `oportunidades?select=id,nombre,codigo,hojas:hojas_encargo!inner(id,numero_hoja,fecha_firma)&comercial_id=eq.${c.id}&estado=neq.anulada&hojas.estado=eq.devuelta_firmada`,
  );
  if (!ops.length) return [];
  const hojaIds = ops.flatMap((o) => o.hojas.map((h) => h.id));
  const lineas = await porTramos<{ id: string; hoja_encargo_id: string; descripcion: string | null; bloque: { codigo: string; nombre_corto: string | null } | null }>(hojaIds,
    (t) => `lineas_facturacion?select=id,hoja_encargo_id,descripcion,bloque:bloque_id(codigo,nombre_corto)&hoja_encargo_id=in.(${t})&quitada_en=is.null&emisor=in.(accesalia,daniel_autonomo)&order=creado_en`);
  const filas = await porTramos<FilaHito>(lineas.map((l) => l.id),
    (t) => `hitos_cobro?select=id,linea_facturacion_id,hito,orden,porcentaje,importe,estado,fecha_prevista,en_pausa_desde,notas,hito_padre_id&linea_facturacion_id=in.(${t})`);
  const [enl, marcas, pagos, admin] = await Promise.all([
    porTramos<FilaEnlace>(filas.map((h) => h.id),
      (t) => `factura_linea_hitos?select=hito_cobro_id,importe,linea:factura_linea_id(factura:factura_id(id,anio,serie,numero,tipo,fecha,estado,url_pdf,empresa_emisora))&hito_cobro_id=in.(${t})`),
    porTramos<{ oportunidad_id: string; no_cuenta: boolean; nota: string | null }>(ops.map((o) => o.id),
      (t) => `comision_comercial_opps?select=oportunidad_id,no_cuenta,nota&oportunidad_id=in.(${t})`),
    porTramos<{ hito_cobro_id: string; pagada: boolean; fecha_pago: string | null }>(filas.map((h) => h.id),
      (t) => `comision_comercial_hitos?select=hito_cobro_id,pagada,fecha_pago&hito_cobro_id=in.(${t})`),
    comisionAdminPorOpp(ops.map((o) => o.id)),
  ]);
  // El cobro de cada factura: desde 2024, con justificante (tabla cobros); hasta 2023 la factura lo garantiza.
  const facturaIds = [...new Set(enl.map((e) => e.linea?.factura?.id).filter((x): x is string => !!x))];
  const [facturas, cobros] = await Promise.all([
    porTramos<{ id: string; total: number | null; anio: number }>(facturaIds, (t) => `facturas?select=id,total,anio&id=in.(${t})`),
    porTramos<{ factura_id: string; importe: number | null; tipo: string | null; fecha_cobro: string | null }>(facturaIds,
      (t) => `cobros?select=factura_id,importe,tipo,fecha_cobro&factura_id=in.(${t})`),
  ]);
  const totalDe = new Map(facturas.map((f) => [f.id, { total: Number(f.total) || 0, anio: f.anio }]));
  const estadoFactura = (id: string, estado: string): { estado: EstadoHito; fecha: string | null } => {
    if (estado === "anulada") return { estado: "anulado", fecha: null };
    const cs = cobros.filter((x) => x.factura_id === id);
    const f = totalDe.get(id);
    const fecha = cs.map((x) => x.fecha_cobro).filter((x): x is string => !!x).sort().at(-1) ?? null;
    if (!cs.length) return { estado: f && f.anio < 2024 ? "cobrada" : "emitida", fecha: null };
    const cobrado = cs.reduce((s, x) => s + (Number(x.importe) || 0), 0);
    if (cs.some((x) => x.importe == null) || cobrado >= (f?.total ?? 0) - 1) return { estado: "cobrada", fecha };
    if (cs.some((x) => x.tipo === "devolucion")) return { estado: "devuelta", fecha: null };
    return { estado: "emitida", fecha: null };
  };
  const porLinea = montarHitos(filas, enlacesPorHito(enl), new Map());
  const marcaDe = new Map(marcas.map((m) => [m.oportunidad_id, m]));
  const pagoDe = new Map(pagos.map((p) => [p.hito_cobro_id, p]));
  const pct = (c.pct ?? 0) / 100;

  return ops
    .map((o) => {
      const susLineas = lineas.filter((l) => o.hojas.some((h) => h.id === l.hoja_encargo_id));
      // Las hojas de 2026 por las fechas de sus facturas: la primera factura de la opp.
      const todas: Hito[] = susLineas.flatMap((l) => (porLinea.get(l.id) ?? []).flatMap((h) => (h.subhitos.length ? [h, ...h.subhitos] : [h])));
      const fechas = todas.flatMap((h) => h.facturas.filter((f) => f.estado !== "anulada").map((f) => f.fecha)).filter((x): x is string => !!x).sort();
      const primeraFactura = fechas[0] ?? null;
      const firmado = r2(susLineas.flatMap((l) => porLinea.get(l.id) ?? []).reduce((s, h) => s + (h.estado === "anulado" ? 0 : Number(h.importe) || 0), 0));
      const ad = admin.get(o.id);
      const deudas = ad ? ad.opp.nuestras.filter((d) => d.importe) : [];
      const adminImporte = r2(deudas.reduce((s, d) => s + (d.importe ?? 0), 0));
      const paraAccesalia = r2(Math.max(0, firmado - adminImporte));
      // Cada hito comisiona sobre su parte del precio sin la comision del administrador.
      const factor = firmado > 0 ? paraAccesalia / firmado : 0;
      const hitoDe = (h: Hito, sub: boolean): HitoComision => {
        const fs = h.facturas.filter((f) => f.estado !== "anulada");
        const est = fs.length ? estadoFactura(fs[0].id, fs[0].estado) : null;
        const estado: EstadoHito =
          h.estado === "anulado" ? "anulado"
          : h.importe == null ? "a_exito"
          : est ? est.estado
          : h.estado === "completado" ? "completado_sin_factura"
          : "pendiente_emitir";
        const comision = h.importe == null || estado === "anulado" ? null : r2(Number(h.importe) * factor * pct);
        const p = pagoDe.get(h.id);
        return {
          id: h.id,
          texto: h.texto?.split(/[\n:]/)[0]?.trim() || TEXTO[h.tipo] || h.tipo,
          importe: h.importe == null ? null : Number(h.importe),
          estado,
          factura: fs[0]?.numero ?? null,
          fechaCobro: est?.fecha ?? null,
          comision,
          devengada: estado === "cobrada" || estado === "completado_sin_factura",
          pagada: !!p?.pagada,
          fechaPago: p?.fecha_pago ?? null,
          sub,
        };
      };
      const lineasC: LineaComision[] = susLineas.map((l) => {
        const hs = porLinea.get(l.id) ?? [];
        // Un hito fraccionado: cuentan sus subhitos (el padre solo agrupa).
        const hitos = hs.flatMap((h) => (h.subhitos.length ? h.subhitos.map((x) => hitoDe(x, true)) : [hitoDe(h, false)]));
        return {
          id: l.id,
          hojaId: l.hoja_encargo_id,
          descripcion: (l.descripcion ?? "").split("\n")[0].trim(),
          importe: r2(hs.reduce((s, h) => s + (h.estado === "anulado" ? 0 : Number(h.importe) || 0), 0)),
          hitos,
          comision: r2(hitos.reduce((s, h) => s + (h.comision ?? 0), 0)),
        };
      });
      const hs = lineasC.flatMap((l) => l.hitos).filter((h) => h.comision != null);
      const suya = r2(hs.reduce((s, h) => s + (h.comision ?? 0), 0));
      const devengada = r2(hs.filter((h) => h.devengada).reduce((s, h) => s + (h.comision ?? 0), 0));
      const pagada = r2(hs.filter((h) => h.pagada).reduce((s, h) => s + (h.comision ?? 0), 0));
      const m = marcaDe.get(o.id);
      const fuera: OppComisionComercial["fuera"] =
        m?.no_cuenta ? { motivo: "marcada", nota: m.nota } : primeraFactura && primeraFactura < DESDE ? { motivo: "antes_de_2026", nota: null } : null;
      const d0 = deudas[0];
      return {
        id: o.id,
        nombre: nombreDeOpp(o),
        codigo: o.codigo,
        hojas: o.hojas
          .map((h) => {
            const ls = susLineas.filter((l) => l.hoja_encargo_id === h.id);
            const que = [...new Set(ls.map((l) => corto(l.bloque, l.descripcion)))].join(" + ");
            return { id: h.id, codigo: h.numero_hoja, fecha: h.fecha_firma, que, total: r2(lineasC.filter((l) => l.hojaId === h.id).reduce((s, l) => s + l.importe, 0)) };
          })
          .filter((h) => h.que)
          .sort((a, b) => (a.codigo ?? "").localeCompare(b.codigo ?? "")),
        primeraFactura,
        firmado,
        admin: ad && adminImporte > 0
          ? { persona: ad.persona, importe: adminImporte, paso: d0?.paso ?? null, pagada: deudas.every((d) => d.pagada), fechaPago: deudas.map((d) => d.fechaPago).filter(Boolean).sort().at(-1) ?? null }
          : null,
        paraAccesalia,
        suya,
        devengada,
        pagada,
        porPagar: r2(Math.max(0, devengada - pagada)),
        lineas: lineasC,
        fuera,
      };
    })
    .sort((a, b) => (b.hojas.at(-1)?.fecha ?? "").localeCompare(a.hojas.at(-1)?.fecha ?? ""));
}

// ------------------------------------------------------------ lo que apunta direccion

export async function marcarNoCuenta(yo: Yo, oppId: string, noCuenta: boolean, nota: string | null) {
  await pedir("comision_comercial_opps?on_conflict=oportunidad_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ oportunidad_id: oppId, no_cuenta: noCuenta, nota: nota?.trim() || null, editado_por: yo.id, actualizado_en: new Date().toISOString() }),
  });
}

export async function marcarPagada(yo: Yo, hitoId: string, comercialId: string, pagada: boolean, fecha: string | null) {
  await pedir("comision_comercial_hitos?on_conflict=hito_cobro_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      hito_cobro_id: hitoId, comercial_id: comercialId, pagada, fecha_pago: pagada ? (fecha ?? new Date().toISOString().slice(0, 10)) : null,
      editado_por: yo.id, actualizado_en: new Date().toISOString(),
    }),
  });
}
