import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { opcionesEntrada } from "../../../lib/entradaDiario";
import { pendientesDe } from "../../../lib/pendientes";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { Colocar } from "./Colocar";

export const dynamic = "force-dynamic";

// MIS NOTAS PENDIENTES (Monica, 8-oct-2026).
//
// Las notas que se grabaron con una direccion que no estaba en la lista y se
// marcaron "revisar despues". Las coloca su propio comercial al llegar a la
// oficina: "ellos se lo guisan, ellos se lo comen". Si no se colocan, son
// justo lo que no queremos: notas huerfanas que nadie recupera.

export default async function Pendientes() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/pendientes");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");

  const [notas, opciones] = await Promise.all([pendientesDe(yo), opcionesEntrada()]);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1000px] px-6 pb-20 pt-5 text-sm">
        <Link href="/comercial" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Área comercial
        </Link>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Notas pendientes de colocar</h1>
        <p className="mt-1 max-w-[760px] text-[13px] text-carbon/65">
          Son notas grabadas con una dirección que no estaba en la lista. Puede que estuviera mal escrita, que no fuera
          de una dirección o que sea una oportunidad nueva. Colócalas: la nota pasa a su diario con su fecha, y sus fotos,
          a su sitio.
        </p>

        {notas.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-black/5 bg-white px-5 py-10 text-center text-[14px] text-carbon/55">
            No tienes ninguna nota pendiente. Todo está en su sitio.
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {notas.map((p) => (
              <Colocar key={p.id} p={p} oportunidades={opciones.oportunidades} personas={opciones.personas} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
