import { NextResponse } from "next/server";
import { repasarBuzon } from "../../../../lib/buzonPolycam";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { esElReloj } from "../../../../lib/reloj";

// REPASAR EL BUZON DEL POLYCAM.
//
// La llama el reloj de Vercel cada cierto rato, y tambien se puede llamar a mano
// desde el cuadro de mando cuando hay prisa por que entre un escaneo.
//
// Nunca la puede llamar un desconocido: o viene del reloj de Vercel -que se
// identifica- o la pide alguien de casa que llega al area comercial.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function permitido(req: Request): Promise<boolean> {
  // Como se identifica el reloj, y por que no basta con una cabecera: lib/reloj.ts.
  if (esElReloj(req)) return true;
  const yo = await quienSoy();
  return !!yo && puedeEntrar(yo, "comercial", "trabajar");
}

export async function GET(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });
  try {
    return NextResponse.json({ ok: true, ...(await repasarBuzon()) });
  } catch (e) {
    return NextResponse.json({ ok: false, dice: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
