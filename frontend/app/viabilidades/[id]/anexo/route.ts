import { quienSoy, puedeEntrar } from "../../../../lib/sesion";
import { anexoGuardado, guardarAnexo } from "../../../../lib/anexoGuardado";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Si aun no esta hecho se hace al momento, y eso pasa por Catastro: tarda.
export const maxDuration = 60;

// EL ANEXO DE UNA VIABILIDAD: el PDF que la app adjunto sola al crearla (o al
// enviarla). Lo abren Alex en la mesa y el comercial, que es quien lo manda.
// Si por lo que sea no llego a hacerse, se hace ahora y se guarda.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) return new Response("Tienes que entrar en la app.", { status: 401 });
  const puede = yo.veTodo || puedeEntrar(yo, "comercial") || yo.funciones.some((f) => f.clave === "viabilidades");
  if (!puede) return new Response("No tienes acceso a las viabilidades.", { status: 403 });

  let a = await anexoGuardado(id);
  if (!a && (await guardarAnexo(id).catch(() => false))) a = await anexoGuardado(id);
  if (!a) return new Response("Esta viabilidad no tiene edificio con referencia catastral: no hay anexo que sacar.", { status: 404 });

  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  return new Response(a.pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="anexo-ficha-edificio.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
