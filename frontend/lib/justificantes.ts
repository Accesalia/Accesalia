// lib/justificantes.ts
//
// SUBIR JUSTIFICANTES DE COBRO (Monica y Alexandra, 26-oct-2026; maqueta validada docs/figma/subir-justificante.html).
// Se entra desde Cobrar › Facturas sin justificante con un solo boton, sin ninguna factura marcada: a que aplica el
// papel se elige DESPUES. Flujo de Alexandra: sube el papel → empresa → numeros de factura → fecha, tipo, lo que entra
// en el banco y el gasto → cuadre (±1 €) → si no cuadra, completa / parcial una a una → guardar. Hasta guardar no se
// apunta nada.
//
// Un justificante es lo de siempre: filas de `cobros`, una por factura, con el mismo fichero. Lo unico nuevo es
// cobros.gasto (confirming, factoring, la comision del banco por el cargo), REPARTIDO entre las facturas del papel en
// proporcion a lo que se paga de cada una (opcion b). El estado de la factura y de sus hitos NO se escribe aqui: lo
// calcula la base al entrar los cobros (recalcular_estado_factura, migracion 20261026120000).

import "server-only";
import type { Yo } from "./sesion";
import { puedeVerCobros } from "./cobros";
import { recalcularLuego } from "./estadoOportunidad";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...CAB, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
async function todo<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await pedir(path, { headers: { Range: `${desde}-${desde + 999}`, "Range-Unit": "items" } });
    const filas = (await r.json()) as T[];
    out.push(...filas);
    if (filas.length < 1000) return out;
  }
}

export const puedeSubirJustificantes = puedeVerCobros;

export type Empresa = "accesalia" | "daniel";
export const TIPOS_COBRO = [
  ["transferencia", "Transferencia"],
  ["confirming", "Confirming"],
  ["cargo_en_cuenta", "Cargo en cuenta"],
  ["aviso_de_pago", "Aviso de pago"],
  ["otro", "Otro"],
] as const;
export type TipoCobro = (typeof TIPOS_COBRO)[number][0];

/** Una factura que espera su justificante: sin ninguno, o cobrada en parte (con lo que queda). */
export type PorJustificar = {
  id: string;
  empresa: Empresa;
  numero: string; // "2026/96"
  pagador: string | null;
  total: number;
  cobrado: number;
  queda: number;
  justificantes: number;
  ultimoCobro: string | null;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Las facturas de Accesalia y Daniel que no tienen justificante o no llegan al total (±1 €). Las devoluciones restan. */
export async function porJustificar(): Promise<PorJustificar[]> {
  const fs = await todo<{
    id: string; empresa_emisora: Empresa; anio: number; numero: number; total: number | null; pagador_nombre: string | null;
    cobros: { importe: number | null; fecha_cobro: string | null }[];
  }>(
    "facturas?select=id,empresa_emisora,anio,numero,total,pagador_nombre,cobros(importe,fecha_cobro)" +
      "&empresa_emisora=in.(accesalia,daniel)&estado=not.in.(anulada,otro)&or=(tipo.is.null,tipo.eq.factura)&order=anio.desc,numero.desc",
  );
  const out: PorJustificar[] = [];
  for (const f of fs) {
    const total = Number(f.total) || 0;
    // Un justificante sin importe leido cuenta como cobrada (la misma regla que la base).
    if (f.cobros.some((c) => c.importe == null)) continue;
    const cobrado = r2(f.cobros.reduce((s, c) => s + Number(c.importe), 0));
    if (f.cobros.length && cobrado >= total - 1) continue;
    out.push({
      id: f.id,
      empresa: f.empresa_emisora,
      numero: `${f.anio}/${f.numero}`,
      pagador: f.pagador_nombre,
      total,
      cobrado,
      queda: r2(total - cobrado),
      justificantes: f.cobros.length,
      ultimoCobro: f.cobros.map((c) => c.fecha_cobro).filter((x): x is string => !!x).sort().at(-1) ?? null,
    });
  }
  return out;
}

/** EL GASTO REPARTIDO en proporcion a lo que se paga de cada factura; el ultimo se lleva los centimos. */
export function repartirGasto(importes: number[], gasto: number): number[] {
  const suma = importes.reduce((s, x) => s + x, 0);
  if (!gasto || !suma) return importes.map(() => 0);
  const partes = importes.map((x) => r2((gasto * x) / suma));
  partes[partes.length - 1] = r2(gasto - partes.slice(0, -1).reduce((s, x) => s + x, 0));
  return partes;
}

const limpio = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120) || "justificante";

export type Pago = { facturaId: string; importe: number };

