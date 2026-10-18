import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { comisionesDe, listaComerciales } from "../../../lib/comisionesComercial";
import { Comisiones } from "./Comisiones";

export const dynamic = "force-dynamic";

// COMISIONES DE NUESTROS COMERCIALES (Monica, 18-oct-2026). Cada comercial ve la suya;
// direccion, la de cualquiera con el selector. Ver lib/comisionesComercial.ts.

export default async function PaginaComisiones({ searchParams }: { searchParams: Promise<{ c?: string; ver?: string }> }) {
  const { c, ver } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/comisiones");
  const direccion = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const mio = await comercialDe(yo.id);
  if (!direccion && !mio) redirect("/comercial");
  const comerciales = await listaComerciales();
  const elegido = direccion ? (comerciales.find((x) => x.id === c) ?? comerciales.find((x) => x.id === mio?.id) ?? comerciales[0]) : comerciales.find((x) => x.id === mio!.id);
  if (!elegido) redirect("/comercial");
  const opps = await comisionesDe(elegido);
  const vista = ver === "fuera" ? "fuera" : "cuentan";
  const pill = (on: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-carbon bg-carbon font-semibold text-white" : "border-black/10 bg-white text-carbon/80 hover:border-carbon/40"}`;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1180px] px-6 pb-16 pt-5 sm:px-12">
        <Salida href={`/comercial${direccion ? `?c=${elegido.id}` : ""}`}>← Área comercial</Salida>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[25px] font-bold leading-tight text-carbon">
              {direccion ? "Comisiones" : "Mis comisiones"} · {elegido.nombre}
            </h1>
            <p className="mt-1 text-[13.5px] text-carbon/65">
              {elegido.pct != null ? `${elegido.pct.toLocaleString("es-ES")} %` : "Sin % pactado todavía"} sobre lo firmado para Accesalia (sin la comisión del administrador), a medida que
              Accesalia cobra. Cuenta desde el 1 de enero de 2026.
            </p>
          </div>
          {direccion && (
            <div className="flex flex-wrap gap-1.5">
              {comerciales.map((m) => (
                <Link key={m.id} href={`/comercial/comisiones?c=${m.id}`} className={pill(m.id === elegido.id)}>
                  {m.nombre.split(" ")[0]}
                </Link>
              ))}
            </div>
          )}
        </div>
        <Comisiones comercial={elegido} opps={opps} vista={vista} editable={direccion} />
      </main>
    </div>
  );
}
