import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { funcionesYPersonas, puedeAsignarFunciones } from "../../../lib/gestionFunciones";
import { Funciones } from "./Funciones";

export const dynamic = "force-dynamic";

// ASIGNAR FUNCIONES A PERSONAS (Monica, 14-oct-2026): una lista de personas, una
// de funciones, y a cada funcion una o mas personas, "para que esto sea facil".
// La toca la funcion de direccion. Quitar no borra: cierra con fecha.

export default async function PaginaFunciones() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/funciones");
  if (!puedeAsignarFunciones(yo)) redirect("/gestiones");
  const { personas, funciones } = await funcionesYPersonas();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <h1 className="mt-3 border-b border-black/10 pb-4 text-3xl font-bold text-carbon sm:text-4xl">Asignar funciones a personas</h1>
        <Funciones personas={personas} funciones={funciones} />
      </main>
    </div>
  );
}
