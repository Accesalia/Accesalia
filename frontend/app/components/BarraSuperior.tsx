import Link from "next/link";
import Image from "next/image";
import { quienSoy } from "../../lib/sesion";
import { salir } from "../entrar/acciones";
import { BotonLlamada } from "./postit/BotonLlamada";
import { cuantosPendientes } from "../../lib/misPendientes";

// Cabecera de toda la app: logo, el buscador, quien ha entrado (con su boton de
// salir) y el boton MENU. Montada de cero el 11-sep-2026.
//
// EL BUSCADOR VIVE AQUI (Monica, 12-sep-2026): "buscar una comunidad no deberia
// estar en fila con el resto de botones; aislado, en la fila de arriba y a la
// derecha, siempre en el mismo sitio para no estar buscandolo en cada pagina".
// Y YA BUSCA (7-oct-2026): lo escrito va a Consultar, que encuentra la
// direccion y lleva a la ficha de la comunidad.
export async function BarraSuperior() {
  const yo = await quienSoy().catch(() => null);
  // El numero del boton PENDIENTES. Si falla, 0: nunca tumba la barra.
  const pendientes = yo ? await cuantosPendientes(yo) : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-carbon text-white">
      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/menu" className="flex shrink-0 items-center">
          <Image
            src="/logotipo.jpg"
            alt="Accesalia"
            width={150}
            height={40}
            priority
            className="h-9 w-auto rounded-sm bg-white/95 px-2 py-1"
          />
        </Link>

        <div className="flex-1" />

        {yo && (
          <form
            action="/consulta"
            role="search"
            className="hidden items-center gap-2 rounded-full border border-white/25 bg-white/5 px-3.5 py-1.5 transition focus-within:border-lima md:flex"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-white/60">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input type="hidden" name="que" value="direccion" />
            <input
              name="q"
              aria-label="Buscar una comunidad"
              placeholder="Buscar una comunidad…"
              className="w-56 bg-transparent text-sm text-white outline-none placeholder:text-white/55"
            />
          </form>
        )}

        {yo && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/80 sm:inline">
              <span className="text-white/45">Hola, </span>
              <b className="font-semibold text-white">{yo.nombre}</b>
            </span>
            <form action={salir}>
              <button
                type="submit"
                className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/75 transition hover:border-lima hover:text-white"
              >
                Salir
              </button>
            </form>
          </div>
        )}

        {/* LLAMADA (Monica, 8-oct-2026): pone un postit delante, sin salir de
            la pantalla. El postit vive en el layout (components/postit). */}
        {yo && <BotonLlamada />}

        {/* PENDIENTES (8-oct-2026): junto a LLAMADA, con el numero de cosas a
            medias -notas, oportunidades, llamadas- y la pantalla que las junta. */}
        {yo && (
          <Link
            href="/pendientes"
            className={
              "inline-flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-base font-bold tracking-wide transition " +
              (pendientes > 0 ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" : "border-white/25 text-white/80 hover:border-lima")
            }
          >
            PENDIENTES
            <span
              className={
                "rounded-full px-2 py-0.5 text-[13px] font-extrabold " + (pendientes > 0 ? "bg-amber-900 text-white" : "bg-white/15 text-white/80")
              }
            >
              {pendientes}
            </span>
          </Link>
        )}

        <Link
          href="/menu"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lima px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">MENÚ</span>
        </Link>
      </div>
    </header>
  );
}
