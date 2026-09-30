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

// ============================================================================
// LEER LO APUNTADO. Para la pantalla de control de /relojes.
// ============================================================================

export type Reloj = { tarea: string; nombre: string; cada: string; ruta: string };

// LOS RELOJES SE DECLARAN AQUI, no se deducen de lo apuntado. La diferencia
// importa: un reloj que NUNCA ha corrido no tiene ni una linea en la tabla, y si
// la pantalla se hiciera solo con lo apuntado, ese reloj -el unico que de verdad
// esta roto- seria el unico que no saldria. Es exactamente lo que paso el
// 29-sep: tres relojes muertos y ninguna señal.
export const RELOJES: Reloj[] = [
  { tarea: "buzon_polycam", nombre: "Buzón del Polycam", cada: "cada 10 minutos", ruta: "/api/buzon/polycam" },
  { tarea: "iee_barrido", nombre: "Barrido de IEE", cada: "todos los días a las 7:15", ruta: "/api/iee/barrido" },
  { tarea: "comunidades_catastro", nombre: "Rellenar Catastro", cada: "cada 5 minutos · temporal", ruta: "/api/comunidades/catastro" },
];

export type Pasada = {
  id: number;
  tarea: string;
  empezada_en: string;
  ms: number | null;
  ok: boolean | null;
  dice: string | null;
  quien: string;
};

export async function ultimasPasadas(cuantas = 60): Promise<Pasada[]> {
  if (!URL_BASE || !SECRETO) return [];
  const r = await fetch(
    `${URL_BASE}/rest/v1/pasada_reloj` +
      `?select=id,tarea,empezada_en,ms,ok,dice,quien&order=empezada_en.desc&limit=${cuantas}`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) return [];
  return (await r.json()) as Pasada[];
}

/** La ultima de cada reloj, para la foto de arriba. Se pide una a una y no de
 *  golpe: con un solo `limit` alto, un reloj que corre cada 5 minutos tapa al
 *  que corre una vez al dia y ese se queda sin ultima pasada. */
export async function ultimaDeCadaReloj(): Promise<Record<string, Pasada | undefined>> {
  const salida: Record<string, Pasada | undefined> = {};
  if (!URL_BASE || !SECRETO) return salida;
  await Promise.all(
    RELOJES.map(async ({ tarea }) => {
      const r = await fetch(
        `${URL_BASE}/rest/v1/pasada_reloj` +
          `?select=id,tarea,empezada_en,ms,ok,dice,quien&tarea=eq.${tarea}` +
          `&order=empezada_en.desc&limit=1`,
        { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
      );
      if (!r.ok) return;
      const [p] = (await r.json()) as Pasada[];
      salida[tarea] = p;
    }),
  );
  return salida;
}
