// lib/fichaFacturacion.ts
//
// LA FICHA DE FACTURACION DE UNA OPP (Monica, 19-oct-2026, sobre su maqueta aprobada).
// La hoja de encargo era el paquete en el que llegaban las lineas con sus hitos; aqui
// se ve como se reempaquetan en facturas. De arriba abajo:
//   - cabecera: el nombre de la opp, su codigo, el comercial y el administrador;
//   - el resumen: firmado · ya facturado (cobrado) · queda por facturar, sin IVA;
//   - lado a lado, lo que QUEDA POR FACTURAR (naranja), agrupado por quien paga, y lo
//     YA FACTURADO (azul), factura a factura con su estado y sus conceptos en corto;
//   - LO CONTRATADO entero, hoja a hoja, cada pago en su color.
// El cobro, con la regla de Monica: hasta 2023 la factura lo garantiza; desde 2024,
// con justificante (tabla cobros); devuelta si hay devolucion y no se ha cubierto.

import "server-only";
import { detalleCobro, type Libro } from "./cobros";
import { cuentasDeHito, type Hito } from "./cobrosCalculo";
import { nombreDeOpp } from "./direccionOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
async function leer<T>(path: string): Promise<T[]> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T[];
}
const r2 = (n: number) => Math.round(n * 100) / 100;

export type EstadoFactura = "cobrada" | "pendiente_ingreso" | "devuelta" | "anulada";
export type PagoFicha = {
  id: string;
  concepto: string;
  que: string;
  importe: number | null;
  /** Facturas (vivas) que lo cubren, con su numero corto. */
  facturas: string[];
  /** En que esta, si aun no se ha facturado. */
  cuando: { texto: string; tono: "verde" | "ambar" | "gris" | null };
  porFacturar: number;
  aExito: boolean;
};
export type LineaFicha = { id: string; descripcion: string; importe: number; esPorcentaje: boolean; porcentaje: number | null; pagos: PagoFicha[] };
export type HojaFicha = { id: string; codigo: string | null; fecha: string | null; visor: string | null; lineas: LineaFicha[] };
export type FacturaFicha = {
  id: string;
  numero: string;
  fecha: string | null;
  base: number;
  total: number;
  estado: EstadoFactura;
  fechaCobro: string | null;
  aNombreDe: string | null;
  pdf: boolean;
  conceptos: { texto: string; importe: number }[];
};
export type FichaFacturacion = {
  oppId: string;
  nombre: string;
  codigo: string | null;
  comercial: string | null;
  administradores: string[];
  firmado: number;
  facturado: number;
  cobrado: number;
  pendienteIngreso: number;
  devuelto: number;
  porFacturar: number;
  aExito: number;
  /** Lo que queda, agrupado por quien paga. */
  pendientes: { quien: string; tipo: string; pagos: PagoFicha[] }[];
  facturas: FacturaFicha[];
  hojas: HojaFicha[];
};

const TIPO: Record<string, string> = { comunidad: "comunidad", contrata: "empresa", particular: "particular", persona: "particular" };
const CORTO: Record<string, string> = {
  "REDACCION PROYECTO": "Proyecto", CSS: "CSS", DF: "DF", "CERTIFICADO FIN DE OBRA": "CFO", "TRAMITACION SUBVENCIONES": "Subv.",
  "TRAMITACION SUBVENCIONES ACCESIBILIDAD": "Subv.", "TRAMITACION SUBVENCIONES EFICIENCIA ENERGETICA": "Subv.", "DOCUMENTACION TECNICA SUBVENCIONES": "Doc. técnica subv.",
  "TRAMITACION 3 PRESUPUESTOS": "3 presupuestos", "TRAMITACION LICENCIAS": "Licencias", IEE: "IEE", LEE: "Libro del edificio", "SATE CON CESION DE CAES": "SATE con CAES",
};
const PLAZO: Record<string, string> = {
  encargo: "al encargo", firma: "a la firma", entrega: "a la entrega", licencia: "a la licencia", concesion: "a la concesión", adjudicacion: "a la adjudicación",
  fin_obra: "al fin de obra", inicio_obra: "al inicio de obra", otro: "otro plazo", presentacion: "a la presentación", pss: "al plan de seguridad",
};
const queHito = (h: Hito, i: number, n: number) =>
  `${h.porcentaje ? `${Number(h.porcentaje).toLocaleString("es-ES")} % ` : ""}${PLAZO[h.tipo] ?? h.tipo}${n > 1 && !h.porcentaje ? ` (${i + 1}.º)` : ""}`;
const dia = (s: string | null) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "");

