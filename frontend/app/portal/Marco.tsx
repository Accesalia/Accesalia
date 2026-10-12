import Image from "next/image";
import type { ReactNode } from "react";
import { accionSalir } from "./acciones";

// El marco del portal: sin la barra de la app de dentro. Logo, quien esta
// dentro y salir.
export function MarcoPortal({ email, children }: { email: string | null; children: ReactNode }) {
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
