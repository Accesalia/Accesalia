import "server-only";
// lib/condicionesCobro.ts
//
// CONDICIONES DE COBRO POR PAGADOR (Monica, 25-oct-2026). Tabla condiciones_cobro (migracion 20261025100000): como
// cobra cada pagador. Comunidad y particular, por defecto, cargo en cuenta; cada contrata, la suya. Sale por defecto al
// facturar y se cambia a mano, como las formas de pago. En la misma pantalla se ven y se cambian dos datos que ya tenia
// cada contrata y que se quedan donde estan: quien le factura (contratas.emisor_factura) y los codigos que exige
// (contratas.codigos_exigidos). Las gestionan quienes gestionan las formas de pago.

import type { Yo } from "./sesion";
import { puedeGestionarFormas } from "./formasPago";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

export const puedeGestionarCondiciones = puedeGestionarFormas;

export type FormaCobro = "cargo_cuenta" | "transferencia" | "confirming";
export type ReglaPago = "al_cargo" | "dias" | "corte_remesa";
export type Emisor = "accesalia" | "daniel_autonomo" | null;
export const FORMAS_COBRO: [FormaCobro, string][] = [["cargo_cuenta", "Cargo en cuenta"], ["transferencia", "Transferencia"], ["confirming", "Confirming"]];

export type Condicion = {
  id: string;
  pagadorTipo: "comunidad" | "persona" | "contrata";
  contrata: { id: string; nombre: string; emisor: Emisor; codigos: string[] } | null;
  forma: FormaCobro | null;
  regla: ReglaPago | null;
  dias: number | null;
  diaCorte: number | null;
  diaRemesa: number | null;
  correo: string;
  alComercial: boolean;
  comoSeEnvia: string;
  pendiente: boolean;
  notas: string;
  activa: boolean;
  actualizadoEn: string;
  actualizadoPor: string | null;
};

/** Cuando paga, en palabras: lo que se lee en la lista. */
export function cuandoPaga(c: Pick<Condicion, "regla" | "dias" | "diaCorte" | "diaRemesa">): string {
  if (c.regla === "al_cargo") return "al hacer el cargo";
  if (c.regla === "dias") return `${c.dias} días después de la factura`;
  if (c.regla === "corte_remesa") return `emitida hasta el día ${c.diaCorte}, en la remesa del día ${c.diaRemesa} del mes siguiente`;
  return "";
}

export async function condicionesDeCobro(): Promise<{ condiciones: Condicion[]; contratasSin: { valor: string; texto: string }[] }> {
  const [filas, contratas] = await Promise.all([
    pedir<{
      id: string; pagador_tipo: Condicion["pagadorTipo"]; forma_cobro: FormaCobro | null; regla_pago: ReglaPago | null; dias: number | null; dia_corte: number | null; dia_remesa: number | null;
      correo_facturas: string | null; tambien_al_comercial: boolean; como_se_envia: string | null; pendiente: boolean; notas: string | null; activa: boolean; actualizado_en: string;
      contrata: { id: string; nombre: string; emisor_factura: Emisor; codigos_exigidos: string[] | null } | null; quien: { nombre: string } | null;
    }[]>(
      "condiciones_cobro?select=id,pagador_tipo,forma_cobro,regla_pago,dias,dia_corte,dia_remesa,correo_facturas,tambien_al_comercial,como_se_envia,pendiente,notas,activa,actualizado_en," +
        "contrata:contrata_id(id,nombre,emisor_factura,codigos_exigidos),quien:actualizado_por(nombre)",
    ),
    pedir<{ id: string; nombre: string }[]>("contratas?select=id,nombre&order=nombre.asc&limit=2000"),
  ]);
  const condiciones = filas.map((f) => ({
    id: f.id, pagadorTipo: f.pagador_tipo,
    contrata: f.contrata ? { id: f.contrata.id, nombre: f.contrata.nombre, emisor: f.contrata.emisor_factura, codigos: f.contrata.codigos_exigidos ?? [] } : null,
    forma: f.forma_cobro, regla: f.regla_pago, dias: f.dias, diaCorte: f.dia_corte, diaRemesa: f.dia_remesa,
    correo: f.correo_facturas ?? "", alComercial: f.tambien_al_comercial, comoSeEnvia: f.como_se_envia ?? "", pendiente: f.pendiente, notas: f.notas ?? "",
    activa: f.activa, actualizadoEn: f.actualizado_en, actualizadoPor: f.quien?.nombre ?? null,
  }));
  // Primero las generales, luego las contratas por nombre.
  condiciones.sort((a, b) => (a.contrata ? 1 : 0) - (b.contrata ? 1 : 0) || (a.contrata?.nombre ?? a.pagadorTipo).localeCompare(b.contrata?.nombre ?? b.pagadorTipo));
  const conCondicion = new Set(condiciones.filter((c) => c.activa && c.contrata).map((c) => c.contrata!.id));
  return { condiciones, contratasSin: contratas.filter((c) => !conCondicion.has(c.id)).map((c) => ({ valor: c.id, texto: c.nombre })) };
}

