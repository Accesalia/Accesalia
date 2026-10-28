import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { adminsDormidos } from "../../../lib/adminsDormidos";

export const dynamic = "force-dynamic";

// ADMINISTRADORES SIN MOVIMIENTO DESDE HACE 4 MESES (Monica, 28-oct-2026). Los
// que lleva el comercial (direccion, todos), el que mas tiempo lleva callado arriba.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function AdminsDormidos() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/administradores-dormidos");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/pendientes");
  const mio = yo.veTodo ? null : await comercialDe(yo.id);
  const lista = await adminsDormidos(mio?.id ?? null, yo.veTodo);
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Salida href="/pendientes">← Pendientes</Salida>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">
          Administradores sin movimiento desde hace 4 meses · {lista.length}
        </h1>
        <p className="mt-1 max-w-[780px] text-[13px] text-carbon/70">
          Ya nos dieron algo y llevamos más de 120 días sin hablar con ellos ni con sus oportunidades. Un buen momento para
          llamarles. Salen de la lista en cuanto apuntas una nota con ellos o en una de sus oportunidades.
        </p>
        {lista.length ? (
          <table className="mt-4 w-auto border-collapse text-[13.5px]">
            <tbody>
              {lista.map((a) => (
                <tr key={a.puestoId} className="border-b border-black/10 align-middle">
                  <td className="py-2 pr-4 font-semibold text-carbon">{a.nombre}</td>
                  <td className="py-2 pr-4 text-carbon/70">{a.administracion ?? ""}</td>
                  <td className="py-2 pr-4 tabular-nums text-carbon/70">{a.telefono ?? ""}</td>
                  <td className="py-2 pr-4 text-[12px] text-carbon/60">
                    último: {FECHA.format(new Date(a.ultimo + "T12:00:00Z"))} · hace {a.dias} días
                  </td>
                  {yo.veTodo && <td className="py-2 text-[12px] text-carbon/60">{a.lleva ? `lo lleva ${a.lleva}` : ""}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-6 text-[13px] text-carbon/60">Ninguno: con todos los tuyos ha habido movimiento en los últimos 4 meses.</p>
        )}
      </main>
    </div>
  );
}
