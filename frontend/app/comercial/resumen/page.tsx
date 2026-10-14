import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { listarComerciales } from "../../../lib/comercial";
import { resumenComercial } from "../../../lib/resumenComercial";
import { ListaResumen } from "./ListaResumen";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// RESUMEN DE COMO ESTAN LAS COSAS (Monica, 14-oct-2026). Las opps abiertas de un
// comercial, por lo que toca hacer: "una lista simple, al grano, sin detalles,
// solo los puntos realmente claves". Nada de tarjetas: una linea por opp.
//   opp (con municipio) · lo que pasa (construido con datos) · a quien llamar · grabar
// En cada seccion, arriba y en rojo, las que pasan el plazo de su fase.

export default async function Resumen({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/resumen");
  if (!yo.veTodo && !puedeEntrar(yo, "comercial")) redirect("/menu");
  const todos = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const [mio, comerciales] = await Promise.all([comercialDe(yo.id), todos ? listarComerciales() : Promise.resolve([])]);
  // Direccion entra viendo a quien elija; el comercial, siempre lo suyo.
  const elegido = todos ? (c === "todos" ? null : (comerciales.find((x) => x.id === c)?.id ?? mio?.id ?? null)) : (mio?.id ?? null);
  if (!todos && !elegido) redirect("/comercial");
  const { filas } = await resumenComercial(elegido);
  const alertas = filas.filter((f) => f.alerta).length;

  const pill = (activo: boolean) =>
    "rounded-full border px-3.5 py-1.5 text-sm transition " + (activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/70 hover:border-lima");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/comercial">← Accesos del área comercial</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Resumen de cómo están las cosas</h1>
        <p className="mt-1.5 text-carbon/65">
          {filas.length} opps abiertas · <b className="text-alerta">{alertas} han pasado el plazo de su fase</b>. Llama, y al colgar, graba lo que te han dicho.
        </p>

        {todos && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Link href="/comercial/resumen?c=todos" className={pill(!elegido)}>
              Todos
            </Link>
            {comerciales.map((m) => (
              <Link key={m.id} href={`/comercial/resumen?c=${m.id}`} className={pill(elegido === m.id)}>
                {m.nombre}
              </Link>
            ))}
          </div>
        )}

        <ListaResumen filas={filas} />
      </main>
    </div>
  );
}
