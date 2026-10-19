import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { loQueVendemos, type LineaVenta } from "../../../lib/loQueVendemos";
import { Salida } from "../../components/Salida";

export const dynamic = "force-dynamic";

// TIPOS DE PROYECTO Y SERVICIOS (Monica, 19-oct-2026): lo que vendemos, para
// consultarlo. Es lo mismo que sale en el buscador de "lo que les interesa" del
// alta de una opp; las dos listas, una al lado de la otra.

function Lista({ titulo, lineas, extra }: { titulo: string; lineas: LineaVenta[]; extra?: { titulo: string; lineas: LineaVenta[] } }) {
  const filas = (ls: LineaVenta[]) => (
    <ul className="mt-2">
      {ls.map((l) => (
        <li
          key={l.id}
          style={{ paddingLeft: `${l.nivel * 18}px` }}
          className={
            l.titulo
              ? "pt-3 text-[11.5px] font-bold uppercase tracking-wide text-carbon/45"
              : "border-b border-black/5 py-1.5 text-[15px] text-carbon last:border-b-0"
          }
        >
          {l.nombre}
        </li>
      ))}
    </ul>
  );
  return (
    <section className="w-fit min-w-[280px] rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm">
      <h2 className="text-[17px] font-bold text-carbon">{titulo}</h2>
      {filas(lineas)}
      {extra && extra.lineas.length > 0 && (
        <>
          <h3 className="mt-5 text-[13px] font-bold text-carbon/70">{extra.titulo}</h3>
          {filas(extra.lineas)}
        </>
      )}
    </section>
  );
}

export default async function TiposDeProyectoYServicios() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/tipos");
  const { proyectos, servicios, documentos } = await loQueVendemos();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6">
        <Salida href="/referencia">← Documentación de referencia</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Tipos de proyecto y servicios</h1>
        <p className="mt-1 text-carbon/55">Lo que vendemos: lo mismo que se elige en «lo que les interesa» al dar de alta una oportunidad.</p>

        <div className="mt-6 flex flex-wrap items-start gap-5">
          <Lista titulo="Tipos de proyecto" lineas={proyectos} />
          <Lista titulo="Tipos de servicio" lineas={servicios} extra={{ titulo: "Documentos técnicos", lineas: documentos }} />
        </div>
      </main>
    </div>
  );
}
