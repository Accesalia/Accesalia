import "server-only";
// lib/factusolCotejo.ts
//
// PEDIDOS Y FACTURAS DE FACTUSOL, COTEJADOS CON LA APP (Monica, 25-oct-2026: «comprobar que de verdad lo he bajado
// todo, o al menos que las apunte con su numero en la tabla, con su referencia y su importe»). Lee las copias que hace
// la pasada de cada noche (factusol_pedidos, factusol_facturas) y las compara con las proformas y las facturas de la app.
// Factusol manda: aqui solo se ve lo que no casa.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
async function leer<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Range: `${d}-${d + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const x = (await r.json()) as T[];
    out.push(...x);
    if (x.length < 1000) return out;
  }
}

type DocF = { empresa: string; anio: number; serie: number; numero: number; fecha: string | null; referencia: string | null; nombre: string | null; total: number; estado: number | null; leido_en: string };
type FacF = DocF & { tipo: "factura" | "abono" };

export type Diferencia = { empresa: string; anio: number; doc: string; fecha: string | null; referencia: string | null; cliente: string | null; total: number; dice: string; enlace?: string };
export type Cotejo = {
  leido: string | null;
  cuentas: { pedidos: number; facturas: number; abonos: number };
  facturasQueFaltan: Diferencia[];
  facturasQueNoCasan: Diferencia[];
  pedidosSinProforma: Diferencia[];
  choques: Diferencia[];
};

export async function cotejoFactusol(): Promise<Cotejo> {
  const [pedidos, facturas, proformas, facApp] = await Promise.all([
    leer<DocF>("factusol_pedidos?select=empresa,anio,serie,numero,fecha,referencia,nombre,total,estado,leido_en"),
    leer<FacF>("factusol_facturas?select=empresa,anio,tipo,serie,numero,fecha,referencia,nombre,total,estado,leido_en"),
    leer<{ id: string; empresa: string; anio: number; numero: number; total: number; estado: string; codigo: string }>("proformas?select=id,empresa,anio,numero,total,estado,codigo"),
    leer<{ id: string; empresa_emisora: string; anio: number; tipo: string | null; serie: string | null; numero: number; total: number; estado: string | null }>(
      "facturas?select=id,empresa_emisora,anio,tipo,serie,numero,total,estado",
    ),
  ]);
  const leido = [...pedidos, ...facturas].map((x) => x.leido_en).sort().at(-1) ?? null;
  const app = new Map(facApp.map((f) => [`${f.empresa_emisora}|${f.anio}|${f.tipo ?? "factura"}|${f.serie ?? ""}|${f.numero}`, f]));
  const dif = (x: DocF, doc: string, dice: string, enlace?: string): Diferencia => ({
    empresa: x.empresa, anio: x.anio, doc, fecha: x.fecha, referencia: x.referencia, cliente: x.nombre, total: Number(x.total), dice, enlace,
  });
  const faltan: Diferencia[] = [], noCasan: Diferencia[] = [];
  for (const f of facturas) {
    const doc = `${f.tipo === "abono" ? "Abono" : "Factura"} ${f.anio}/${f.serie}-${f.numero}`;
    const a = app.get(`${f.empresa}|${f.anio}|${f.tipo}|${f.serie}|${f.numero}`);
    if (!a) { faltan.push(dif(f, doc, "Está en Factusol y no en la app.")); continue; }
    if (Math.abs(Number(a.total) - Number(f.total)) > 0.01) noCasan.push(dif(f, doc, `En la app pone ${EUR(Number(a.total))}.`, `/facturacion/factura/${a.id}`));
    else if (f.estado === 4 && a.estado !== "anulada") noCasan.push(dif(f, doc, "Anulada en Factusol, y en la app no.", `/facturacion/factura/${a.id}`));
  }
  const prof = new Map(proformas.map((p) => [`${p.empresa}|${p.anio}|${p.numero}`, p]));
  const sinProf: Diferencia[] = [], choques: Diferencia[] = [];
  for (const p of pedidos.filter((x) => x.serie === 1)) {
    const doc = `Pedido ${p.anio}/${p.serie}-${p.numero}`;
    const a = prof.get(`${p.empresa}|${p.anio}|${p.numero}`);
    if (!a) sinProf.push(dif(p, doc, "Hecho directamente en Factusol: no tiene proforma en la app."));
    else if (Math.abs(Number(a.total) - Number(p.total)) > 0.01)
      choques.push(dif(p, doc, `El mismo número que la proforma ${a.codigo} de la app, que es otra (${EUR(Number(a.total))}).`, `/facturacion/proforma/${a.id}`));
  }
  const orden = (a: Diferencia, b: Diferencia) => (b.fecha ?? "").localeCompare(a.fecha ?? "");
  return {
    leido,
    cuentas: { pedidos: pedidos.length, facturas: facturas.filter((f) => f.tipo === "factura").length, abonos: facturas.filter((f) => f.tipo === "abono").length },
    facturasQueFaltan: faltan.sort(orden), facturasQueNoCasan: noCasan.sort(orden), pedidosSinProforma: sinProf.sort(orden), choques: choques.sort(orden),
  };
}
const EUR = (n: number) => `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
