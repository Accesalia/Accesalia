import { NextResponse } from "next/server";
import { barrer } from "../../../../lib/registroIEE";
import { vigilarAlertasIEE } from "../../../../lib/alertasIEE";
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
  const q = new URL(req.url).searchParams;
  const pedido = Number(q.get("maximo"));
  const maximo = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 400) : 60;

  // ?atras=12 recoge los 12 informes ANTERIORES a la marca. Es una excepcion a
  // mano -la regla es mirar solo hacia delante- y esta para poder ver la
  // pantalla con datos de verdad. No mueve la marca ni avisa a nadie.
  const haciaAtras = Number(q.get("atras"));
  const atras = Number.isFinite(haciaAtras) && haciaAtras > 0 ? Math.min(haciaAtras, 200) : 0;

  try {
    const barrido = await barrer({ maximo, atras });
    // Y de paso la vigilancia: engancha las que ya tienen oportunidad y
    // pregunta por las que llevan demasiado tiempo paradas. Va aqui y no en su
    // propio reloj porque es el mismo momento del dia y el mismo asunto.
    const vigilancia = await vigilarAlertasIEE();
    return NextResponse.json({ ok: true, ...barrido, vigilancia });
  } catch (e) {
    return NextResponse.json({ ok: false, dice: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
