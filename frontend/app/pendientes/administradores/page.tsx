import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { posiblesDe } from "../../../lib/misPendientes";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { ListaPendiente } from "../Lista";
import { Salida } from "../../components/Salida";

export const dynamic = "force-dynamic";

// ADMINISTRADORES POSIBLES, SIN CONSOLIDAR (Monica, 13-oct-2026). "Un admin
// solo ES de un comercial tras la primera hoja firmada." Hasta entonces es un
// posible de quien lo trajo, no de su cartera: esta lista es para insistirles
// hasta que den una direccion. Al firmarse su primera hoja, la base lo
// consolida solo y sale de aqui.

export default async function AdministradoresPosibles() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/administradores");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/pendientes");
  const posibles = await posiblesDe(yo);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Salida href="/pendientes">← Pendientes</Salida>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Administradores posibles, sin consolidar · {posibles.length}</h1>
        <p className="mt-1 max-w-[780px] text-[13px] text-carbon/70">
          Administradores que has traído y que todavía no tienen su primera hoja firmada. No son de tu cartera hasta
          entonces: insísteles hasta que te den una dirección. Cuando se firme su primera hoja, pasan solos a tu cartera.
        </p>
        <ListaPendiente items={posibles} vacio="No tienes ningún administrador sin consolidar." />
      </main>
    </div>
  );
}
