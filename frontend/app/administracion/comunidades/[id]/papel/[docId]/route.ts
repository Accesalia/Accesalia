import { redirect } from "next/navigation";
import { quienSoy } from "../../../../../../lib/sesion";
import { firmarEnlace, rutaDePapel } from "../../../../../../lib/fichaComunidad";

export const dynamic = "force-dynamic";

// UN PAPEL DE LA COMUNIDAD (la tarjeta del CIF, el acta, el DNI...) o de una de
// sus opps: se firma el enlace al abrirlo (diez minutos) y se manda alli.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/administracion/comunidades/${id}`);
  const donde = await rutaDePapel(id, docId);
  const url = donde ? await firmarEnlace(donde.almacen, donde.ruta) : null;
  if (!url) return new Response("No se encuentra el documento.", { status: 404 });
  redirect(url);
}
