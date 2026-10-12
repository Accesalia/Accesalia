import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { gobiernaPlantillas, plantillasPara, puedeVerPlantillas } from "../../../lib/plantillasCorreo";
import { Salida } from "../../components/Salida";

export const dynamic = "force-dynamic";

// PLANTILLAS DE MAIL: VER, CREAR Y RETOCAR (Monica, 12-oct-2026). "Una simple
// tabla que ponga para que es - ver; y dentro de ver, editar. Y arriba un boton
// de crear una nueva". Primero las generales, luego las personales.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });

export default async function Plantillas() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/plantillas");
  if (!puedeVerPlantillas(yo)) redirect("/menu");
  const todas = await plantillasPara(yo);
  const generales = todas.filter((p) => !p.propietario_id);
  const personales = todas.filter((p) => p.propietario_id);
  const deTodos = gobiernaPlantillas(yo);

  const tabla = (lista: typeof todas, conDueño: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-black/10 text-[11px] font-bold uppercase tracking-[0.06em] text-carbon/65">
            <th className="px-4 py-2.5">Para qué es</th>
            <th className="px-4 py-2.5">Asunto</th>
            {conDueño && <th className="px-4 py-2.5">De quién</th>}
            <th className="px-4 py-2.5">Retocada</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-2.5 font-semibold text-carbon">{p.nombre}</td>
              <td className="px-4 py-2.5 text-carbon/75">{p.asunto}</td>
              {conDueño && <td className="px-4 py-2.5 text-carbon/75">{p.propietario ? [p.propietario.nombre, p.propietario.apellidos].filter(Boolean).join(" ") : "—"}</td>}
              <td className="whitespace-nowrap px-4 py-2.5 text-carbon/65">
                {FECHA.format(new Date(p.actualizado_en))}
                {p.retoco ? ` · ${p.retoco.nombre}` : ""}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Link href={`/comercial/plantillas/${p.id}`} className="font-semibold text-lima-dark hover:underline">
                  ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/comercial">
          ← Accesos del área comercial
        </Salida>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-carbon">Plantillas de mail</h1>
            <p className="mt-1 text-carbon/65">Los textos con los que se escribe a las comunidades desde la app.</p>
          </div>
          <Link href="/comercial/plantillas/nueva" className="rounded-lg bg-lima px-5 py-2.5 text-sm font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white">
            + Crear una nueva
          </Link>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <h2 className="px-4 pt-3.5 text-sm font-bold uppercase tracking-wider text-carbon/70">Generales · para todos</h2>
          {generales.length ? tabla(generales, false) : <p className="px-4 py-6 text-carbon/65">Todavía no hay ninguna general.</p>}
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <h2 className="px-4 pt-3.5 text-sm font-bold uppercase tracking-wider text-carbon/70">
            {deTodos ? "Personales · de cada uno" : "Personales · solo tuyas"}
          </h2>
          {personales.length ? tabla(personales, deTodos) : <p className="px-4 py-6 text-carbon/65">Todavía no hay ninguna personal.</p>}
        </section>
      </main>
    </div>
  );
}
