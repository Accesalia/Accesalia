import Link from "next/link";
import type { ItemPendiente } from "../../lib/misPendientes";
import { accionLlamadaHecha } from "./acciones";

// LA LISTA DE UNA TARJETA DE PENDIENTES. La usan las pantallas a las que lleva
// cada tarjeta de la pizarra (oportunidades a medias, llamadas...). Pinchar cada
// cosa la abre con lo que falta destacado.

const fecha = (f: string | null) => (f ? f.split("-").reverse().join("/") : "");

export function ListaPendiente({ items, hecha, vacio }: { items: ItemPendiente[]; hecha?: boolean; vacio: string }) {
  if (!items.length)
    return (
      <p className="mt-6 rounded-2xl border border-black/5 bg-white px-5 py-10 text-center text-[14px] text-carbon/60">{vacio}</p>
    );
  return (
    <ul className="mt-4 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white">
      {items.map((it) => {
        const cuerpo = (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5">
            <span className="w-[78px] shrink-0 text-[12px] text-carbon/60">{fecha(it.fecha)}</span>
            <span className="min-w-0 flex-1">
              <b className="text-[14px] text-carbon">{it.titulo}</b>
              {it.detalle && <span className="block truncate text-[12px] text-carbon/65">{it.detalle}</span>}
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
  );
}
