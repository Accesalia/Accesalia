import { NextResponse } from "next/server";
import { barrido } from "../../../../lib/estadoOportunidad";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";

// EL BARRIDO NOCTURNO DEL ESTADO DE LAS OPPS (Monica, 15-oct-2026).
//
// La tabla estado_oportunidad la pone al dia la app tras cada accion y al abrir
// una ficha. Esto es la red de seguridad: recalcula TODAS y dice cuantas estaban
// mal. Si alguna lo estaba, una accion se olvido de avisar (o se cambio algo por
// fuera de la app): hay que buscar cual.
//
// La llama el reloj de Vercel de madrugada, y se puede pedir a mano (quien
// trabaja en el area comercial) tras una carga por script.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TAREA = "estado_barrido";

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
    const r = await barrido(esElReloj(req) ? "barrido" : "carga");
    const dice = `${r.total} opps · ${r.cambiadas} corregidas` + (r.cambiadas ? " (alguna accion no avisa: revisar)" : "");
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
