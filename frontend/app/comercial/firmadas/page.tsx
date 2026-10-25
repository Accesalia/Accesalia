import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { firmadasPorValidar } from "../../../lib/hojasOpp";

export const dynamic = "force-dynamic";

// HOJAS FIRMADAS POR VALIDAR (Monica, 25-oct-2026): las firmadas archivadas en su opp (por el portal o el cajon) que el
// comercial que lleva la opp aun no ha validado. Se validan en la propia opp (bloque 2): de aqui se va a ella.
// Cada comercial, las de su cartera; direccion y supervision comercial, todas.
export default async function FirmadasPorValidar() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/firmadas");
  const todas = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const mio = todas ? null : await comercialDe(yo.id);
  const lista = await firmadasPorValidar(mio?.id ?? null, todas);
  const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Madrid" });
  const th = "border-b border-black/15 px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide text-carbon/60 whitespace-nowrap";
  const td = "border-b border-black/10 px-2 py-1.5 align-baseline";
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/pendientes">← Pendientes</Salida>
        <h1 className="mt-3 text-2xl font-bold text-carbon">Hojas firmadas por validar</h1>
        <p className="mt-1 text-sm text-carbon/70">Ya están archivadas en su oportunidad. Ábrela y, en «Hoja de encargo», comprueba la firma, la versión y que no está retocada.</p>
        {lista.length === 0 ? (
          <p className="mt-6 text-sm text-carbon/60">No hay ninguna hoja firmada por validar.</p>
        ) : (
          <table className="mt-4 border-collapse text-[13px]">
            <thead>
              <tr><th className={th}>Llegó</th><th className={th}>Oportunidad</th>{todas && <th className={th}>Comercial</th>}<th className={th}>Documento</th></tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.docId}>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{fecha(f.subido)}</td>
                  <td className={td}>
                    <Link href={`/comercial/oportunidades/${f.opp.id}`} className="font-semibold text-[#104269] underline-offset-2 hover:underline">
                      {f.opp.nombre ?? f.opp.codigo ?? "Oportunidad"}
                    </Link>
                    {f.opp.codigo && <span className="ml-2 text-carbon/50">{f.opp.codigo}</span>}
                  </td>
                  {todas && <td className={`${td} whitespace-nowrap`}>{f.opp.comercial ?? "—"}</td>}
                  <td className={td}>{f.nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
