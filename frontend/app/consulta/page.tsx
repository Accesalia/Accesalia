import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { letraMenu } from "../components/letraMenu";
import { puedeEntrar, quienSoy } from "../../lib/sesion";
import { listasBuscar } from "../../lib/buscarYComprobar";
import { BuscarYComprobar } from "./BuscarYComprobar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// BUSCAR Y COMPROBAR (Monica, 27-oct-2026; maqueta validada docs/figma/buscar-y-comprobar.html): sustituye al
// buscador de antes. Solo buscador, por INTENCION: «Quiero buscar» (una lista, a su ficha) y «Quiero comprobar si ya
// existe» (una respuesta, o el boton de darlo de alta). Los listados de opps y de administradores ya no salen aqui
// (estan en la cartera y en las abiertas del area comercial). Transversal: cualquiera de la casa.

const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

export default async function Pagina() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/consulta");
  const listas = await listasBuscar();
  const hoy = FECHA_LARGA.format(new Date());

  return (
    <div className={`${letraMenu.variable} min-h-screen bg-[#2e3236]`}>
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1470px] px-4 pb-16 pt-4 sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <div className="mt-1 flex flex-wrap items-center gap-x-12 gap-y-2">
          <p className="flex items-center gap-2 font-[family-name:var(--letra-menu)] text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#a6dc7e]">
            <span className="h-2 w-2 rounded-full bg-[#a6dc7e]" />
            Buscar y comprobar
          </p>
          <p className="text-[14px] text-[#f3f4f1]/70">
            Hola, <b className="text-[#f3f4f1]">{yo.nombre}</b>. {hoy.charAt(0).toUpperCase() + hoy.slice(1)}.
          </p>
        </div>
        <BuscarYComprobar listas={listas} altaAdmin={puedeEntrar(yo, "administracion", "trabajar")} />
      </main>
    </div>
  );
}
