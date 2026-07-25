import { NextResponse } from "next/server";

// Busqueda rapida de comunidades para el typeahead de la cabecera. Corre en el
// servidor con la clave secreta. Parte la consulta en tokens y exige que TODOS
// aparezcan (en nombre o municipio), asi "murillo 177" encuentra
// "BRAVO MURILLO 177 MADRID" aunque escribas las palabras sueltas.

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const limite = Math.min(Number(params.get("limit")) || 8, 50);
  if (q.length < 2) return NextResponse.json([]);

  const tokens = q.split(/\s+/).slice(0, 6);
  // Por token: (nombre.ilike.*t* OR municipio.ilike.*t*). Todos con AND.
  const cond = tokens
    .map((t) => {
      const e = encodeURIComponent(`*${t}*`);
      return `or(nombre.ilike.${e},municipio.ilike.${e})`;
    })
    .join(",");

  const path =
    `comunidades?select=id,nombre,municipio,cp&and=(${cond})&order=nombre.asc&limit=${limite}`;

  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json([], { status: 200 });
  return NextResponse.json(await r.json());
}
