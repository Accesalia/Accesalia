// lib/proximosHitos.ts
//
// COBRAR › PROXIMOS HITOS A FACTURAR (maqueta validada, Monica, 12-oct-2026):
// "¿Que es lo siguiente que voy a emitir? Por semanas, con su disparador; lo que
// ya se puede facturar, arriba y con su boton". Y «Facturable ya» es su primera
// pestaña.
//
// Que entra: los hitos (y subhitos) PENDIENTES de las lineas de hojas firmadas
// del libro de Accesalia y Daniel, que aun no tienen factura. Las lineas aun sin
// validar (en la bandeja de Nuevas Hojas) entran marcadas: primero se validan. Un hito
// con subhitos no entra: entran sus subhitos.
// Cuando:
//   - en pausa: lo marco una persona (en_pausa_desde);
//   - FACTURABLE YA: al encargo o a la firma (la hoja ya esta firmada: "Firmada el
//     10 oct"), o con su fecha prevista ya cumplida;
//   - esta semana / este mes / mas adelante: por su fecha prevista;
//   - sin fecha: "mas adelante", diciendo que no tiene (los disparadores de
//     entrega, licencia o fin de obra aun no se leen de proyecto).
// LO FIRMADO ANTES DE 2025 VA EN SU PESTAÑA ("antigua", 17-oct-2026): las facturas
// de 2022-2024 ya estan casadas con sus hitos (hilo e3), pero 2020-2021 se quedan
// como facturas sueltas, sin hito. Un hito antiguo sin factura enlazada puede
// estar cobrado con una suelta: se revisa aparte, sin mezclarlo con lo de ahora.

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

export type Cuando = "ya" | "semana" | "mes" | "adelante" | "pausa" | "antigua";
export type HitoProximo = {
  id: string;
  oppId: string | null;
  direccion: string;
  hoja: string | null;
  /** "Proyecto ascensor · a la firma". */
  que: string;
  /** Por que ya, o cuando: "Firmada 10 oct", "prevista 24 oct", "sin fecha". */
  porQue: string;
  cuando: Cuando;
  /** Para ordenar: la fecha del disparador o la prevista. */
  fecha: string | null;
  paga: string;
  importe: number | null;
  /** La proforma emitida que lo lleva, si la hay. */
  proforma: string | null;
  /** Su linea ya esta validada (si no, esta en la bandeja de Nuevas Hojas). */
  validada: boolean;
};

