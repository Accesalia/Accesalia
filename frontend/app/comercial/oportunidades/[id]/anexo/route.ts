import { quienSoy, puedeEntrar } from "../../../../../lib/sesion";
import { anexoDeOportunidad } from "../../../../../lib/anexoEdificio";
import { pdfDelAnexo } from "../../../../../lib/pdf/AnexoDoc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// LA VISTA INFORME DEL BLOQUE 1: el anexo sacado al momento, con los datos de
// hoy. Si la oportunidad ya tiene viabilidad con coste de obra, las ayudas
// llevan su estimacion.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) return new Response("Tienes que entrar en la app.", { status: 401 });
  if (!puedeEntrar(yo, "comercial")) return new Response("No tienes acceso al área comercial.", { status: 403 });

  const S = process.env.SUPABASE_SECRET_KEY ?? "";
  const r = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/viabilidades?select=pem_estimado&oportunidad_id=eq.${encodeURIComponent(id)}&pem_estimado=not.is.null&order=creado_en.desc&limit=1`,
    { headers: { apikey: S, Authorization: `Bearer ${S}` }, cache: "no-store" },
  );
  const [v] = r.ok ? ((await r.json()) as { pem_estimado: number }[]) : [];
  const anexo = await anexoDeOportunidad(id, { pem: v?.pem_estimado ?? null });
  if (!anexo) return new Response("Esta oportunidad no tiene referencia catastral: no hay ficha que sacar.", { status: 404 });
  const pdf = await pdfDelAnexo(anexo);
  return new Response(pdf as unknown as BodyInit, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="ficha-edificio.pdf"`, "Cache-Control": "private, no-store" },
  });
}
