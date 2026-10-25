import { NextResponse } from "next/server";
import { quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";
import { puedeVerClientesFactusol, revisarClientes } from "../../../../lib/factusolClientes";

// RELEER LOS CLIENTES DE FACTUSOL (Monica, 25-oct-2026). La llama el reloj de Vercel cada noche y el boton «Revisar
// ahora» de Cobrar > Ajustes > Clientes de Factusol. Baja del Dropbox el fichero de cada empresa y pone al dia la copia.

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
    const r = await revisarClientes();
    const dice = r.map((x) => `${x.empresa}: ${x.leidos} (${x.nuevos} nuevos, ${x.quitados} quitados)`).join(" · ");
    await apuntarPasada({ tarea: TAREA, empezada, ok: true, dice, detalle: r, quien });
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
