import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { RejillaAccesos, TarjetaAcceso } from "../components/Accesos";
import { quienSoy } from "../../lib/sesion";

export const dynamic = "force-dynamic";

// NEGOCIO (Monica, 12-oct-2026): solo Daniel y Monica. De momento un boton,
// Trabajo contratado; aqui iran los demas cuadros de seguimiento del negocio.

export default async function Negocio() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/negocio");
  if (!yo.veTodo) redirect("/menu");
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon sm:text-4xl">Negocio</h1>
        <p className="mt-1 text-carbon/65">Cómo va el negocio, entre las fechas que elijas. Solo dirección.</p>
        <RejillaAccesos className="mt-8">
          <TarjetaAcceso
            nombre="Trabajo contratado"
            desc="Oportunidades abiertas y ganadas, importes firmados, % de éxito y administradores nuevos, por comercial; y cada dirección con lo contratado"
            href="/negocio/trabajo-contratado"
            color="verde"
          />
          {/* La ficha financiera de una direccion (Monica, 17-oct-2026): su ficha de 2025, con datos vivos. */}
          <TarjetaAcceso
            nombre="Ficha financiera"
            desc="Una dirección en una hoja: lo contratado, comisiones, subvenciones, financiación, CAES, por dónde va el cobro y el resumen; con PDF"
            href="/ficha-financiera"
            color="verde"
          />
          {/* Historico facturado (Monica, 21-oct-2026): facturado, gastos y resultado por mes y año, por empresa y juntas. */}
          <TarjetaAcceso
            nombre="Histórico facturado"
            desc="Lo facturado por mes y año, por Accesalia, por Daniel y las dos juntas (sin duplicar lo de casa); los gastos del banco y el resultado"
            href="/negocio/historico"
            color="ambar"
          />
        </RejillaAccesos>
      </main>
    </div>
  );
}
