import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { interaccionesRecientes, ORIGEN_LABEL, TIPO_EVENTO_LABEL } from "../../../lib/comercial";

export const dynamic = "force-dynamic";

function fecha(v: string | null): string {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export default async function Diario({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const recientes = await interaccionesRecientes(c, 200);
  const suf = c ? `?c=${c}` : "";

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[820px] px-6 py-8">
        <Link href={`/comercial${suf}`} className="text-sm text-carbon/50 hover:text-carbon">← Área comercial</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-carbon"><span className="text-lima-dark">◇</span> Diario de contactos</h1>
            <p className="mt-1 text-carbon/55">{recientes.length} contacto{recientes.length === 1 ? "" : "s"}, del más reciente al más antiguo.</p>
          </div>
          <Link href={`/comercial/contacto${suf}`} className="rounded-full bg-lima px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">🎤 Grabar</Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          {recientes.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-carbon/40">Aún no hay contactos. Empieza dictando uno.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {recientes.map((i) => (
                <li key={i.id} className="transition hover:bg-black/[0.015]">
                  <Link href={`/comercial/interaccion/${i.id}${suf}`} className="block px-5 py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-carbon/50">
                      <span className="font-semibold text-carbon/70">{fecha(i.fecha_evento) || fecha(i.creado_en.slice(0, 10))}</span>
                      <span className="rounded-full bg-black/5 px-2 py-0.5 font-semibold">{TIPO_EVENTO_LABEL[i.tipo_evento] ?? i.tipo_evento}</span>
                      <span>{ORIGEN_LABEL[i.origen] ?? i.origen}</span>
                      {i.administradores?.nombre && <span className="text-lima-dark">· {i.administradores.nombre}{i.administradores.empresa ? ` (${i.administradores.empresa})` : ""}</span>}
                      {i.requiere_humano && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">revisar</span>}
                      {i.comerciales?.nombre && !c && <span className="text-carbon/40">· {i.comerciales.nombre}</span>}
                    </div>
                    {i.transcripcion && <p className="mt-1 line-clamp-2 text-sm text-carbon/75">{i.transcripcion}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
