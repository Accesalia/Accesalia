import { NextResponse } from "next/server";
import { goteoEdificios } from "../../../../lib/informeEdificio";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";

// EL GOTEO DE EDIFICIOS (Monica, 15-oct-2026): cada noche se refrescan en
// Catastro y en el geoportal los 20 edificios que llevan mas tiempo sin
// consultarse, y quedan escritos en las tablas. Asi todos se renuevan cada
// pocos meses sin agobiar a los servicios publicos.
//
// La llama el reloj de Vercel de madrugada, y se puede pedir a mano (quien
// trabaja en el area comercial).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TAREA = "goteo_edificios";

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
    const r = await goteoEdificios();
    const dice = `${r.hechos} edificios · ${r.bien} al dia` + (r.mal.length ? ` · ${r.mal.length} con fallos` : "");
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
