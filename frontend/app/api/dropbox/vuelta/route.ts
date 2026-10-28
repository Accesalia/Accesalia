import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { guardarPermisoDropbox } from "../../../../lib/dropboxApi";
import { quienSoy } from "../../../../lib/sesion";

// LA VUELTA DE DROPBOX con el permiso de la app. Comprueba que viene de nuestro
// boton (la cookie), guarda la llave cifrada y vuelve a Gestiones → Dropbox.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const volver = (q: Record<string, string>) => NextResponse.redirect(new URL(`/gestiones/dropbox?${new URLSearchParams(q)}`, url.origin));

  const yo = await quienSoy();
  if (!yo?.veTodo) return NextResponse.json({ error: "Solo dirección." }, { status: 403 });

  const tarro = await cookies();
  const esperado = tarro.get("dropbox_estado")?.value;
  tarro.delete({ name: "dropbox_estado", path: "/api/dropbox" });
  if (url.searchParams.get("error")) return volver({ mal: "Dropbox no dio el permiso (cancelado)." });
  if (!esperado || url.searchParams.get("state") !== esperado) return volver({ mal: "La vuelta de Dropbox no viene de este botón. Vuelve a pulsar «Conectar»." });
  const codigo = url.searchParams.get("code");
  if (!codigo) return volver({ mal: "Dropbox no devolvió el permiso." });

  try {
    return volver({ ok: await guardarPermisoDropbox(codigo) });
  } catch (e) {
    return volver({ mal: e instanceof Error ? e.message : String(e) });
  }
}