const PLAZO: Record<string, string> = {
  encargo: "al encargo", firma: "a la firma", entrega: "a la entrega", licencia: "a la licencia", inicio_obra: "al inicio de obra",
  cfo: "al fin de obra", pss: "al plan de seguridad", presentacion: "a la presentación", concesion: "a la concesión",
  adjudicacion: "a la adjudicación", otro: "otro plazo",
};
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dia = (iso: string) => `${Number(iso.slice(8, 10))} ${MES[Number(iso.slice(5, 7)) - 1]}${iso.slice(0, 4) !== new Date().toISOString().slice(0, 4) ? ` ${iso.slice(2, 4)}` : ""}`;
const corta = (d: string | null) => (d ?? "").split(/\s+[—–-]\s+|\s*\(/)[0].trim().slice(0, 50);
const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

type Linea = {
  id: string;
  validada_en: string | null;
  descripcion: string | null;
  hoja: {
    numero_hoja: string | null; estado: string; fecha_firma: string | null; pagador_tipo: string | null;
    contrata: { nombre: string | null } | null;
    opp: { id: string; nombre: string | null; codigo: string | null } | null;
  } | null;
  hitos: { id: string; hito: string; porcentaje: number | null; importe: number | null; estado: string; fecha_prevista: string | null; en_pausa_desde: string | null; hito_padre_id: string | null }[];
};

export const DESDE = "2025-01-01";

export async function proximosHitos(): Promise<{ hitos: HitoProximo[]; previos: number }> {
  const lineas = await leer<Linea>(
    `lineas_facturacion?select=id,descripcion,validada_en,` +
      `hoja:hoja_encargo_id!inner(numero_hoja,estado,fecha_firma,pagador_tipo,contrata:pagador_contrata_id(nombre),opp:oportunidad_id(id,nombre,codigo)),` +
      `hitos:hitos_cobro(id,hito,porcentaje,importe,estado,fecha_prevista,en_pausa_desde,hito_padre_id)` +
      `&hoja.estado=eq.devuelta_firmada&quitada_en=is.null&emisor=in.(accesalia,daniel_autonomo)`,
  );
  // Los candidatos: pendientes, y si tienen subhitos, los subhitos (no el padre).
  const conHijos = new Set(lineas.flatMap((l) => l.hitos.map((h) => h.hito_padre_id).filter(Boolean)));
  const todos = lineas.flatMap((l) => l.hitos.filter((h) => h.estado === "pendiente" && !conHijos.has(h.id)).map((h) => ({ l, h })));
  const cand = todos;
  const esAntigua = (l: Linea) => (l.hoja?.fecha_firma ?? "9999") < DESDE;
  const ids = cand.map((c) => c.h.id);
  // Fuera lo ya facturado (factura no anulada); y la proforma emitida que lo lleve.
  const [facturados, proformas] = await Promise.all([
    porTramos<{ hito_cobro_id: string; linea: { factura: { estado: string } | null } | null }>(ids,
      (t) => `factura_linea_hitos?select=hito_cobro_id,linea:factura_linea_id(factura:factura_id(estado))&hito_cobro_id=in.(${t})`),
    porTramos<{ hito_cobro_id: string; linea: { proforma: { codigo: string; estado: string; factura_id: string | null } | null } | null }>(ids,
      (t) => `proforma_linea_hitos?select=hito_cobro_id,linea:proforma_linea_id(proforma:proforma_id(codigo,estado,factura_id))&hito_cobro_id=in.(${t})`).catch(() => []),
  ]);
  const yaFacturado = new Set(facturados.filter((f) => f.linea?.factura?.estado !== "anulada").map((f) => f.hito_cobro_id));
  // Los subhitos ya facturados de cada padre (para saber cual es «resto pendiente»).
  const hermanos = lineas.flatMap((l) => l.hitos).filter((h) => h.hito_padre_id);
  const facturadosHermanos = hermanos.length
    ? new Set(
        (await porTramos<{ hito_cobro_id: string; linea: { factura: { estado: string } | null } | null }>(hermanos.map((h) => h.id),
          (t) => `factura_linea_hitos?select=hito_cobro_id,linea:factura_linea_id(factura:factura_id(estado))&hito_cobro_id=in.(${t})`))
          .filter((f) => f.linea?.factura?.estado !== "anulada").map((f) => f.hito_cobro_id),
      )
    : new Set<string>();
  const restoPendiente = (h: { id: string; hito_padre_id: string | null }) =>
    !!h.hito_padre_id && hermanos.some((x) => x.hito_padre_id === h.hito_padre_id && x.id !== h.id && facturadosHermanos.has(x.id));
  const proformaDe = new Map(
    proformas.filter((p) => p.linea?.proforma?.estado === "emitida" && !p.linea.proforma.factura_id).map((p) => [p.hito_cobro_id, p.linea!.proforma!.codigo]),
  );

  const hoy = hoyISO();
  const semana = new Date(Date.parse(hoy) + 7 * 86400000).toISOString().slice(0, 10);
  const finMes = `${hoy.slice(0, 7)}-31`;
  const out: HitoProximo[] = [];
  for (const { l, h } of cand) {
    if (yaFacturado.has(h.id)) continue;
    const firma = l.hoja?.fecha_firma ?? null;
    let cuando: Cuando, porQue: string, fecha: string | null;
    if (h.en_pausa_desde) {
      cuando = "pausa"; porQue = `en pausa desde ${dia(h.en_pausa_desde)}`; fecha = h.en_pausa_desde;
    } else if ((h.hito === "encargo" || h.hito === "firma") && firma) {
      cuando = "ya"; porQue = `Firmada ${dia(firma)}`; fecha = firma;
    } else if (h.fecha_prevista && h.fecha_prevista <= hoy) {
      cuando = "ya"; porQue = `prevista ${dia(h.fecha_prevista)}`; fecha = h.fecha_prevista;
    } else if (h.fecha_prevista) {
      fecha = h.fecha_prevista; porQue = `prevista ${dia(h.fecha_prevista)}`;
      cuando = h.fecha_prevista <= semana ? "semana" : h.fecha_prevista <= finMes ? "mes" : "adelante";
    } else {
      cuando = "adelante"; fecha = null; porQue = h.importe == null ? "a éxito" : "sin fecha prevista";
    }
    // Un subhito de «resto pendiente» (su padre tiene otro subhito ya facturado) no es
    // historia: es lo que queda por facturar de algo vivo (41 y 68, 18-oct).
    if (esAntigua(l) && !restoPendiente(h)) cuando = "antigua";
    const opp = l.hoja?.opp ?? null;
    out.push({
      id: h.id,
      oppId: opp?.id ?? null,
      direccion: opp ? nombreDeOpp(opp) : "—",
      hoja: l.hoja?.numero_hoja ?? null,
      que: `${corta(l.descripcion)} · ${h.porcentaje ? `${Number(h.porcentaje).toLocaleString("es-ES")} % ` : ""}${PLAZO[h.hito] ?? h.hito}${h.hito_padre_id ? " (parte)" : ""}`,
      porQue,
      cuando,
      fecha,
      paga: l.hoja?.pagador_tipo === "contrata" ? (l.hoja.contrata?.nombre ?? "Contrata") : "Comunidad",
      importe: h.importe == null ? null : Number(h.importe),
      proforma: proformaDe.get(h.id) ?? null,
      validada: !!l.validada_en,
    });
  }
  // Lo mas antiguo primero dentro de lo que ya se puede; lo mas cercano, en lo demas.
  return { hitos: out.sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999")), previos: out.filter((h) => h.cuando === "antigua").length };
}
