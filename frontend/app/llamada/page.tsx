import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { quienSoy } from "../../lib/sesion";
import { AREAS_LLAMADA } from "../../lib/llamadas";
import { Formulario } from "./Formulario";
import { guardar, proponer } from "./acciones";

export const dynamic = "force-dynamic";

// LLAMADA (Monica, 8-oct-2026). Se abre desde el boton grande de la barra de
// arriba, este donde este. Entra TODO el personal: "es una pantalla para dejar
// cosas escritas, no lo vamos a capar".
//
// Cuatro campos y en este orden: que me dicen, quien llama, de que direccion y
// sobre que area. Lo primero se escribe sin hacer clic: el cursor ya esta ahi.
// Guardar no coloca la llamada en ningun sitio: nace "por colocar". Colocarla
// es otra pantalla, sin pensar todavia.

const HORA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });

export default async function Llamada({
  searchParams,
}: {
  searchParams: Promise<{ falta?: string; guardada?: string }>;
}) {
  const { falta, guardada } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/llamada");

  return (
    <div className="min-h-screen bg-form">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        {falta && (
          <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            No se ha guardado: falta lo que te han dicho.
          </p>
        )}
        {guardada && (
          <p className="mb-3 rounded-xl border border-lima/50 bg-lima-soft px-4 py-3 text-base text-lima-dark">
            Llamada guardada a las <b>{HORA.format(new Date(guardada))}</b>. Queda por colocar.
          </p>
        )}
        <Formulario
          key={guardada ?? "nueva"}
          yo={[yo.nombre, yo.apellidos].filter(Boolean).join(" ")}
          areas={[...AREAS_LLAMADA]}
          accion={guardar}
          proponer={proponer}
        />
      </main>
    </div>
  );
}
