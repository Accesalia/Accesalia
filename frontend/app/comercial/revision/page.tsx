import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { detalleRevision, puedeRevisar, revisionesPendientes } from "../../../lib/revisionOferta";
import { RevisarPaquete } from "./RevisarPaquete";

export const dynamic = "force-dynamic";

// REVISION DE OFERTAS (Monica, 14-oct-2026). El comercial pide el ok a su
// paquete (hojas, viabilidad y presupuesto) antes de mandarlo a la comunidad; lo
// revisa quien tiene la funcion revision_ofertas (hoy Daniel y Monica). Es un
// paso critico: la oferta se envia en caliente.
//
// Sin `r`, la bandeja: lo que espera, lo mas antiguo arriba. Con `r`, el
// paquete: de cada hoja, la TABLA de conceptos (bloque, importe, forma de pago)
// para leerla de un vistazo, con su "Modifícalo", y debajo el VISOR de la hoja.
// EL OK ES AL PAQUETE ENTERO, no por hoja.

const CUANDO = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export default async function PaginaRevision({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/revision");
  if (!puedeRevisar(yo)) redirect("/menu");
  const { r } = await searchParams;

  if (r) {
    const d = await detalleRevision(r);
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <main className="mx-auto w-full max-w-[1300px] px-4 pb-20 pt-5 sm:px-6">
          <Salida href="/comercial/revision">← Ofertas esperando el ok</Salida>
          {d ? (
            <RevisarPaquete d={d} />
          ) : (
            <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">Esa revisión no existe.</p>
          )}
        </main>
      </div>
    );
  }

  const pendientes = await revisionesPendientes();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-5 sm:px-6">
        <Salida href="/menu">← Áreas de Accesalia</Salida>
        <h1 className="mt-3 border-b border-black/10 pb-4 text-3xl font-bold text-carbon sm:text-4xl">Ofertas esperando el ok</h1>

        {pendientes.length === 0 ? (
          <p className="mt-8 text-center text-[15px] text-carbon/65">No hay ninguna oferta esperando.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {pendientes.map((p) => {
              const hojas = p.documentos.filter((x) => x.tipo === "hoja");
              const otros = p.documentos.filter((x) => x.tipo !== "hoja");
              return (
                <li key={p.id}>
                  <Link
                    href={`/comercial/revision?r=${p.id}`}
                    className="block rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-lima hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="text-lg font-bold text-carbon">{p.opp}</span>
                      <span className="text-[13px] text-carbon/70">
                        Envío {p.numero} · {p.enviadaPor ?? "—"} · {CUANDO.format(new Date(p.enviadaEn))}
                      </span>
                      <span className="ml-auto text-sm font-bold text-lima-dark">Revisar →</span>
                    </div>
                    <p className="mt-1 text-[13px] text-carbon/75">
                      {hojas.length} {hojas.length === 1 ? "hoja" : "hojas"}
                      {otros.some((x) => x.tipo === "viabilidad") && " · viabilidad"}
                      {otros.some((x) => x.tipo === "presupuesto") && " · presupuesto"}
                    </p>
                    {p.nota && <p className="mt-1 whitespace-pre-line text-[14px] text-carbon/85">«{p.nota}»</p>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
