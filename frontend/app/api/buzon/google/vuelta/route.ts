import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { guardarPermiso } from "../../../../../lib/gmailBuzon";
import { quienSoy } from "../../../../../lib/sesion";

// LA VUELTA DE GOOGLE con el permiso del buzon. Comprueba que viene de nuestro
// boton (la cookie), que el permiso lo dio EL BUZON y no otra cuenta, lo guarda
// cifrado y vuelve a la pantalla del buzon diciendo como ha ido.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const volver = (q: Record<string, string>) => NextResponse.redirect(new URL(`/gestiones/buzon-polycam?${new URLSearchParams(q)}`, url.origin));

  const yo = await quienSoy();
  if (!yo?.veTodo) return NextResponse.json({ error: "Solo dirección." }, { status: 403 });

  const tarro = await cookies();
  const esperado = tarro.get("buzon_google_estado")?.value;
  tarro.delete({ name: "buzon_google_estado", path: "/api/buzon/google" });
  if (url.searchParams.get("error")) return volver({ google_mal: "Google no dio el permiso (cancelado)." });
  if (!esperado || url.searchParams.get("state") !== esperado) return volver({ google_mal: "La vuelta de Google no viene de este botón. Vuelve a pulsar «Conectar»." });
  const codigo = url.searchParams.get("code");
  if (!codigo) return volver({ google_mal: "Google no devolvió el permiso." });

  try {
    const cuenta = await guardarPermiso(codigo);
    return volver({ google_ok: cuenta });
  } catch (e) {
    return volver({ google_mal: e instanceof Error ? e.message : String(e) });
  }
}
