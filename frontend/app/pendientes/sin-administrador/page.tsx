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
//
// FILTRO POR MUNICIPIO Y ORDEN (Monica, 28-oct-2026: «son casi 400... muchisimas»):
// el municipio es el de sus portales; por defecto, por orden alfabetico del
// nombre de la opp, o las mas recientes primero.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const ORDEN_ABC = new Intl.Collator("es", { sensitivity: "base", numeric: true });

export default async function OppsSinAdministrador({ searchParams }: { searchParams: Promise<{ m?: string; orden?: string }> }) {
  const { m, orden } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/sin-administrador");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/pendientes");
  const mio = yo.veTodo ? null : await comercialDe(yo.id);
  const todas = await oppsSinAdministrador(mio?.id ?? null, yo.veTodo, true);
  // Los municipios, con cuantas opps tiene cada uno; las que no tienen portal con municipio, aparte.
  const cuenta = new Map<string, number>();
  for (const o of todas) for (const x of o.municipios.length ? o.municipios : ["—"]) cuenta.set(x, (cuenta.get(x) ?? 0) + 1);
  const municipios = [...cuenta.entries()].sort((a, b) => b[1] - a[1] || ORDEN_ABC.compare(a[0], b[0]));
  const recientes = orden === "recientes";
  const opps = todas
    .filter((o) => !m || (m === "—" ? !o.municipios.length : o.municipios.includes(m)))
    .sort((a, b) => (recientes ? 0 : ORDEN_ABC.compare(a.nombre ?? a.codigo ?? "", b.nombre ?? b.codigo ?? "")));
  const enlace = (cambio: { m?: string | null; orden?: string | null }) => {
    const q = new URLSearchParams();
    const mm = cambio.m === undefined ? m : cambio.m;
    const oo = cambio.orden === undefined ? orden : cambio.orden;
    if (mm) q.set("m", mm);
    if (oo) q.set("orden", oo);
    const t = q.toString();
    return `/pendientes/sin-administrador${t ? "?" + t : ""}`;
  };
  const pastilla = (vivo: boolean) =>
    "whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] transition " +
    (vivo ? "border-carbon bg-carbon text-white" : "border-black/15 bg-white text-carbon/80 hover:border-carbon/50");
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Salida href="/pendientes">← Pendientes</Salida>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">
          Opps sin administrador · {opps.length}
          {m && <span className="text-carbon/50"> de {todas.length}</span>}
        </h1>
        <p className="mt-1 max-w-[780px] text-[13px] text-carbon/70">
          Oportunidades abiertas de 2025 y 2026 cuya comunidad no tiene administrador. Ponle el suyo: se guarda en la
          comunidad y la opp sale de esta lista. Si la opp tiene varias comunidades, va a las que no tienen.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-carbon/60">Municipio</span>
          <Link href={enlace({ m: null })} className={pastilla(!m)}>
            Todos · {todas.length}
          </Link>
          {municipios.map(([x, n]) => (
            <Link key={x} href={enlace({ m: x })} className={pastilla(m === x)}>
              {x === "—" ? "sin municipio" : x} · {n}
            </Link>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-carbon/60">Orden</span>
          <Link href={enlace({ orden: null })} className={pastilla(!recientes)}>
            A–Z
          </Link>
          <Link href={enlace({ orden: "recientes" })} className={pastilla(recientes)}>
            Más recientes
          </Link>
        </div>
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
                  <td className="whitespace-nowrap py-2 pr-4 text-[12px] text-carbon/60">{o.municipios.join(", ")}</td>
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
