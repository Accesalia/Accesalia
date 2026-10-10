import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { manias, municipiosCatastro, type Mania } from "../../../lib/manias";
import { bonito } from "../../../lib/direccionNombre";
import { Lista } from "./Lista";
import { Anadir, type EntidadConocida } from "./Anadir";

export const dynamic = "force-dynamic";

// MANIAS DETECTADAS (Monica, 10-oct-2026). La tabla manias_organismos: lo que
// cada ayuntamiento, junta, ECU o tecnico pide o hace a su manera, sacado de
// las notas de las fichas. Arriba el buscador por palabras (Lista.tsx); debajo,
// filtros por municipio, entidad y persona: todo en el navegador, combinado.
//
// LA FECHA MANDA: "una mania de un ayuntamiento de hace 5 años puede no ser tan
// relevante como una del mes pasado, y puede incluso contradecirla". Por eso
// van de la mas reciente a la mas antigua y cada una dice cuanto hace.
// La cita literal de la nota va a la vista, debajo de la mania: es la prueba.
//
// ALCANCE (Monica, 10-oct-2026): solo manias que afectan a la EJECUCION
// TECNICA, de organismos y sus tecnicos. Las de administradores de fincas van
// aparte: son otro mundo.


function contar(lista: Mania[], campo: (m: Mania) => string | null) {
  const n = new Map<string, number>();
  for (const m of lista) {
    const v = campo(m);
    if (v) n.set(v, (n.get(v) ?? 0) + 1);
  }
  return Array.from(n, ([valor, k]) => ({ valor, n: k })).sort((a, b) => a.valor.localeCompare(b.valor, "es"));
}

export default async function Manias() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/manias");
  const [crudas, nombresMunicipio] = await Promise.all([manias(), municipiosCatastro()]);
  const todas = crudas.map((m) => ({ ...m, municipio: m.municipio ? bonito(m.municipio) : null }));

  // Para el alta: cada entidad con su municipio, si siempre es el mismo y es de
  // un sitio (un ayuntamiento, una junta). Una ECU trabaja en muchos: ninguno.
  const suyo = new Map<string, Set<string>>();
  for (const m of crudas) if (m.entidad) suyo.set(m.entidad, (suyo.get(m.entidad) ?? new Set()).add(m.municipio ?? ""));
  const entidades: EntidadConocida[] = Array.from(suyo, ([nombre, ms]) => ({
    nombre,
    municipio: ms.size === 1 && /^(Ayuntamiento|Junta) de /.test(nombre) ? [...ms][0] || null : null,
  })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));


  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6">
        <Link href="/referencia" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Documentación de referencia
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Manías detectadas</h1>
        <p className="mt-1 max-w-[70ch] text-carbon/55">
          Lo que cada ayuntamiento, junta, ECU o técnico pide o hace a su manera, sacado de las notas de las fichas.
          Las más recientes, arriba: una manía antigua puede haber cambiado.
        </p>

        <Anadir
          entidades={entidades}
          municipios={nombresMunicipio.map((n) => ({ nombre: n, bonito: bonito(n) }))}
          tecnicos={contar(todas, (m) => m.tecnico).map((t) => t.valor)}
        />

        <Lista manias={todas} />
      </main>
    </div>
  );
}
