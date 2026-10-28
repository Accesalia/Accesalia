import { NextResponse } from "next/server";
import { quienSoy } from "../../../../lib/sesion";
import { enlaceCarpeta, enlaceFichero, rutaParaLaApi } from "../../../../lib/dropbox";
import { enlaceParaElEquipo, hayLlaveDropbox } from "../../../../lib/dropboxApi";

// ABRIR UNA CARPETA (O FICHA) ANTIGUA DEL DROPBOX (Monica, 28-oct-2026).
//
// El enlace directo (dropbox.com/home/D SM/…) solo lo abre Daniel: «D SM» es su
// carpeta de miembro. Aqui la app pide a Dropbox un enlace SOLO PARA EL EQUIPO
// y lleva a el: lo abre cualquier cuenta del equipo (Daniel o tecnicos).
// Mientras el Dropbox no este conectado (Gestiones → Dropbox), se sigue
// mandando al enlace de siempre, que es lo que habia.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const aviso = (texto: string) =>
  new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Dropbox</title><body style="font-family:system-ui;padding:32px;color:#333"><p>${texto}</p><p><a href="javascript:window.close()">Cerrar</a></p></body>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

const html = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ruta = url.searchParams.get("ruta") ?? "";
  const fichero = url.searchParams.get("fichero") === "1";
  if (!(await quienSoy())) return NextResponse.redirect(new URL("/entrar", url.origin));
  if (!ruta || ruta.includes("..")) return aviso("Falta la carpeta.");

  if (!(await hayLlaveDropbox())) return NextResponse.redirect(fichero ? enlaceFichero(ruta) : enlaceCarpeta(ruta));

  try {
    const enlace = await enlaceParaElEquipo(rutaParaLaApi(ruta));
    if (!enlace) return aviso(`Esa ${fichero ? "ficha" : "carpeta"} ya no está en el Dropbox: <b>${html(ruta)}</b>. Puede que la hayan movido o renombrado.`);
    return NextResponse.redirect(enlace);
  } catch (e) {
    return aviso(`No se ha podido abrir en Dropbox: ${html(e instanceof Error ? e.message : String(e))}`);
  }
}
