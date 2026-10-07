import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { comercialesActivos } from "../../../lib/gestionOportunidad";
import { oppsAsignables } from "../../../lib/gestionComercial";
import { accionAsignar } from "./acciones";

export const dynamic = "force-dynamic";

// GESTION DE OPORTUNIDADES (Monica, 7-oct-2026): el cuadro de mando de la
// gestion del area comercial. Lo ven Alejandra (secretaria comercial), Daniel y
// Monica; se llega con el boton "Gestion Oportunidades" del area comercial.
//
// Primera pieza: QUE COMERCIAL LLEVA CADA OPORTUNIDAD. Las demas ("opps
// creadas"...) se iran sumando aqui.

const CAJA = "rounded-[10px] border border-[#d9d9d9] bg-white";
const ROT = "text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]";
const pill = (on: boolean) =>
  "rounded-full border px-3 py-1 text-[12.5px] transition " +
  (on ? "border-carbon bg-carbon font-semibold text-white" : "border-carbon/25 bg-white text-carbon/75 hover:border-carbon");
const fecha = (v: string | null) => (v ? v.split("-").reverse().join("/") : "—");

export default async function GestionComercial({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/gestion");
  if (!puedeEntrar(yo, "comercial", "supervisar")) redirect("/comercial");

  const { c } = await searchParams;
  const [opps, comerciales] = await Promise.all([oppsAsignables(), comercialesActivos()]);
  const cuenta = (id: string | null) => opps.filter((o) => o.comercialId === id).length;
  // Por defecto, las que no lleva nadie: es lo que hay que repartir.
  const filtro = c ? c : null;
  const nombreDe = new Map(comerciales.map((m) => [m.id, m.nombre]));
  const lista = opps.filter((o) => (filtro === "todas" ? true : o.comercialId === filtro));

  return (
    <div className="min-h-screen" style={{ background: "#8EB180" }}>
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1300px] px-4 pb-16 pt-5 sm:px-6 min-[1300px]:px-0">
        <Link href="/comercial" className="text-sm font-semibold text-carbon/75 transition hover:text-carbon">
          ← Área comercial
        </Link>
        <h1 className="mt-3 text-[25px] font-bold text-carbon">Gestión de oportunidades</h1>

        <div className="mt-4 grid items-start gap-[10px] lg:grid-cols-[1fr_300px]">
          {/* ---------------------- comerciales asignados ---------------------- */}
          <section className={CAJA + " p-4"}>
            <div className={ROT}>Comerciales asignados</div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Link href="/comercial/gestion" className={pill(filtro === null)}>
                Sin asignar <b>{cuenta(null)}</b>
              </Link>
              {comerciales.map((m) => (
                <Link key={m.id} href={`/comercial/gestion?c=${m.id}`} className={pill(filtro === m.id)}>
                  {m.nombre} <b>{cuenta(m.id)}</b>
                </Link>
              ))}
              <Link href="/comercial/gestion?c=todas" className={pill(filtro === "todas")}>
                Todas <b>{opps.length}</b>
              </Link>
            </div>

            {lista.length === 0 ? (
              <p className="mt-4 text-[13px] text-carbon/65">No hay ninguna.</p>
            ) : (
              <table className="mt-3 w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.07em] text-[#8a8a8a]">
                    <th className="border-b border-[#e2e2e2] px-1.5 py-1 font-bold">Oportunidad</th>
                    <th className="border-b border-[#e2e2e2] px-1.5 py-1 font-bold">Abierta</th>
                    <th className="border-b border-[#e2e2e2] px-1.5 py-1 font-bold">Comercial</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((o) => (
                    <tr key={o.id} className="align-middle">
                      <td className="border-b border-[#f0f0f0] px-1.5 py-1">
                        <Link href={`/comercial/oportunidades/${o.id}`} className="font-semibold text-carbon hover:underline">
                          {o.nombre ?? o.codigo ?? "(sin nombre)"}
                        </Link>
                        {o.codigo && <span className="ml-2 text-[11px] text-[#8a8a8a]">{o.codigo}</span>}
                        {o.estado === "pausada" && <span className="ml-2 rounded-full bg-amber-50 px-2 text-[10.5px] text-amber-800">pausada</span>}
                      </td>
                      <td className="border-b border-[#f0f0f0] px-1.5 py-1 tabular-nums text-carbon/75">{fecha(o.apertura)}</td>
                      <td className="border-b border-[#f0f0f0] px-1.5 py-1">
                        <form action={accionAsignar.bind(null, o.id)} className="flex items-center gap-1.5">
                          <select
                            name="comercial"
                            defaultValue={o.comercialId ?? ""}
                            aria-label={`Comercial de ${o.nombre ?? "esta oportunidad"}`}
                            className={
                              "rounded-[6px] border px-2 py-0.5 text-[12.5px] " +
                              (o.comercialId ? "border-carbon/30 bg-white text-carbon" : "border-amber-300 bg-amber-50 text-amber-900")
                            }
                          >
                            <option value="">sin asignar</option>
                            {comerciales.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nombre}
                              </option>
                            ))}
                            {o.comercialId && !nombreDe.has(o.comercialId) && <option value={o.comercialId}>(ya no está activo)</option>}
                          </select>
                          <button className="rounded-[5px] border border-[#2b2b2b] bg-white px-2 py-0.5 text-[11.5px] font-bold text-[#1c1c1c] hover:bg-[#f3f3f3]">
                            Guardar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ---------------------- lo que vendra ---------------------- */}
          <section className={CAJA + " p-4"}>
            <div className={ROT}>Oportunidades creadas</div>
            <p className="mt-2 text-[12px] text-carbon/65">
              Qué se ha abierto, cuándo y quién.{" "}
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/50">Próximamente</span>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
