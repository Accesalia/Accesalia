import { NextResponse } from "next/server";
import { porReferencia } from "../../../../lib/catastro";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// RELLENAR CON CATASTRO lo que ya se puede (Monica dio el OK, 29-sep-2026).
//
// 518 comunidades tienen ya referencia catastral, y `anio_construccion` y
// `num_viviendas` estan VACIAS en las 1.228. Una llamada por comunidad y se
// llenan solas con datos que hoy no existen en ningun sitio.
//
// TRES REGLAS, porque esto escribe en produccion:
//
//  1. SOLO RELLENA HUECOS. Nunca pisa un dato que ya este puesto, y NO TOCA
//     `nombre` ni `direccion`: esa lista de direcciones son 26 dias de trabajo
//     suyo hecho a mano y no se toca por nada del mundo.
//  2. La direccion oficial de Catastro NO sobrescribe la suya. Son dos y las dos
//     son verdad: la suya es como se dice, la de Catastro es la que hace falta
//     para visado y subvenciones. Aqui solo se INFORMA de las que no cuadran,
//     para que las mire una persona.
//  3. Va por tandas y despacio: es un servicio publico y gratuito, no se le
//     lanzan quinientas peticiones de golpe.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

const aplanar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

export async function GET(req: Request) {
  const yo = await quienSoy();
  if (!yo || !(yo.veTodo || puedeEntrar(yo, "administracion", "trabajar")))
    return NextResponse.json({ error: "Esto solo lo puede lanzar dirección." }, { status: 403 });

  const cuantas = Math.min(Number(new URL(req.url).searchParams.get("n") ?? 40), 60);

  const r = await fetch(
    `${URL_BASE}/rest/v1/comunidades?select=id,nombre,referencia_catastral,cp,municipio` +
      `&referencia_catastral=not.is.null&anio_construccion=is.null&order=nombre.asc&limit=${cuantas}`,
    { headers: cab, cache: "no-store" },
  );
  if (!r.ok) return NextResponse.json({ ok: false, dice: await r.text() }, { status: 200 });
  const filas = (await r.json()) as { id: string; nombre: string; referencia_catastral: string; cp: string | null; municipio: string | null }[];

  const hecho: string[] = [];
  const sinFicha: { nombre: string; rc: string }[] = [];
  const noCuadra: { nombre: string; catastro: string }[] = [];
  const fallos: string[] = [];

  for (const c of filas) {
    try {
      const f = await porReferencia(c.referencia_catastral);
      if (!f || (f.anio === null && f.viviendas === 0)) {
        sinFicha.push({ nombre: c.nombre, rc: c.referencia_catastral });
        continue;
      }

      // Solo huecos. El cp solo si estaba vacio.
      const cambio: Record<string, unknown> = { anio_construccion: f.anio, num_viviendas: f.viviendas };
      if (!c.cp && f.cp) cambio.cp = f.cp;

      const p = await fetch(`${URL_BASE}/rest/v1/comunidades?id=eq.${c.id}`, {
        method: "PATCH",
        headers: { ...cab, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(cambio),
      });
      if (!p.ok) {
        fallos.push(`${c.nombre}: ${await p.text()}`);
        continue;
      }
      hecho.push(`${c.nombre} · ${f.anio} · ${f.viviendas} viviendas`);

      // El canario: si la direccion oficial no se parece a la suya, que lo mire
      // una persona. No se corrige nada aqui.
      const suya = aplanar(c.nombre);
      const oficial = aplanar(f.direccion);
      if (oficial && !suya.includes(oficial) && !oficial.includes(suya.replace(/ (MADRID|LEGANES|GETAFE|FUENLABRADA|MOSTOLES|ALCORCON|PARLA|PINTO)$/, "")))
        noCuadra.push({ nombre: c.nombre, catastro: `${f.direccion}${f.municipio ? ", " + f.municipio : ""}` });
    } catch (e) {
      fallos.push(`${c.nombre}: ${e instanceof Error ? e.message : String(e)}`);
    }
    // Despacio: es un servicio publico.
    await new Promise((x) => setTimeout(x, 220));
  }

  const q = await fetch(
    `${URL_BASE}/rest/v1/comunidades?select=id&referencia_catastral=not.is.null&anio_construccion=is.null&limit=1000`,
    { headers: { ...cab, Prefer: "count=exact" }, cache: "no-store" },
  );
  const quedan = (await q.json()) as unknown[];

  return NextResponse.json({
    ok: true,
    rellenadas: hecho.length,
    quedan: Array.isArray(quedan) ? quedan.length : null,
    ejemplos: hecho.slice(0, 8),
    sinFichaEnCatastro: sinFicha,
    direccionesQueNoCuadran: noCuadra,
    fallos,
  });
}
