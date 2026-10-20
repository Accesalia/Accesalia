import Image from "next/image";
import type { ReactNode } from "react";
import { accionSalir } from "./acciones";

// El marco del portal: sin la barra de la app de dentro. Logo, quien esta
// dentro y salir.
//
// `ancho`: la pagina de una comunidad, calcada del Sabadell (21-oct-2026):
// barra negra, fondo azul profundo (Daniel) y todo el ancho para las
// ventanitas. La puerta y la lista de comunidades siguen como estaban.
export function MarcoPortal({ email, ancho = false, children }: { email: string | null; ancho?: boolean; children: ReactNode }) {
  if (ancho)
    return (
      <div className="min-h-screen bg-[#12305a]">
        <header className="bg-[#202020]">
          <div className="flex h-[63px] items-center gap-4 px-4 text-white sm:px-6">
            <span className="text-[19px] font-extrabold tracking-wide">
              ACCES<span className="text-[#7ac943]">ALIA</span>
            </span>
            <span className="h-[34px] w-px bg-white/50" />
            <span className="text-[15px] font-bold">Documentación</span>
            {email && (
              <form action={accionSalir} className="ml-auto flex items-center gap-3 text-[12.5px] text-white/80">
                <span className="hidden sm:inline">{email}</span>
                <button type="submit" className="rounded-full border border-white/40 px-3 py-1 font-semibold hover:border-white">
                  Salir
                </button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[2000px] px-4 pb-16 pt-5 sm:px-6">{children}</main>
      </div>
    );
  return (
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-4 py-3">
          <Image src="/logotipo.jpg" alt="Accesalia" width={150} height={40} priority className="h-9 w-auto" />
          {email && (
            <form action={accionSalir} className="flex items-center gap-3 text-[13px] text-carbon/70">
              <span className="hidden sm:inline">{email}</span>
              <button type="submit" className="rounded-full border border-carbon/25 px-3 py-1 font-semibold hover:border-carbon">
                Salir
              </button>
            </form>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[900px] px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}
