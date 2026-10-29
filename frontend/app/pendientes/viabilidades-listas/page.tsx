import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { viabilidadesListas } from "../../../lib/viabilidadesListas";

export const dynamic = "force-dynamic";

// VIABILIDAD LISTA (Monica, 28-oct-2026): las que el arquitecto ya ha enviado y
// el comercial aun no ha rematado. Cada comercial, las suyas; direccion, todas.
// Al rematarla sale de esta lista.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const BOTON =
  "inline-flex h-[30px] shrink-0 items-center justify-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3 text-[11.5px] font-bold uppercase text-white transition hover:bg-[#46769c]";

export default async function ViabilidadesListas() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/viabilidades-listas");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/pendientes");
  const mio = yo.veTodo ? null : await comercialDe(yo.id);
  const [lista, rematadas] = await Promise.all([
    viabilidadesListas(mio?.id ?? null, yo.veTodo),
    viabilidadesListas(mio?.id ?? null, yo.veTodo, true),
  ]);
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Salida href="/pendientes">← Pendientes</Salida>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Viabilidad lista</h1>
        <h2 className="mt-5 text-[16px] font-bold text-carbon">Del arquitecto: te toca rematarla · {lista.length}</h2>
        <p className="mt-1 max-w-[780px] text-[13px] text-carbon/70">
          El arquitecto ya ha hecho su parte. Te toca completarla: tus precios, las tasas e ICIO, y retocar el texto a
          gusto del cliente. Al generarla sale de esta lista.
        </p>
        {lista.length ? (
          <table className="mt-4 w-auto border-collapse text-[13.5px]">
            <tbody>
              {lista.map((v) => (
                <tr key={v.id} className="border-b border-black/10 align-middle">
                  <td className="py-2 pr-4 text-[12px] text-carbon/60">{v.enviada ? FECHA.format(new Date(v.enviada)) : "—"}</td>
                  <td className="max-w-[420px] py-2 pr-4">
                    <Link href={`/comercial/oportunidades/${v.oppId}`} className="font-semibold text-carbon hover:underline">
                      {v.opp}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-[12px] text-carbon/60">{v.quien ? `la hizo ${v.quien}` : ""}</td>
                  <td className="py-2">
                    <Link href={`/comercial/viabilidad/${v.id}`} className={BOTON}>
                      Completarla
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-[13px] text-carbon/60">Ninguna esperando: no tienes viabilidades por completar.</p>
        )}

        {/* LAS YA REMATADAS (28-oct-2026): para ver en que punto esta cada una. */}
        <h2 className="mt-8 text-[16px] font-bold text-carbon">Rematadas por ti en el último mes · {rematadas.length}</h2>
        {rematadas.length ? (
          <table className="mt-3 w-auto border-collapse text-[13.5px]">
            <tbody>
              {rematadas.map((v) => (
                <tr key={v.id} className="border-b border-black/10 align-middle">
                  <td className="py-2 pr-4 text-[12px] text-carbon/60">{v.rematada ? `rematada el ${FECHA.format(new Date(v.rematada))}` : "rematada"}</td>
                  <td className="max-w-[420px] py-2 pr-4">
                    <Link href={`/comercial/oportunidades/${v.oppId}`} className="font-semibold text-carbon hover:underline">
                      {v.opp}
                    </Link>
                  </td>
                  <td className="py-2">
                    <Link href={`/comercial/viabilidad/${v.id}`} className="text-[12px] font-semibold text-[#3f5f80] hover:underline">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-[13px] text-carbon/60">Ninguna en el último mes.</p>
        )}
      </main>
    </div>
  );
}
