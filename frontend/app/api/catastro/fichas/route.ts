import { NextResponse } from "next/server";
import { barridoDeFichas, comoVa } from "../../../../lib/fichaCatastro";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";

// BAJAR LA FICHA DE CATASTRO DE CADA ACCESO, A TANDAS.
//
// Son 1.244 accesos. Cada uno pide su parcela a Catastro y de ahi salen dos cosas:
// la ficha completa (parcela, portales e inmuebles, que es lo que necesita la
// pantalla del bloque 1) y el NOMBRE del acceso: calle, numero y escalera.
//
// Lo hecho no se repite: el marcador es accesos_comunidad.ficha_id.
// Y si varios accesos comparten parcela, la ficha se baja UNA vez por tanda.
//
// GET            -> solo mira como va. No escribe.
// GET ?hacer=1   -> hace una tanda ahora y contesta que ha hecho.
// POST           -> una tanda.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TAREA = "fichas_catastro";

async function permitido(req: Request): Promise<boolean> {
  if (esElReloj(req)) return true;
  const yo = await quienSoy();
  return !!yo && puedeEntrar(yo, "comercial", "supervisar");
}

export async function GET(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });

  if (esElReloj(req) || new URL(req.url).searchParams.get("hacer")) return POST(req);

  return NextResponse.json({
    ok: true,
    ...(await comoVa()),
    nota: "Para bajar una tanda ahora: añade ?hacer=1 a esta misma dirección.",
  });
}

export async function POST(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });

  // Treinta por tanda: cada acceso son dos consultas a Catastro con pausa, y hay
  // 300 segundos de margen, no mas.
  const pedido = Number(new URL(req.url).searchParams.get("cuantos"));
  const cuantos = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 80) : 30;

  const empezada = Date.now();
  const quien = esElReloj(req) ? "reloj" : "persona";
  try {
    const hecho = await barridoDeFichas(cuantos);
    await apuntarPasada({
      tarea: TAREA,
      empezada,
      ok: true,
      detalle: { hechos: hecho.hechos.length, fallos: hecho.fallos, quedan: hecho.quedan },
      quien,
    });
    return NextResponse.json({ ok: true, ...hecho });
  } catch (e) {
    const dice = e instanceof Error ? e.message : String(e);
    await apuntarPasada({ tarea: TAREA, empezada, ok: false, dice, quien });
    return NextResponse.json({ ok: false, dice }, { status: 500 });
  }
}
