import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { listarComerciales, nombreComercial } from "../../../lib/comercial";
import { proyectosDeComercial, ESTADO_PROYECTO, type ProyectoComercialFila } from "../../../lib/proyecto";

export const dynamic = "force-dynamic";

function fecha(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// Agrupacion por ESTADO de produccion (decision de la propietaria). "En curso" =
// todo lo vivo que no esta ni terminado ni descartado; "Terminados" = listo;
// "No proceden" = servicios sin pipeline (discretos, al final).
const GRUPOS: { titulo: string; estados: string[]; tenue?: boolean }[] = [
  { titulo: "En curso", estados: ["no_asignado", "ea_listo", "en_curso", "en_pausa"] },
  { titulo: "Terminados", estados: ["listo"] },
  { titulo: "No proceden", estados: ["no_procede"], tenue: true },
];

function Fila({ p }: { p: ProyectoComercialFila }) {
  const badge = ESTADO_PROYECTO[p.estado] ?? { label: p.estado, clase: "bg-black/5 text-carbon/50" };
  const destino = p.comunidadId ? `/comunidades/${p.comunidadId}/comercial` : "#";
  return (
    <Link href={destino} className="block rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:border-lima hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-carbon">{p.comunidadNombre}</div>
          {p.municipio && <div className="truncate text-xs text-carbon/50">{p.municipio}</div>}
          <div className="mt-1 flex flex-wrap gap-1">
            {p.tipos.map((t) => (
              <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-carbon/60">{t}</span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.clase}`}>{badge.label}</span>
          <div className="mt-1 text-[11px] text-carbon/45">Contratado: <b className="text-carbon/60">{fecha(p.fechaContratado)}</b></div>
          {p.pagador && <div className="text-[11px] text-carbon/40">{p.pagador}</div>}
        </div>
      </div>
    </Link>
  );
}

export default async function ProyectosDelComercial({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const comerciales = await listarComerciales();
  const yo = comerciales.find((x) => x.id === c) ?? null;
  const proyectos = c ? await proyectosDeComercial(c) : [];

  const grupos = GRUPOS.map((g) => ({
    ...g,
    filas: proyectos.filter((p) => g.estados.includes(p.estado)),
  })).filter((g) => g.filas.length > 0);

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-8">
        <Link href={`/comercial${c ? `?c=${c}` : ""}`} className="inline-flex items-center gap-1 text-sm font-semibold text-carbon/55 transition hover:text-carbon">← Área comercial</Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-carbon sm:text-3xl"><span className="text-lima-dark">📊</span> Mis proyectos contratados</h1>
            <p className="mt-1 text-carbon/55">{yo ? <>Los que lleva <b>{nombreComercial(yo)}</b> ({proyectos.length}).</> : "Elige un comercial para ver su cartera de proyectos."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {comerciales.map((m) => (
              <Link key={m.id} href={`/comercial/proyectos?c=${m.id}`} className={`rounded-full border px-3 py-1 text-sm ${c === m.id ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/60 hover:border-lima"}`}>{m.nombre}</Link>
            ))}
          </div>
        </div>

        {!c ? (
          <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white px-5 py-12 text-center text-sm text-carbon/45">
            Elige un comercial arriba para ver sus proyectos.
          </div>
        ) : proyectos.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white px-5 py-12 text-center text-sm text-carbon/45">
            {nombreComercial(yo)} no tiene proyectos asignados.
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {grupos.map((g) => (
              <section key={g.titulo}>
                <h2 className={`text-xs font-semibold uppercase tracking-wide ${g.tenue ? "text-carbon/25" : "text-carbon/35"}`}>{g.titulo} ({g.filas.length})</h2>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {g.filas.map((p) => <Fila key={p.proyectoId} p={p} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
