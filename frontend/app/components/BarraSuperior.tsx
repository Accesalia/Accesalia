import Link from "next/link";
import Image from "next/image";
import { quienSoy } from "../../lib/sesion";
import { salir } from "../entrar/acciones";

// Cabecera de toda la app: logo, quien ha entrado (con su boton de salir) y el
// boton MENU. Montada de cero el 11-sep-2026: nada que lleve a pantallas que
// no esten revisadas (el buscador de comunidades de antes abria fichas
// archivadas, por eso no esta).
export async function BarraSuperior() {
  const yo = await quienSoy().catch(() => null);

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
