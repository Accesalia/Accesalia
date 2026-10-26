import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { letraMenu } from "../../components/letraMenu";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { listarComerciales } from "../../../lib/comercial";
import { resumenComercial } from "../../../lib/resumenComercial";
import { ListaResumen } from "../resumen/ListaResumen";

export const dynamic = "force-dynamic";

// LAS ALERTAS DEL COMERCIAL, CON LA ESTETICA NUEVA (Monica, 26-oct-2026: «lo mismo que la agenda: la reutilizamos tal
// cual»). Es la lista de siempre (ListaResumen: solo lo que pasa de plazo, agrupado por como se desbloquea), dentro del
// marco de la cartera: fondo grafito, el camino en verde, el saludo y el panel claro. Con los pasos de despues de la
// firma ya con su texto y su plazo, y el grupo nuevo «Validar la hoja firmada». Se entra por la tarjeta «Alertas» del
// submenu; la de siempre sigue en «Navegacion rapida». Quien ve que, como en /comercial.

const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

export default async function Pagina({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/alertas");
  const direccion = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const mio = await comercialDe(yo.id);
  if (!direccion && !mio) redirect(puedeEntrar(yo, "comercial") ? "/comercial" : "/menu");

  const comerciales = await listarComerciales();
  const elegido = direccion ? (comerciales.find((x) => x.id === c) ?? null) : (comerciales.find((x) => x.id === mio!.id) ?? null);
  const todos = direccion && !elegido;
  const { filas } = await resumenComercial(elegido?.id ?? null);
  const hoy = FECHA_LARGA.format(new Date());
  const nombre = todos ? null : elegido && direccion ? elegido.nombre : yo.nombre;

  return (
    <div className={`${letraMenu.variable} min-h-screen bg-[#2e3236]`}>
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1470px] px-6 pb-16 pt-4">
        <Salida href={`/comercial${c ? `?c=${c}` : ""}`}>← Accesos del área comercial</Salida>

        {/* UNA LINEA: donde estas, el saludo y (direccion) de quien es la agenda. */}
        <div className="mt-1 flex flex-wrap items-center gap-x-12 gap-y-3">
          <p className="flex items-center gap-2 font-[family-name:var(--letra-menu)] text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#a6dc7e]">
            <span className="h-2 w-2 rounded-full bg-[#a6dc7e]" />
            Área comercial <span className="text-[#f3f4f1]/45">›</span> Alertas
          </p>
          <p className="text-[14px] text-[#f3f4f1]/70">
            {nombre ? (
              <>
                Hola, <b className="text-[#f3f4f1]">{nombre}</b>.{" "}
              </>
            ) : (
              "Todos los comerciales. "
            )}
            {hoy.charAt(0).toUpperCase() + hoy.slice(1)}.
          </p>
          {direccion && (
            <div className="ml-auto flex flex-wrap gap-1.5">
              {[{ id: null as string | null, nombre: "Todos" }, ...comerciales].map((m) => (
                <Link
                  key={m.id ?? "todos"}
                  href={`/comercial/alertas${m.id ? `?c=${m.id}` : ""}`}
                  className={
                    "rounded-full border px-3.5 py-1.5 text-sm transition " +
                    (m.id === (elegido?.id ?? null) ? "border-lima bg-lima font-semibold text-carbon" : "border-white/20 text-[#f3f4f1]/75 hover:border-white/50")
                  }
                >
                  {m.nombre}
                </Link>
              ))}
            </div>
          )}
        </div>

        <section className="mt-6 w-full overflow-hidden rounded-2xl border border-black/5 bg-white px-5 pb-5 pt-1 shadow-[0_2px_4px_rgba(0,0,0,.18),0_18px_36px_-18px_rgba(0,0,0,.6)]">
          <ListaResumen filas={filas} />
        </section>
      </main>
    </div>
  );
}