export async function fichaFacturacion(oppId: string, libro: Libro = "accesalia"): Promise<FichaFacturacion | null> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return null;
  const d = await detalleCobro(oppId, libro);
  if (!d) return null;
  const lids = d.documentos.flatMap((x) => x.lineas.map((l) => l.id));
  const [opps, adms, lin, sueltas] = await Promise.all([
    leer<{ codigo: string | null; nombre: string | null; comercial: { nombre: string; apellidos: string | null } | null }>(
      `oportunidades?select=codigo,nombre,comercial:comercial_id(nombre,apellidos)&id=eq.${oppId}`),
    leer<{ p: { persona: { nombre: string | null; apellidos: string | null } | null } | null; e: { nombre_accesalia: string } | null }>(
      `administradores_de_oportunidad?select=p:puesto_id(persona:persona_id(nombre,apellidos)),e:empresa_id(nombre_accesalia)&oportunidad_id=eq.${oppId}`),
    lids.length
      ? leer<{ id: string; pagador_tipo: string | null; pagador_id: string | null; bloque: { codigo: string; nombre_corto: string | null } | null }>(
          `lineas_facturacion?select=id,pagador_tipo,pagador_id,bloque:bloque_id(codigo,nombre_corto)&id=in.(${lids.join(",")})`)
      : Promise.resolve([]),
    leer<{ id: string }>(`facturas?select=id&oportunidad_id=eq.${oppId}`),
  ]);
  const o = opps[0];
  const linDe = new Map(lin.map((l) => [l.id, l]));
  const corto = (lid: string, desc: string) => {
    const b = linDe.get(lid)?.bloque;
    if (b) return CORTO[b.codigo] ?? b.nombre_corto ?? b.codigo;
    return /seguridad/i.test(desc) ? "CSS" : /subvenci/i.test(desc) ? "Subv." : /proyecto/i.test(desc) ? "Proyecto" : desc.split(/[\s(,]/)[0] || "Otros";
  };
  const numCorto = (n: string) => n.replace(/\/[A-Z0-9]+-/, "/");

  // Cada pago (un hito, o cada subhito de uno fraccionado) con su linea.
  const hojas: HojaFicha[] = d.documentos.map((doc) => ({
    id: doc.id,
    codigo: doc.codigo,
    fecha: doc.fecha,
    visor: doc.visor[0]?.url ?? null,
    lineas: doc.lineas.map((l) => {
      const hs = l.hitos.flatMap((h) => (h.subhitos.length ? h.subhitos.map((s, j) => ({ h: s, que: `${queHito(h, 0, 1)} · parte ${j + 1}` })) : [{ h, que: "" }]));
      const pagos = hs
        .filter((x) => x.h.estado !== "anulado")
        .map((x, i): PagoFicha => {
          const c = cuentasDeHito(x.h);
          const vivas = x.h.facturas.filter((f) => f.estado !== "anulada");
          const cuando: PagoFicha["cuando"] = vivas.length
            ? { texto: "", tono: null }
            : x.h.enPausaDesde ? { texto: "en pausa", tono: "ambar" }
            : c.aExito ? { texto: "a éxito", tono: "gris" }
            : x.h.fechaPrevista ? { texto: `prevista ${dia(x.h.fechaPrevista)}`, tono: null }
            : x.h.tipo === "encargo" || x.h.tipo === "firma" ? { texto: "facturable ya", tono: "verde" }
            : { texto: "sin fecha", tono: null };
          return {
            id: x.h.id,
            concepto: corto(l.id, l.descripcion),
            que: x.que || queHito(x.h, i, hs.length),
            importe: x.h.importe == null ? null : Number(x.h.importe),
            facturas: vivas.map((f) => numCorto(f.numero)),
            cuando,
            porFacturar: c.porFacturar,
            aExito: c.aExito,
          };
        });
      return { id: l.id, descripcion: l.descripcion.split("\n")[0].trim(), importe: r2(l.hitos.reduce((s, h) => s + (h.estado === "anulado" ? 0 : Number(h.importe) || 0), 0)), esPorcentaje: l.esPorcentaje, porcentaje: l.porcentaje, pagos };
    }),
  }));
  const todos = hojas.flatMap((h) => h.lineas.flatMap((l) => l.pagos.map((p) => ({ p, lid: l.id }))));

  // LO QUE QUEDA, por quien paga.
  const pend = todos.filter(({ p }) => !p.facturas.length && (p.porFacturar > 0 || p.aExito));
  const grupos = new Map<string, PagoFicha[]>();
  for (const { p, lid } of pend) {
    const l = linDe.get(lid);
    const k = `${l?.pagador_tipo ?? "comunidad"}|${l?.pagador_id ?? ""}`;
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }
  const ids = [...grupos.keys()].map((k) => k.split("|") as [string, string]);
  const com = ids.filter(([t, i]) => t === "comunidad" && i).map(([, i]) => i);
  const con = ids.filter(([t, i]) => t === "contrata" && i).map(([, i]) => i);
  const per = ids.filter(([t, i]) => t !== "comunidad" && t !== "contrata" && i).map(([, i]) => i);
  const [cs, ks, ps] = await Promise.all([
    com.length ? leer<{ id: string; nombre: string }>(`comunidades?select=id,nombre&id=in.(${com.join(",")})`) : Promise.resolve([]),
    con.length ? leer<{ id: string; nombre: string }>(`contratas?select=id,nombre&id=in.(${con.join(",")})`) : Promise.resolve([]),
    per.length ? leer<{ id: string; nombre: string | null; apellidos: string | null }>(`persona?select=id,nombre,apellidos&id=in.(${per.join(",")})`) : Promise.resolve([]),
  ]);
  const nombreDe = new Map<string, string>([
    ...cs.map((x) => [x.id, x.nombre] as [string, string]),
    ...ks.map((x) => [x.id, x.nombre] as [string, string]),
    ...ps.map((x) => [x.id, [x.nombre, x.apellidos].filter(Boolean).join(" ")] as [string, string]),
  ]);
  const pendientes = [...grupos.entries()].map(([k, pagos]) => {
    const [tipo, id] = k.split("|");
    return { quien: (id && nombreDe.get(id)) || (tipo === "comunidad" ? "la comunidad" : tipo), tipo: TIPO[tipo] ?? tipo, pagos };
  });

  // LO YA FACTURADO: cada factura con su estado y lo que cubre.
  const fids = [...new Set([...d.documentos.flatMap((doc) => doc.lineas.flatMap((l) => l.hitos.flatMap((h) => [h, ...h.subhitos].flatMap((x) => x.facturas.map((f) => f.id))))), ...sueltas.map((x) => x.id)])];
  const [facts, cobros] = fids.length
    ? await Promise.all([
        leer<{ id: string; anio: number; numero: number; fecha: string | null; base: number | null; total: number | null; estado: string; tipo: string; url_pdf: string | null; pagador_nombre: string | null }>(
          `facturas?select=id,anio,numero,fecha,base,total,estado,tipo,url_pdf,pagador_nombre&id=in.(${fids.join(",")})&order=fecha`),
        leer<{ factura_id: string; importe: number | null; tipo: string | null; fecha_cobro: string | null }>(`cobros?select=factura_id,importe,tipo,fecha_cobro&factura_id=in.(${fids.join(",")})`),
      ])
    : [[], []];
  const cubreDe = new Map<string, { texto: string; importe: number }[]>();
  for (const doc of d.documentos)
    for (const l of doc.lineas) {
      const hs = l.hitos.flatMap((h) => (h.subhitos.length ? h.subhitos.map((s, j) => ({ h: s, que: `${queHito(h, 0, 1)} · parte ${j + 1}` })) : [{ h, que: "" }]));
      hs.forEach((x, i) => {
        for (const f of x.h.facturas)
          cubreDe.set(f.id, [...(cubreDe.get(f.id) ?? []), { texto: `${corto(l.id, l.descripcion)} · ${x.que || queHito(x.h, i, hs.length)}`, importe: f.importe }]);
      });
    }
  const facturas: FacturaFicha[] = facts.map((f) => {
    const sus = cobros.filter((c) => c.factura_id === f.id);
    const total = Number(f.total) || 0;
    const cobrado = sus.reduce((s, c) => s + (Number(c.importe) || 0), 0);
    const estado: EstadoFactura =
      f.estado === "anulada" || f.tipo === "abono" ? "anulada"
      : !sus.length ? (f.anio < 2024 ? "cobrada" : "pendiente_ingreso")
      : sus.some((c) => c.importe == null) || cobrado >= total - 1 ? "cobrada"
      : sus.some((c) => c.tipo === "devolucion") ? "devuelta"
      : "pendiente_ingreso";
    return {
      id: f.id,
      numero: `${f.anio}/${f.numero}`,
      fecha: f.fecha,
      base: Number(f.base) || 0,
      total,
      estado,
      fechaCobro: sus.map((c) => c.fecha_cobro).filter((x): x is string => !!x).sort().at(-1) ?? null,
      aNombreDe: f.pagador_nombre,
      pdf: !!f.url_pdf,
      conceptos: cubreDe.get(f.id) ?? [],
    };
  });
  const vivas = facturas.filter((f) => f.estado !== "anulada");
  const suma = (fs: FacturaFicha[]) => r2(fs.reduce((s, f) => s + f.base, 0));

  return {
    oppId,
    nombre: nombreDeOpp(o ?? null),
    codigo: o?.codigo ?? null,
    comercial: o?.comercial ? [o.comercial.nombre, o.comercial.apellidos].filter(Boolean).join(" ") : null,
    administradores: adms.map((a) => [[a.p?.persona?.nombre, a.p?.persona?.apellidos].filter(Boolean).join(" "), a.e ? `(${a.e.nombre_accesalia})` : ""].filter(Boolean).join(" ")).filter(Boolean),
    firmado: r2(todos.reduce((s, { p }) => s + (p.importe ?? 0), 0)),
    facturado: suma(vivas),
    cobrado: suma(vivas.filter((f) => f.estado === "cobrada")),
    pendienteIngreso: suma(vivas.filter((f) => f.estado === "pendiente_ingreso")),
    devuelto: suma(vivas.filter((f) => f.estado === "devuelta")),
    porFacturar: r2(pend.reduce((s, { p }) => s + p.porFacturar, 0)),
    aExito: pend.filter(({ p }) => p.aExito).length,
    pendientes,
    facturas,
    hojas,
  };
}
