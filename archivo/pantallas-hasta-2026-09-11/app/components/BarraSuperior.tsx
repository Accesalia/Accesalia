import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { BuscadorComunidades } from "./BuscadorComunidades";
import { SelectorPerfil, type PersonaPerfil } from "./SelectorPerfil";
import { COOKIE_PERFIL } from "./perfilConstantes";
import { listarEquipo } from "../../lib/equipo";
import { quienSoy } from "../../lib/sesion";
import { loginObligatorio } from "../../lib/auth/servidor";
import { salir } from "../entrar/acciones";

// Cabecera global: logo + buscador rapido de comunidades + IDENTIDAD + boton
// MENU. La identidad es quien ha entrado de verdad (con su boton de salir). El
// desplegable "Viendo como" era el apaño de antes del login: solo queda
// mientras el login este apagado.
export async function BarraSuperior() {
  const [equipo, jar, yo] = await Promise.all([
    listarEquipo(true).catch(() => []),
    cookies(),
    quienSoy().catch(() => null),
  ]);
  const actualId = jar.get(COOKIE_PERFIL)?.value ?? null;
  const personas: PersonaPerfil[] = equipo.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    funcion: m.funciones[0]?.nombre ?? (m.es_arquitecto ? "Arquitecto/a" : null),
  }));

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-carbon text-white">
      <div className="flex items-center gap-4 px-6 py-3">
        <Link href="/menu" className="flex shrink-0 items-center gap-3">
          <Image
            src="/logotipo.jpg"
            alt="Accesalia"
            width={150}
            height={40}
            priority
            className="h-9 w-auto rounded-sm bg-white/95 px-2 py-1"
          />
        </Link>

        {/* Buscador rapido: escribe la direccion y abre la ficha */}
        <div className="flex flex-1 justify-center">
          <BuscadorComunidades />
        </div>

        {yo ? (
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-white/80">
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
        ) : (
          !loginObligatorio() && (
            // El apaño de antes del login: con quien entro, para ver que ve cada uno.
            <div className="hidden md:block">
              <SelectorPerfil personas={personas} actualId={actualId} />
            </div>
          )
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
