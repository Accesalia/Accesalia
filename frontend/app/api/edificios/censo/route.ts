import { NextResponse } from "next/server";
import { bajarCensoSubvenciones } from "../../../../lib/informeEdificio";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";

// EL CENSO DE SUBVENCIONES CONCEDIDAS DE MADRID, ENTERO, UNA VEZ AL MES (Monica,
// 15-oct-2026). Es una sola peticion al geoportal; restringirlo a lo nuevo
// perderia las correcciones que el Ayuntamiento haga en las viejas.
//
// La llama el reloj de Vercel de madrugada, y se puede pedir a mano (quien
// trabaja en el area comercial).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TAREA = "censo_subvenciones";

async function permitido(req: Request): Promise<boolean> {
  if (esElReloj(req)) return true;
  const yo = await quienSoy();
  return !!yo && puedeEntrar(yo, "comercial", "trabajar");
}

export async function GET(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });
  const empezada = Date.now();
  const quien = esElReloj(req) ? "reloj" : "persona";
  try {
    const r = await bajarCensoSubvenciones();
    const dice = `${r.total} subvenciones · ${r.nuevas} nuevas`;
    await apuntarPasada({ tarea: TAREA, empezada, ok: true, dice, detalle: r, quien });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const dice = e instanceof Error ? e.message : String(e);
    await apuntarPasada({ tarea: TAREA, empezada, ok: false, dice, quien });
    return NextResponse.json({ ok: false, dice }, { status: 200 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
