import { NextResponse } from "next/server";
import { vigilarBdns } from "../../../../lib/bdns";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";

// LA VIGILANCIA DE LA BDNS (Monica, 6-oct-2026): "que no quede obsoleto en 4
// semanas". El reloj de Vercel la lanza el dia 1 y el 16 de cada mes: busca
// convocatorias nuevas de lo nuestro y baja las concesiones nuevas de todas las
// vigiladas. Tambien se puede pedir a mano desde /relojes.
//
// Nunca la puede llamar un desconocido: o es el reloj de Vercel o alguien de
// casa que trabaja el area comercial.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TAREA = "bdns_vigilar";

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
    const p = await vigilarBdns();
    const dice =
      `${p.convocatoriasNuevas.length} convocatorias nuevas · ${p.concesionesNuevas} concesiones nuevas` +
      ` (${p.conCambios} de ${p.repasadas} vigiladas con cambios)` +
      (p.fallos.length ? ` · ${p.fallos.length} fallos` : "");
    await apuntarPasada({ tarea: TAREA, empezada, ok: p.fallos.length === 0, dice, detalle: p, quien });
    return NextResponse.json({ ok: true, ...p });
  } catch (e) {
    const dice = e instanceof Error ? e.message : String(e);
    await apuntarPasada({ tarea: TAREA, empezada, ok: false, dice, quien });
    return NextResponse.json({ ok: false, dice }, { status: 200 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
