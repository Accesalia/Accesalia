import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { misPendientes, tarjetasQueVeo } from "../../../lib/misPendientes";
import { quienSoy } from "../../../lib/sesion";
import { ListaPendiente } from "../Lista";

export const dynamic = "force-dynamic";

// OPORTUNIDADES A MEDIAS, la lista de su tarjeta de Pendientes (Monica,
// 10-oct-2026). Al comercial, las de su cartera; a quien supervisa y a
// direccion, todas, con un filtro por comercial: "142 mezcladas" no se trabaja.

const CHIP = "rounded-full border border-black/15 bg-white px-3 py-1 text-[12px] font-semibold text-carbon/75 transition hover:text-carbon";
const CHIP_ACTIVO = "rounded-full border border-[#104269] bg-[#104269] px-3 py-1 text-[12px] font-semibold text-white";

export default async function OppsAMedias({ searchParams }: { searchParams: Promise<{ comercial?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/oportunidades");
  const { comercial } = await searchParams;
  const { opps } = await misPendientes(yo);
  const { supervisa } = tarjetasQueVeo(yo);

  const cuantas = new Map<string, number>();
  for (const o of opps) {
    const c = o.comercial ?? "Sin comercial";
    cuantas.set(c, (cuantas.get(c) ?? 0) + 1);
  }
  const comerciales = [...cuantas].sort((a, b) => b[1] - a[1]);
  const lista = comercial ? opps.filter((o) => (o.comercial ?? "Sin comercial") === comercial) : opps;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Link href="/pendientes" className="text-sm font-semibold text-carbon/65 transition hover:text-carbon">
          ← Pendientes
        </Link>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Oportunidades a medias · {lista.length}</h1>
        <p className="mt-1 text-[13px] text-carbon/70">
          Sin dirección, contacto o siguiente paso no se puede generar viabilidad ni hoja. Pincha cada una para completarla.
        </p>

        {supervisa && comerciales.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Link href="/pendientes/oportunidades" className={comercial ? CHIP : CHIP_ACTIVO}>
              Todos · {opps.length}
            </Link>
            {comerciales.map(([c, n]) => (
              <Link key={c} href={`/pendientes/oportunidades?comercial=${encodeURIComponent(c)}`} className={comercial === c ? CHIP_ACTIVO : CHIP}>
                {c} · {n}
              </Link>
            ))}
          </div>
        )}

        <ListaPendiente items={lista} vacio="No hay ninguna oportunidad a medias. Todo completo." />
      </main>
    </div>
  );
}
