import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { Manrope } from "next/font/google";
import { RejillaAccesos } from "../components/Accesos";
import { TarjetaVelada } from "../menu/TarjetaVelada";
import { quienSoy } from "../../lib/sesion";

export const dynamic = "force-dynamic";

// Con la estetica del menu (Monica, 21-oct-2026: "en linea con este"): grafito y
// la tarjeta velada, todas en el color de Direccion, que es su grupo en el menu.
const letraMenu = Manrope({ subsets: ["latin"], weight: ["700", "800"], variable: "--letra-menu" });

// NEGOCIO (Monica, 12-oct-2026): solo Daniel y Monica. De momento un boton,
// Trabajo contratado; aqui iran los demas cuadros de seguimiento del negocio.

export default async function Negocio() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/negocio");
  if (!yo.veTodo) redirect("/menu");
  return (
    <div className={`${letraMenu.variable} min-h-screen bg-[#2e3236]`}>
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <h1 className="mt-3 text-3xl font-bold text-[#f3f4f1] sm:text-4xl">Negocio</h1>
        <p className="mt-1 text-[#f3f4f1]/75">Cómo va el negocio, entre las fechas que elijas. Solo dirección.</p>
        <RejillaAccesos className="mt-8">
          <TarjetaVelada
            nombre="Trabajo contratado"
            desc="Oportunidades abiertas y ganadas, importes firmados, % de éxito y administradores nuevos, por comercial; y cada dirección con lo contratado"
            href="/negocio/trabajo-contratado"
            grupo="direccion"
            icono="firma"
          />
          {/* La ficha financiera de una direccion (Monica, 17-oct-2026): su ficha de 2025, con datos vivos. */}
          <TarjetaVelada
            nombre="Ficha financiera"
            desc="Una dirección en una hoja: lo contratado, comisiones, subvenciones, financiación, CAES, por dónde va el cobro y el resumen; con PDF"
            href="/ficha-financiera"
            grupo="direccion"
            icono="ficha"
          />
          {/* Historico facturado (Monica, 21-oct-2026): facturado, gastos y resultado por mes y año, por empresa y juntas. */}
          <TarjetaVelada
            nombre="Histórico facturado"
            desc="Lo facturado por mes y año, por Accesalia, por Daniel y las dos juntas (sin duplicar lo de casa); los gastos del banco y el resultado"
            href="/negocio/historico"
            grupo="direccion"
            icono="historico"
          />
        </RejillaAccesos>
      </main>
    </div>
  );
}
