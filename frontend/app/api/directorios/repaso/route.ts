import { NextResponse } from "next/server";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";

// EL REPASO NOCTURNO DE LOS DIRECTORIOS (Monica, 16-oct-2026).
//
// Los directorios de personas y de sitios (directorio_personas,
// directorio_sitios) se ponen al dia solos, con las
// reglas de la base, cada vez que cambia algo de lo que los compone. Esto es la
// red de seguridad: los recalcula ENTEROS y dice cuantas filas estaban mal. Si
// alguna lo estaba, un cambio se escapo a las reglas: hay que buscar cual.
//
// La llama el reloj de Vercel de madrugada, y se puede pedir a mano (direccion)
// tras una carga por script.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TAREA = "directorios_repaso";
const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function permitido(req: Request): Promise<boolean> {
  if (esElReloj(req)) return true;
  const yo = await quienSoy();
  return !!yo && puedeEntrar(yo, "direccion", "trabajar");
}

export async function GET(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });
  const empezada = Date.now();
  const quien = esElReloj(req) ? "reloj" : "persona";
  try {
    const repasar = async (funcion: string) => {
      const r = await fetch(`${URL_BASE}/rest/v1/rpc/${funcion}`, {
        method: "POST",
        headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`${funcion} ${r.status}: ${await r.text()}`);
      return (await r.json()) as { filas: number; corregidas: number };
    };
    const personas = await repasar("directorio_personas_repaso");
    const sitios = await repasar("directorio_sitios_repaso");
    const dice =
      `personas: ${personas.filas} filas · ${personas.corregidas} corregidas; sitios: ${sitios.filas} filas · ${sitios.corregidas} corregidas` +
      (personas.corregidas || sitios.corregidas ? " (algun cambio no avisa: revisar)" : "");
    await apuntarPasada({ tarea: TAREA, empezada, ok: true, dice, detalle: { personas, sitios }, quien });
    return NextResponse.json({ ok: true, personas, sitios });
  } catch (e) {
    const dice = e instanceof Error ? e.message : String(e);
    await apuntarPasada({ tarea: TAREA, empezada, ok: false, dice, quien });
    return NextResponse.json({ ok: false, dice }, { status: 200 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
