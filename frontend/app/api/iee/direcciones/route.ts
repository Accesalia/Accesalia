import { NextResponse } from "next/server";
import { barrerNuestrasDirecciones } from "../../../../lib/ieePorDireccion";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";

// PREGUNTARLE AL REGISTRO DE IEE POR NUESTRAS DIRECCIONES.
//
// La otra puerta del mismo registro: el barrido diario va por numero y solo
// hacia delante; esto va por direccion y mira LAS NUESTRAS, las 2.037 que salen
// de los accesos. Encargo de Monica el 1-oct-2026.
//
// VA POR TANDAS, en orden alfabetico de municipio, y se para sola antes de que
// Vercel la corte. `?desde=MADRID` sigue donde lo dejo la anterior, y el
// resultado dice `incompleto` cuando queda trabajo.
//
// ES DE UNA VEZ, NO UN RELOJ DIARIO: las IEE de nuestras direcciones no cambian
// todos los dias, y machacar un registro publico pequeño por gusto es la manera
// de que nos corten. Cuando acabe, se vuelve a lanzar a mano de vez en cuando.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TAREA = "iee_direcciones";

/** Donde se quedo la ultima tanda. Se lee de `pasada_reloj`, que ya guarda el
 *  resultado entero en `detalle`: no hace falta ninguna tabla de estado nueva. */
async function ultimaTanda(): Promise<{ incompleto: boolean; siguiente: string | null } | null> {
  const base = process.env.SUPABASE_URL ?? "";
  const secreto = process.env.SUPABASE_SECRET_KEY ?? "";
  const r = await fetch(
    `${base}/rest/v1/pasada_reloj?select=detalle&tarea=eq.${TAREA}&order=empezada_en.desc&limit=1`,
    { headers: { apikey: secreto, Authorization: `Bearer ${secreto}` }, cache: "no-store" },
  );
  if (!r.ok) return null;
  const filas = (await r.json()) as { detalle: { incompleto?: boolean; siguiente?: string } | null }[];
  const d = filas[0]?.detalle;
  if (!d) return null;
  return { incompleto: !!d.incompleto, siguiente: d.siguiente ?? null };
}

async function permitido(req: Request): Promise<boolean> {
  if (esElReloj(req)) return true;
  const yo = await quienSoy();
  return !!yo && puedeEntrar(yo, "comercial", "trabajar");
}

export async function GET(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });

  const q = new URL(req.url).searchParams;
  // Por donde seguir. Si no se dice, se mira donde se quedo la tanda anterior:
  // asi el reloj lo va terminando solo y nadie tiene que acordarse de nada.
  // Y cuando la ultima tanda acabo entera, NO se vuelve a empezar: machacar un
  // registro publico pequeño todos los dias es la manera de que nos corten.
  // Para rehacerlo de cero, ?desde= con el primer municipio, o ?reiniciar=1.
  let desdeMunicipio = (q.get("desde") ?? "").toUpperCase();
  if (!desdeMunicipio && q.get("reiniciar") !== "1") {
    const ultima = await ultimaTanda();
    if (ultima && !ultima.incompleto) {
      return NextResponse.json({ ok: true, nadaQueHacer: "la ultima tanda acabo entera" });
    }
    desdeMunicipio = ultima?.siguiente ?? "";
  }
  // Se deja margen contra el maxDuration de 300: hay que poder guardar la pasada.
  const pedido = Number(q.get("segundos"));
  const segundosMaximos = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 250) : 240;

  const empezada = Date.now();
  const quien = esElReloj(req) ? "reloj" : "persona";
  try {
    const hecho = await barrerNuestrasDirecciones({ desdeMunicipio, segundosMaximos });
    const dice =
      `${hecho.guardadas} guardadas de ${hecho.callesQueEncajan} calles con IEE` +
      ` · ${hecho.municipiosMirados} municipios` +
      (hecho.incompleto ? " · INCOMPLETO, hay que seguir" : "") +
      (hecho.errores.length ? ` · ${hecho.errores.length} errores` : "");
    await apuntarPasada({ tarea: TAREA, empezada, ok: !hecho.errores.length, dice, detalle: hecho, quien });
    return NextResponse.json({ ok: true, ...hecho });
  } catch (e) {
    const dice = e instanceof Error ? e.message : String(e);
    await apuntarPasada({ tarea: TAREA, empezada, ok: false, dice, quien });
    return NextResponse.json({ ok: false, dice }, { status: 200 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
