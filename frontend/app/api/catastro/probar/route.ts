import { NextResponse } from "next/server";
import { porReferencia } from "../../../../lib/catastro";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// ¿POR QUE NO HACE NADA? Esta ruta contesta eso, paso a paso y con tiempos, en
// vez de dejarnos adivinando. Hace UNA sola comunidad y NO escribe nada.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

export async function GET() {
  const pasos: Record<string, unknown> = {};
  const t0 = Date.now();
  const marca = (k: string, v: unknown) => {
    pasos[k] = v;
  };

  const yo = await quienSoy();
  marca("1_quien_soy", yo ? `${yo.nombre} · ve todo: ${yo.veTodo}` : "SIN SESIÓN");
  if (!yo) return NextResponse.json({ ok: false, pasos, dice: "No hay sesión: entra en la app primero." });
  marca("2_puede", yo.veTodo || puedeEntrar(yo, "administracion", "trabajar"));

  marca("3_variables", { url: URL_BASE ? "puesta" : "FALTA", clave: SECRETO ? "puesta" : "FALTA" });
  if (!URL_BASE || !SECRETO) return NextResponse.json({ ok: false, pasos });

  const t1 = Date.now();
  const r = await fetch(
    `${URL_BASE}/rest/v1/comunidades?select=id,nombre,referencia_catastral,cp,anio_construccion` +
      `&referencia_catastral=not.is.null&anio_construccion=is.null&order=nombre.asc&limit=1`,
    { headers: { ...cab, Prefer: "count=exact" }, cache: "no-store" },
  );
  marca("4_supabase", { estado: r.status, ms: Date.now() - t1, pendientes: r.headers.get("content-range") });
  if (!r.ok) return NextResponse.json({ ok: false, pasos, dice: await r.text() });

  const [c] = (await r.json()) as { id: string; nombre: string; referencia_catastral: string }[];
  if (!c) return NextResponse.json({ ok: true, pasos, dice: "No queda ninguna pendiente: ya está todo." });
  marca("5_la_primera", `${c.nombre} · ${c.referencia_catastral}`);

  const t2 = Date.now();
  try {
    const f = await porReferencia(c.referencia_catastral);
    marca("6_catastro", { ms: Date.now() - t2, ficha: f });
  } catch (e) {
    marca("6_catastro", { ms: Date.now() - t2, error: e instanceof Error ? e.message : String(e) });
  }

  marca("7_total_ms", Date.now() - t0);
  return NextResponse.json({ ok: true, nota: "Esto NO ha escrito nada. Solo mira.", pasos });
}
