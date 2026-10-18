import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { oppsSinAdministrador } from "../../../lib/adminComunidad";
import { Poner } from "./Poner";

export const dynamic = "force-dynamic";

// OPPS SIN ADMINISTRADOR (Monica, 18-oct-2026): las abiertas de 2025-26 cuya
// comunidad no tiene administrador. Cada comercial, las suyas; direccion, todas.
// Al ponerlo, va a la COMUNIDAD (el administrador es de la comunidad) y la opp
// sale de la lista.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function OppsSinAdministrador() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/sin-administrador");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/pendientes");
  const mio = yo.veTodo ? null : await comercialDe(yo.id);
  const opps = await oppsSinAdministrador(mio?.id ?? null, yo.veTodo);
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Salida href="/pendientes">← Pendientes</Salida>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Opps sin administrador · {opps.length}</h1>
        <p className="mt-1 max-w-[780px] text-[13px] text-carbon/70">
          Oportunidades abiertas de 2025 y 2026 cuya comunidad no tiene administrador. Ponle el suyo: se guarda en la
          comunidad y la opp sale de esta lista. Si la opp tiene varias comunidades, va a las que no tienen.
        </p>
        {opps.length ? (
          <table className="mt-4 w-auto border-collapse text-[13.5px]">
            <tbody>
              {opps.map((o) => (
                <tr key={o.id} className="border-b border-black/10 align-middle">
                  <td className="py-2 pr-4 text-[12px] text-carbon/60">{o.codigo}</td>
                  <td className="max-w-[420px] py-2 pr-4">
                    <Link href={`/comercial/oportunidades/${o.id}`} className="font-semibold text-carbon hover:underline">
                      {o.nombre ?? o.codigo}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-6 text-[12px] text-carbon/60">
                    {o.apertura ? `desde ${FECHA.format(new Date(o.apertura + "T00:00:00Z"))}` : ""}
                  </td>
                  <td className="py-2">
                    <Poner oppId={o.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-4 text-carbon/65">Ninguna opp abierta de 2025-26 sin administrador.</p>
        )}
      </main>
    </div>
  );
}