/** GUARDAR: sube el papel y apunta una fila de cobros por factura. Comprueba de nuevo el cuadre (±1 €). */
export async function guardarJustificante(
  yo: Yo,
  d: { empresa: Empresa; fecha: string; tipo: TipoCobro; ingresado: number; gasto: number; pagos: Pago[]; fichero: File },
): Promise<{ facturas: number }> {
  if (!puedeSubirJustificantes(yo)) throw new Error("No tienes acceso a los cobros.");
  if (d.empresa !== "accesalia" && d.empresa !== "daniel") throw new Error("Falta la empresa.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) throw new Error("Falta la fecha del cobro.");
  if (!TIPOS_COBRO.some(([t]) => t === d.tipo)) throw new Error("Falta el tipo de cobro.");
  if (!(d.ingresado > 0)) throw new Error("Falta lo que ha entrado en el banco.");
  if (!(d.gasto >= 0)) throw new Error("El gasto no puede ser negativo.");
  if (!d.pagos.length) throw new Error("No has marcado ninguna factura.");
  if (!d.fichero || !d.fichero.size) throw new Error("Falta el justificante.");
  if (d.fichero.size > 9.5 * 1024 * 1024) throw new Error("El justificante pasa de 9,5 MB: redúcelo o hazle una foto más pequeña.");
  const ids = [...new Set(d.pagos.map((p) => p.facturaId))];
  if (ids.length !== d.pagos.length || ids.some((x) => !/^[0-9a-f-]{36}$/.test(x))) throw new Error("Hay una factura repetida o no válida.");
  if (d.pagos.some((p) => !(p.importe > 0))) throw new Error("Cada factura tiene que llevar lo que se paga de ella.");

  // Las facturas, como estan AHORA (por si otra persona acaba de subir algo).
  const pendientes = new Map((await porJustificar()).map((f) => [f.id, f]));
  for (const p of d.pagos) {
    const f = pendientes.get(p.facturaId);
    if (!f) throw new Error("Una de las facturas ya no espera justificante: recarga la pantalla.");
    if (f.empresa !== d.empresa) throw new Error(`La ${f.numero} no es de esta empresa.`);
    if (p.importe > f.queda + 1) throw new Error(`De la ${f.numero} quedan ${f.queda.toFixed(2)} €: no se pueden pagar ${p.importe.toFixed(2)} €.`);
  }
  const suma = r2(d.pagos.reduce((s, p) => s + p.importe, 0));
  if (Math.abs(suma - d.gasto - d.ingresado) > 1)
    throw new Error(`No cuadra: las facturas suman ${suma.toFixed(2)} €, menos ${d.gasto.toFixed(2)} € de gasto, y han entrado ${d.ingresado.toFixed(2)} €.`);

  // 1. El papel, al almacen privado `facturas`, junto a los demas justificantes.
  const anio = d.fecha.slice(0, 4);
  const sello = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const ruta = `justificantes/${d.empresa}/${anio}/${sello}_${limpio(d.fichero.name)}`;
  const sube = await fetch(`${URL_BASE}/storage/v1/object/facturas/${ruta}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": d.fichero.type || "application/octet-stream", "x-upsert": "false" },
    body: Buffer.from(await d.fichero.arrayBuffer()),
  });
  if (!sube.ok) throw new Error(`No se ha podido guardar el justificante: ${sube.status} ${await sube.text()}`);

  // 2. Una fila por factura, con su parte del gasto. La base recalcula sola el estado de cada factura y sus hitos.
  const gastos = repartirGasto(d.pagos.map((p) => p.importe), r2(d.gasto));
  await pedir("cobros", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      d.pagos.map((p, i) => ({
        factura_id: p.facturaId, fecha_cobro: d.fecha, importe: r2(p.importe), tipo: d.tipo, gasto: gastos[i] || null,
        justificante: `almacen:facturas/${ruta}`, subido_por: yo.id,
      })),
    ),
  });

  // 3. La escalera de las opps de esas facturas (el comercial ve el cobro).
  const opps = await todo<{ oportunidad_id: string | null; lineas: { enlaces: { hito: { linea: { hoja: { oportunidad_id: string } | null } | null } | null }[] }[] }>(
    `facturas?select=oportunidad_id,lineas:factura_lineas(enlaces:factura_linea_hitos(hito:hito_cobro_id(linea:linea_facturacion_id(hoja:he_version_id(oportunidad_id)))))&id=in.(${ids.join(",")})`,
  ).catch(() => []);
  recalcularLuego(
    ...opps.flatMap((f) => [f.oportunidad_id, ...f.lineas.flatMap((l) => l.enlaces.map((e) => e.hito?.linea?.hoja?.oportunidad_id ?? null))]),
  );
  return { facturas: d.pagos.length };
}
