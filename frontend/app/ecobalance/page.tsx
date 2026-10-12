import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { quienSoy } from "../../lib/sesion";
import { puedeVerEcobalance } from "../../lib/cobros";
import { listaEcobalance, type ListaEcobalance } from "../../lib/ecobalance";

export const dynamic = "force-dynamic";

// ECOBALANCE (Monica, 12-oct-2026). Solo Ana, Daniel y Monica. Dos listas de
// direcciones: las hojas firmadas con 3 PRESUPUESTOS y las que llevan CAES. Lo
// basico: que aparezcan; la gestion se diseña despues.

const PESTANAS: [ListaEcobalance, string][] = [
  ["3pp", "3 presupuestos"],
  ["caes", "CAES"],
];
const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");

export default async function Ecobalance({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/ecobalance");
  if (!puedeVerEcobalance(yo)) redirect("/menu");
  const lista: ListaEcobalance = ver === "caes" ? "caes" : "3pp";
  const [filas3, filasC] = await Promise.all([listaEcobalance("3pp"), listaEcobalance("caes")]);
  const filas = lista === "caes" ? filasC : filas3;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1300px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-black/10">
          <h1 className="pb-2 text-3xl font-bold text-carbon">Ecobalance</h1>
          <nav className="flex gap-1">
            {PESTANAS.map(([k, t]) => (
              <Link
                key={k}
                href={`/ecobalance?ver=${k}`}
                className={
                  "-mb-px rounded-t-[8px] border px-4 py-2 text-[13px] font-semibold transition " +
                  (k === lista ? "border-black/10 border-b-fondo bg-fondo text-carbon" : "border-transparent text-carbon/60 hover:text-carbon")
                }
              >
                {t} <span className="text-carbon/55">{k === "caes" ? filasC.length : filas3.length}</span>
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-3 text-carbon/65">
          {lista === "caes"
            ? "Las hojas de encargo firmadas que llevan CAES."
            : "Las hojas de encargo firmadas que incluyen 3 presupuestos: se cobran a éxito, si gana la contrata que presentamos."}
        </p>

        <section className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          {filas.length === 0 ? (
            <p className="px-5 py-10 text-center text-carbon/65">Ninguna todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-black/10 text-[10.5px] font-bold uppercase tracking-wide text-carbon/65">
                    <th className="px-4 py-2.5">Dirección</th>
                    <th className="px-3 py-2.5">Oportunidad</th>
                    <th className="px-3 py-2.5">Hoja</th>
                    <th className="px-3 py-2.5">Firmada</th>
                    <th className="px-3 py-2.5">Comercial</th>
                    <th className="px-3 py-2.5">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.hojaId} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-2">
                        <b className="text-carbon">{f.direccion}</b>
                        {f.municipio && <span className="text-carbon/60"> · {f.municipio}</span>}
                      </td>
                      <td className="px-3 py-2">
                        {f.oppId ? (
                          <Link href={`/comercial/oportunidades/${f.oppId}`} className="font-semibold text-carbon hover:underline">
                            {f.codigo ?? "—"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">{f.numeroHoja ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{fecha(f.firmada)}</td>
                      <td className="px-3 py-2">{f.comercial ?? "—"}</td>
                      <td className="px-3 py-2">{f.precio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
