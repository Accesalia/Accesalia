import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { direccionesVistas } from "../../../lib/informeCostes";
import { Salida } from "../../components/Salida";

export const dynamic = "force-dynamic";

// DIRECCIONES VISTAS QUE NO LLEGARON A MAYORES (Monica, 12-oct-2026). El rastro
// de los informes emitidos "sin guardar": una lista plana, con fecha y HORA.
// "La hora es importante: si lo cruzamos con la agenda, podremos averiguar con
// quien estaba cuando lo hizo, y eso da pistas de que administrador puede estar
// detras." Direccion y supervision ven las de todos; un comercial, las suyas.

const DIA = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const eur = (n: number) => Math.round(n).toLocaleString("es-ES") + " €";

export default async function DireccionesVistas() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/direcciones-vistas");
  if (!yo.veTodo && !puedeEntrar(yo, "comercial")) redirect("/menu");
  const todas = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const filas = (await direccionesVistas()).filter((f) => todas || f.creado_por === yo.id);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/comercial">
          ← Accesos del área comercial
        </Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Direcciones vistas que no llegaron a mayores</h1>
        <p className="mt-1.5 max-w-[80ch] text-carbon/65">
          Los informes emitidos para una dirección que no es de ninguna oportunidad, con el día y la hora: cruzados con la
          agenda, dicen con quién se estaba en ese momento.
          {todas ? " Ves las de todos." : " Ves las tuyas."}
        </p>

        <section className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          {filas.length === 0 ? (
            <p className="px-5 py-10 text-center text-base text-carbon/65">Todavía no se ha emitido ningún informe sin oportunidad.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-black/10 text-[11px] font-bold uppercase tracking-[0.06em] text-carbon/65">
                    <th className="px-4 py-2.5">Cuándo</th>
                    <th className="px-4 py-2.5">Dirección</th>
                    <th className="px-4 py-2.5">Quién</th>
                    <th className="px-4 py-2.5">Qué se estimó</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id} className="border-b border-black/5 align-top last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {DIA.format(new Date(f.creado_en))} · <b>{HORA.format(new Date(f.creado_en))}</b>
                      </td>
                      <td className="px-4 py-2.5">
                        <b>{f.direccion}</b>
                        {f.datos.lugar && <div className="text-[12.5px] text-carbon/65">{f.datos.lugar}</div>}
                      </td>
                      <td className="px-4 py-2.5">{f.autor ? [f.autor.nombre, f.autor.apellidos].filter(Boolean).join(" ") : "—"}</td>
                      <td className="px-4 py-2.5">
                        {f.datos.obra}
                        {f.datos.precios && <div className="text-[12.5px] text-carbon/65">{eur(f.datos.precios.hoy)} con IVA</div>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={f.tipo === "estudio_ayudas" ? `/referencia/subvenciones/estudio/${f.id}` : `/referencia/estimacion/informe/${f.id}`}
                          className="font-semibold text-lima-dark hover:underline"
                        >
                          {f.tipo === "estudio_ayudas" ? "ver estudio" : "ver informe"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
