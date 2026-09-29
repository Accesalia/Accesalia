import { NextResponse } from "next/server";
import { barrer } from "../../../../lib/registroIEE";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// EL BARRIDO DEL REGISTRO DE IEE.
//
// Lo llama el reloj de Vercel una vez al dia, y tambien se puede pedir a mano
// cuando hay ganas de ver si ha entrado algo.
//
// Va SOLO HACIA DELANTE, desde el ultimo numero de registro conocido. Son unas
// 6 nuevas a la semana en toda la Comunidad, asi que una pasada diaria encuentra
// una o ninguna y dura segundos.
//
// Nunca la puede llamar un desconocido: o viene del reloj de Vercel -que se
// identifica con una cabecera que la plataforma no deja falsificar desde fuera-
// o la pide alguien de casa que llega al area comercial.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function permitido(req: Request): Promise<boolean> {
  if (req.headers.get("x-vercel-cron")) return true;
  const yo = await quienSoy();
  return !!yo && puedeEntrar(yo, "comercial", "trabajar");
}

export async function GET(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });

  // `maximo` deja pedir una pasada mas larga a mano sin tocar el codigo, por si
  // un dia el registro publica una tanda grande de golpe.
  const pedido = Number(new URL(req.url).searchParams.get("maximo"));
  const maximo = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 400) : 60;

  try {
    return NextResponse.json({ ok: true, ...(await barrer({ maximo })) });
  } catch (e) {
    return NextResponse.json({ ok: false, dice: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
