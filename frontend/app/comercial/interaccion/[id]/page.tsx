import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { entradaPorId } from "../../../../lib/entradaDiario";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

export const dynamic = "force-dynamic";

// LA FICHA DE UNA ENTRADA DEL DIARIO.
//
// Existia el enlace pero no la pantalla: cada entrada del cuadro apuntaba aqui y
// daba un 404 (encontrado el 28-sep-2026, al montar el formulario de grabar).
// Es una pantalla de LEER: lo que se apunto, cuando, con quien y de que. Sin
// botones de tocar nada, que eso todavia no esta hablado.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });

export default async function FichaEntrada({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/interaccion/" + id);
  if (!puedeEntrar(yo, "comercial")) redirect("/menu");

  const e = await entradaPorId(id);
  if (!e) notFound();

  const dato = (rotulo: string, valor: React.ReactNode) => (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-carbon/50">{rotulo}</div>
      <div className="mt-0.5 text-[14px] text-carbon">{valor}</div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[860px] px-6 pb-16 pt-5">
        <Link href="/comercial" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Área comercial
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-bold leading-tight text-carbon">Entrada del diario</h1>
            <p className="mt-1.5 text-[13px] text-carbon/60">
              {FECHA.format(new Date(e.fecha + "T00:00:00"))} · {e.comoFue}
              {e.autor && <> · la escribió {e.autor}</>}
            </p>
          </div>
          {e.revisar && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
              revisar
            </span>
          )}
        </div>

        {/* Lo que se conto, tal cual se apunto. */}
        <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-carbon">
            {e.texto || <span className="text-carbon/40">Sin texto.</span>}
          </p>
        </section>

        <section className="mt-4 grid gap-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:grid-cols-2">
          {dato("De qué oportunidad", e.oportunidadId && e.oportunidad
            ? <Link href={`/comercial/ficha/${e.oportunidadId}`} className="font-semibold text-lima-dark hover:underline">{e.oportunidad}</Link>
            : <span className="text-carbon/40">de ninguna en concreto</span>)}
          {dato("Con quién", e.con
            ? <>{e.con}{e.conDonde && <span className="text-carbon/55"> · {e.conDonde}</span>}</>
            : <span className="text-carbon/40">con nadie en concreto</span>)}
          {dato("Comercial", e.comercial ?? <span className="text-carbon/40">sin comercial</span>)}
          {dato("Grabada", new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(e.creadoEn)))}
          {e.motivo && dato("Por qué hay que revisarla", e.motivo)}
        </section>
      </main>
    </div>
  );
}
