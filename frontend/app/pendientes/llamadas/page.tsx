import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { misPendientes, tarjetasQueVeo } from "../../../lib/misPendientes";
import { quienSoy } from "../../../lib/sesion";
import { ListaPendiente } from "../Lista";

export const dynamic = "force-dynamic";

// LLAMADAS POR COLOCAR, la lista de su tarjeta de Pendientes (Monica,
// 10-oct-2026). La ve quien coloca las llamadas -hoy la secretaria comercial- y
// direccion. "Hecha" la saca de la lista.

export default async function LlamadasPorColocar() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/llamadas");
  if (!tarjetasQueVeo(yo).llamadas) redirect("/pendientes");
  const { llamadas } = await misPendientes(yo);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Link href="/pendientes" className="text-sm font-semibold text-carbon/65 transition hover:text-carbon">
          ← Pendientes
        </Link>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Llamadas por colocar · {llamadas.length}</h1>
        <p className="mt-1 text-[13px] text-carbon/70">
          Cuando lo que se derivaba de la llamada esté gestionado, márcala como hecha.
        </p>
        <ListaPendiente items={llamadas} hecha vacio="No queda ninguna llamada por colocar." />
      </main>
    </div>
  );
}
