import { NextResponse } from "next/server";
import { completarTanda, cuantasQuedan } from "../../../../lib/completarCatastro";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";

// COMPLETAR LAS COMUNIDADES CONTRA CATASTRO, A TANDAS.
//
// Son 1.228 direcciones y hay que ir despacio con Catastro, asi que no cabe en
// una sola pasada: cada llamada hace una tanda y dice cuantas quedan. Lo hecho
// no se repite, porque `cotejo_catastro` lleva la cuenta.
//
// CORRE AQUI Y NO EN UN PORTATIL, y eso es lo importante: aqui las credenciales
// son las de produccion, puestas en Vercel. La primera version de esto corria en
// local, leyo un `.env.local` que apuntaba a 127.0.0.1 y escribio en una base
// con datos de julio creyendo que era produccion.
//
// GET  -> solo mira y dice cuantas quedan. No escribe.
// POST -> hace una tanda.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TAREA = "comunidades_catastro";

async function permitido(req: Request): Promise<boolean> {
  if (esElReloj(req)) return true;
  const yo = await quienSoy();
  // Esto reescribe la lista curada a mano de Monica: no lo lanza cualquiera.
  return !!yo && puedeEntrar(yo, "comercial", "supervisar");
}

export async function GET(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });
  // El reloj llama por GET, y para el reloj SI tiene que trabajar.
  if (esElReloj(req)) return POST(req);
  // Y con ?hacer=1 tambien trabaja desde el navegador. Hace falta poder lanzarla
  // a mano Y VER QUE CONTESTA: esperar al reloj a ciegas no dice si va o no va.
  if (new URL(req.url).searchParams.get("hacer")) return POST(req);
  return NextResponse.json({
    ok: true,
    quedan: await cuantasQuedan(),
    nota: "Para hacer una tanda ahora: añade ?hacer=1 a esta misma dirección.",
  });
}

export async function POST(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });

  const pedido = Number(new URL(req.url).searchParams.get("cuantas"));
  const cuantas = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 120) : 40;

  const empezada = Date.now();
  const quien = esElReloj(req) ? "reloj" : "persona";
  try {
    const hecho = await completarTanda(cuantas);
    await apuntarPasada({ tarea: TAREA, empezada, ok: true, detalle: hecho, quien });
    return NextResponse.json({ ok: true, ...hecho });
  } catch (e) {
    const dice = e instanceof Error ? e.message : String(e);
    await apuntarPasada({ tarea: TAREA, empezada, ok: false, dice, quien });
    return NextResponse.json({ ok: false, dice }, { status: 200 });
  }
}
