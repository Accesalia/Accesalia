import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Salida } from "../../../components/Salida";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { editaComision, leerFicha, opcionesFicha, veComision } from "../../../../lib/fichaAdministracion";
import { Ficha } from "./Ficha";
import { guardar } from "./acciones";

export const dynamic = "force-dynamic";

// LA FICHA DE UNA ADMINISTRACION DE FINCAS (Monica, 20-oct-2026). Ver
// lib/fichaAdministracion.ts. La rellenan tambien los comerciales (los de su
// cartera), asi que entra quien entra al area Administracion o al Comercial.

export default async function FichaAdministracionPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/administracion/administraciones/${id}`);
  if (!puedeEntrar(yo, "administracion") && !puedeEntrar(yo, "comercial")) redirect("/menu");

  const [ficha, opciones] = await Promise.all([leerFicha(id), opcionesFicha()]);
  if (!ficha) notFound();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-20 pt-5 sm:px-6">
        <Salida href="/administracion/administraciones">← Administraciones de fincas</Salida>
        <div className="mt-3">
          <Ficha
            ficha={ficha}
            opciones={opciones}
            accion={guardar.bind(null, id)}
            puedeEditar={puedeEntrar(yo, "administracion", "trabajar") || puedeEntrar(yo, "comercial", "trabajar")}
            comision={veComision(yo) ? (editaComision(yo) ? "edita" : "ve") : "no"}
          />
        </div>
      </main>
    </div>
  );
}