export type GuardarCondicion = {
  id: string | null;
  contrataId: string | null; // solo al crear una de contrata
  forma: FormaCobro | null;
  regla: ReglaPago | null;
  dias: number | null;
  diaCorte: number | null;
  diaRemesa: number | null;
  correo: string;
  alComercial: boolean;
  comoSeEnvia: string;
  faltanDatos: boolean;
  notas: string;
  emisor: Emisor | undefined; // undefined = no se toca (generales)
  codigos: string[] | undefined;
};

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lo que falta para guardarla; null si esta bien. Sin forma o sin cuando paga, se guarda como pendiente. */
export function comprobarCondicion(g: GuardarCondicion): string | null {
  if (g.regla === "dias" && (g.dias == null || g.dias < 0 || g.dias > 365)) return "Faltan los días (de 0 a 365).";
  if (g.regla === "corte_remesa" && (!g.diaCorte || !g.diaRemesa || g.diaCorte > 31 || g.diaRemesa > 31)) return "Faltan el día de corte y el de la remesa (del 1 al 31).";
  const malos = g.correo.split(/[,;\s]+/).filter(Boolean).filter((x) => !CORREO.test(x));
  if (malos.length) return `Esto no es un correo: ${malos.join(", ")}.`;
  return null;
}

export async function guardarCondicion(g: GuardarCondicion, yo: Yo): Promise<void> {
  const mal = comprobarCondicion(g);
  if (mal) throw new Error(mal);
  const completa = !!(g.forma && g.regla);
  const fila = {
    forma_cobro: g.forma, regla_pago: g.regla,
    dias: g.regla === "dias" ? g.dias : null,
    dia_corte: g.regla === "corte_remesa" ? g.diaCorte : null,
    dia_remesa: g.regla === "corte_remesa" ? g.diaRemesa : null,
    correo_facturas: g.correo.trim() || null, tambien_al_comercial: g.alComercial, como_se_envia: g.comoSeEnvia.trim() || null,
    // Sin forma o sin cuando paga no puede estar completa; con todo, la decide quien la rellena.
    pendiente: !completa || g.faltanDatos,
    notas: g.notas.trim() || null, actualizado_por: yo.id, actualizado_en: new Date().toISOString(),
  };
  let contrataId: string | null = g.contrataId;
  if (g.id) {
    const [c] = await pedir<{ contrata_id: string | null }[]>(`condiciones_cobro?select=contrata_id&id=eq.${g.id}`);
    if (!c) throw new Error("Esa condición ya no existe.");
    contrataId = c.contrata_id;
    await pedir(`condiciones_cobro?id=eq.${g.id}`, { method: "PATCH", body: JSON.stringify(fila) });
  } else {
    if (!contrataId) throw new Error("Elige la contrata.");
    await pedir("condiciones_cobro", { method: "POST", body: JSON.stringify({ ...fila, pagador_tipo: "contrata", contrata_id: contrataId }) });
  }
  // Lo que es de la contrata, en la contrata.
  if (contrataId && (g.emisor !== undefined || g.codigos !== undefined)) {
    const cambio: Record<string, unknown> = {};
    if (g.emisor !== undefined) cambio.emisor_factura = g.emisor;
    if (g.codigos !== undefined) cambio.codigos_exigidos = g.codigos.length ? g.codigos : null;
    await pedir(`contratas?id=eq.${contrataId}`, { method: "PATCH", body: JSON.stringify(cambio) });
  }
}

export async function cambiarActivaCondicion(id: string, activa: boolean, yo: Yo): Promise<void> {
  const [c] = await pedir<{ pagador_tipo: string }[]>(`condiciones_cobro?select=pagador_tipo&id=eq.${id}`);
  if (!c) throw new Error("Esa condición ya no existe.");
  if (c.pagador_tipo !== "contrata") throw new Error("Las generales (comunidad y particular) no se desactivan: se cambian.");
  await pedir(`condiciones_cobro?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ activa, actualizado_por: yo.id, actualizado_en: new Date().toISOString() }) });
}
