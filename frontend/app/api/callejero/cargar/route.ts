import { NextResponse } from "next/server";
import {
  apuntarMunicipios,
  cargarTanda,
  comoVaLaCarga,
  municipiosPendientes,
  PROVINCIA_COMPLETA,
} from "../../../../lib/callejero";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { apuntarPasada, esElReloj } from "../../../../lib/reloj";

// BAJAR EL CALLEJERO OFICIAL DE CATASTRO, A TANDAS.
//
// Son 185 municipios y 71.802 vias: no cabe en una pasada. Cada llamada hace una
// tanda de municipios, los mas grandes primero, y dice cuantos quedan. Lo hecho
// no se repite, porque municipios_catastro.descargado_en lleva la cuenta.
//
// CORRE AQUI Y NO EN UN PORTATIL: las credenciales son las de Vercel.
//
// GET                  -> solo mira: cuantos municipios y cuantas vias van. No escribe.
// GET  ?hacer=1        -> hace una tanda ahora y contesta que ha hecho.
// GET  ?municipios=1   -> da de alta los municipios de la provincia de Madrid.
// POST                 -> una tanda.
//
// Cuando se quiera un municipio de OTRA provincia (hay obra en Toledo, Valencia,
// Guadalajara y Avila), se apunta a mano:
//    ?municipios=1&provincia=TOLEDO&filtro=TALAVERA
// y la siguiente tanda ya lo baja.

//
// YA NO TIENE RELOJ (1-oct-2026). El trabajo acabo y el horario se quito de
// vercel.json a peticion de Monica: un cron dormido no se encuentra cuando hace
// falta. La ruta sigue viva: se lanza a mano abriendola con ?hacer=1. Para
// volver a programarla, una entrada en frontend/vercel.json. Ver RETIRADOS en
// lib/reloj.ts.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TAREA = "callejero_catastro";

async function permitido(req: Request): Promise<boolean> {
  if (esElReloj(req)) return true;
  const yo = await quienSoy();
  return !!yo && puedeEntrar(yo, "comercial", "supervisar");
}

export async function GET(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });

  const parametros = new URL(req.url).searchParams;

  if (parametros.get("municipios")) {
    const provincia = parametros.get("provincia") ?? PROVINCIA_COMPLETA;
    const filtro = parametros.get("filtro") ?? "";
    const cuantos = await apuntarMunicipios(provincia, filtro);
    return NextResponse.json({
      ok: true,
      provincia,
      filtro: filtro || "(todos)",
      municipios_apuntados: cuantos,
      nota: "Apuntados. Las vias las baja la siguiente tanda.",
    });
  }

  if (esElReloj(req) || parametros.get("hacer")) return POST(req);

  const [como, pendientes] = await Promise.all([comoVaLaCarga(), municipiosPendientes()]);
  return NextResponse.json({
    ok: true,
    ...como,
    quedan: pendientes.length,
    siguientes: pendientes.slice(0, 8).map((m) => m.nombre),
    nota: "Para bajar una tanda ahora: añade ?hacer=1 a esta misma dirección.",
  });
}

export async function POST(req: Request) {
  if (!(await permitido(req))) return NextResponse.json({ error: "No." }, { status: 403 });

  const pedido = Number(new URL(req.url).searchParams.get("cuantos"));
  // De cuatro en cuatro por defecto: los primeros son los mas gordos (Madrid
  // capital son 9.629 vias) y hay 300 segundos de margen, no mas.
  const cuantos = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 25) : 4;

  const empezada = Date.now();
  const quien = esElReloj(req) ? "reloj" : "persona";
  try {
    const hecho = await cargarTanda(cuantos);
    await apuntarPasada({ tarea: TAREA, empezada, ok: true, detalle: hecho, quien });
    return NextResponse.json({ ok: true, ...hecho });
  } catch (e) {
    const dice = e instanceof Error ? e.message : String(e);
    await apuntarPasada({ tarea: TAREA, empezada, ok: false, dice, quien });
    return NextResponse.json({ ok: false, dice }, { status: 500 });
  }
}
