import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { datosPdfViabilidad } from "../../../../../../../lib/pdf/viabilidad-datos";
import { ViabilidadDoc } from "../../../../../../../lib/pdf/ViabilidadDoc";

export const dynamic = "force-dynamic";

// GET → genera el PDF de la viabilidad al vuelo y lo sirve (previsualizar).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; viabId: string }> }) {
  const { viabId } = await params;
  const d = await datosPdfViabilidad(viabId);
  if (!d) return new Response("Viabilidad no encontrada", { status: 404 });

  const hoy = new Date().toISOString().slice(0, 10);
  // ViabilidadDoc devuelve <Document>; el tipo de renderToBuffer es estricto, cast puntual.
  const element = createElement(ViabilidadDoc, { d, fechaEmision: hoy }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="viabilidad-v${d.version}.pdf"`,
    },
  });
}
