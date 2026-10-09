import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Volver } from "../components/Volver";
import { misPendientes, type ItemPendiente } from "../../lib/misPendientes";
import { quienSoy } from "../../lib/sesion";
import { accionLlamadaHecha } from "./acciones";

export const dynamic = "force-dynamic";

// PENDIENTES (Monica, 8-oct-2026): todo lo que tengo a medias, en una lista.
// Pinchar cada cosa la abre con lo que falta destacado. Se llega desde el
// boton PENDIENTES de la barra de arriba, junto a LLAMADA.

const fecha = (f: string | null) => (f ? f.split("-").reverse().join("/") : "");

function Grupo({ titulo, pie, items, hecha }: { titulo: string; pie: string; items: ItemPendiente[]; hecha?: boolean }) {
  if (!items.length) return null;
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-carbon/75">
          {titulo} · {items.length}
        </h2>
        <span className="text-[12px] text-carbon/50">{pie}</span>
      </div>
      <ul className="mt-2 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white">
        {items.map((it) => {
          const cuerpo = (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5">
              <span className="w-[78px] shrink-0 text-[12px] text-carbon/50">{fecha(it.fecha)}</span>
              <span className="min-w-0 flex-1">
                <b className="text-[14px] text-carbon">{it.titulo}</b>
                {it.detalle && <span className="block truncate text-[12px] text-carbon/60">{it.detalle}</span>}
              </span>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[12px] font-semibold text-amber-900">
                Falta: {it.falta}
              </span>
            </div>
          );
          return (
            <li key={it.id}>
              {it.href ? (
                <Link href={it.href} className="block transition hover:bg-lima-soft/50">
                  {cuerpo}
                </Link>
              ) : hecha ? (
                // LLAMADAS: "Hecha" la saca de la lista cuando lo que se derivaba
                // de ella ya esta gestionado (Alejandra, 9-oct-2026).
                <div className="flex items-center">
                  <div className="min-w-0 flex-1">{cuerpo}</div>
                  <form action={accionLlamadaHecha.bind(null, it.id)} className="pr-4">
                    <button className="rounded-lg border border-lima bg-lima px-3 py-1 text-[13px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white">
                      Hecha
                    </button>
                  </form>
                </div>
              ) : (
                cuerpo
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function Pendientes() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes");
  const { notas, opps, llamadas } = await misPendientes(yo);
  const total = notas.length + opps.length + llamadas.length;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Volver siNoHay="/menu" />
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Pendientes</h1>
        <p className="mt-1 text-[13px] text-carbon/65">
          Lo que tienes a medias. Pincha cada cosa para abrirla: lo que falta sale destacado.
        </p>

        {total === 0 && (
          <p className="mt-8 rounded-2xl border border-black/5 bg-white px-5 py-10 text-center text-[14px] text-carbon/55">
            No tienes nada pendiente. Todo está en su sitio.
          </p>
        )}

        <Grupo titulo="Notas por colocar" pie="La dirección que se escribió no estaba en la lista" items={notas} />
        <Grupo
          titulo="Oportunidades a medias"
          pie="Sin dirección, contacto o siguiente paso no se puede generar viabilidad ni hoja"
          items={opps}
        />
        <Grupo
          titulo="Llamadas por colocar"
          pie="Cuando lo que se derivaba de ella esté gestionado, márcala como hecha"
          items={llamadas}
          hecha
        />
      </main>
    </div>
  );
}
