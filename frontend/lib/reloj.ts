// QUIEN LLAMA ES EL RELOJ DE VERCEL?
//
// El reloj no tiene navegador: llega sin cookie de sesion. Con el login
// obligatorio encendido, el middleware lo mandaba a /entrar con un 307 y la
// ruta no se ejecutaba NUNCA. No daba error: simplemente no entraba nadie.
// Se descubrio el 30-sep-2026 leyendo los logs: tres pasadas de polycam
// puntuales, las tres con `source: edge-middleware` y `307`.
//
// Asi que el reloj tiene que poder identificarse, y de dos maneras:
//
// 1. CRON_SECRET (la buena). Si esa variable existe en Vercel, Vercel manda en
//    cada pasada la cabecera `Authorization: Bearer <ese secreto>`. Nadie de
//    fuera lo sabe, asi que es imposible de falsificar.
// 2. La cabecera `x-vercel-cron`, que la plataforma pone y borra de las
//    peticiones de fuera. Solo se acepta MIENTRAS no haya secreto, para que
//    los relojes no se queden muertos esperando a que se configure. En cuanto
//    hay secreto, este camino se cierra.

export function esElReloj(req: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (secreto) return req.headers.get("authorization") === `Bearer ${secreto}`;
  return !!req.headers.get("x-vercel-cron");
}

// Para poder CONTARLO en una pantalla sin destripar el secreto.
export function comoSeIdentificaElReloj(): "secreto" | "cabecera" {
  return process.env.CRON_SECRET ? "secreto" : "cabecera";
}

// DEJAR CONSTANCIA DE LA PASADA.
//
// Una tabla que nadie rellena es peor que no tenerla, asi que esto lo llaman las
// tres rutas de reloj. Y nunca tumba el trabajo: si apuntar la pasada falla, el
// trabajo ya esta hecho y lo que se pierde es la anotacion, no la faena.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export async function apuntarPasada(p: {
  tarea: string;
  empezada: number;
  ok: boolean;
  dice?: string | null;
  detalle?: unknown;
  quien: "reloj" | "persona";
}): Promise<void> {
  if (!URL_BASE || !SECRETO) return;
  try {
    await fetch(`${URL_BASE}/rest/v1/pasada_reloj`, {
      method: "POST",
      headers: {
        apikey: SECRETO,
        Authorization: `Bearer ${SECRETO}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        tarea: p.tarea,
        empezada_en: new Date(p.empezada).toISOString(),
        acabada_en: new Date().toISOString(),
        ms: Date.now() - p.empezada,
        ok: p.ok,
        dice: p.dice ?? null,
        detalle: p.detalle ?? null,
        quien: p.quien,
      }),
      cache: "no-store",
    });
  } catch {
    // A proposito en silencio: ver arriba.
  }
}
