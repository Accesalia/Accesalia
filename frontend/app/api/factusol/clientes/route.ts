import { NextResponse } from "next/server";
import { quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";
import { puedeVerClientesFactusol, revisarFactusol } from "../../../../lib/factusolClientes";

// RELEER LOS CLIENTES DE FACTUSOL (Monica, 25-oct-2026). La llama el reloj de Vercel cada noche y el boton «Revisar
// ahora» de Cobrar > Ajustes > Clientes de Factusol. Baja del Dropbox el fichero de cada empresa y pone al dia la copia.
// Desde el 25-oct-2026 tambien los pedidos y las facturas (y abonos) de este año y del anterior.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TAREA = "factusol_clientes";

async function permitido(req: Request): Promise<boolean> {
  if (esElReloj(req)) return true;
  const yo = await quienSoy();
  return !!yo && puedeVerClientesFactusol(yo);
}

export async function GET(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });
  const empezada = Date.now();
  const quien = esElReloj(req) ? "reloj" : "persona";
  try {
    const t = await revisarFactusol();
    const r = t.clientes;
    const dice = [
      ...r.map((x) => `${x.empresa}: ${x.leidos} clientes (${x.nuevos} nuevos, ${x.quitados} quitados)`),
      ...t.documentos.map((d) => `${d.empresa} ${d.anio}: ${d.pedidos} pedidos, ${d.facturas} facturas, ${d.abonos} abonos`),
    ].join(" · ");
    await apuntarPasada({ tarea: TAREA, empezada, ok: true, dice, detalle: t, quien });
    return NextResponse.json({ ok: true, resumen: r });
  } catch (e) {
    const dice = e instanceof Error ? e.message : String(e);
    await apuntarPasada({ tarea: TAREA, empezada, ok: false, dice, quien });
    return NextResponse.json({ ok: false, dice }, { status: 200 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
