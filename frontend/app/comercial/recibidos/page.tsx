import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { porRevisar } from "../../../lib/recibidos";
import { Revisar } from "./Revisar";

export const dynamic = "force-dynamic";

// DOCUMENTOS RECIBIDOS POR REVISAR (Monica, 12-oct-2026): lo que las comunidades
// suben desde su portal. Cada uno lo revisa el responsable de su tipo; la hoja
// de encargo firmada, el comercial de la oportunidad (direccion y supervision,
// todas). "Es la firmada" la deja firmada y crea sus lineas de cobro.

const CUANDO = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export default async function Recibidos() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/recibidos");
  const filas = await porRevisar(yo);
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/pendientes">← Pendientes</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Documentos recibidos</h1>
        <p className="mt-1 text-carbon/65">Lo que las comunidades nos suben desde su página. Nada vale hasta que se revisa.</p>
        <section className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          {filas.length === 0 ? (
            <p className="px-5 py-10 text-center text-carbon/65">Nada por revisar.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {filas.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[14px]">
                  <div className="min-w-0">
                    <div className="font-semibold text-carbon">
                      {r.tipo === "hoja_firmada" ? `Hoja de encargo ${r.hoja?.numero_hoja ?? ""} firmada` : (r.descripcion ?? "Documento")}
                    </div>
                    <div className="text-[13px] text-carbon/65">
                      {r.comunidad ? (
                        <Link href={`/administracion/comunidades/${r.comunidad.id}`} className="hover:underline">
                          {r.comunidad.nombre}
                        </Link>
                      ) : null}
                      {r.hoja?.opp?.codigo ? ` · ${r.hoja.opp.codigo}` : ""} · {r.subido_por_nombre ? `${r.subido_por_nombre} (${r.subido_por_email})` : r.subido_por_email} ·{" "}
                      {CUANDO.format(new Date(r.creado_en))} · {r.nombre_fichero}
                    </div>
                  </div>
                  <Revisar id={r.id} esHoja={r.tipo === "hoja_firmada"} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
