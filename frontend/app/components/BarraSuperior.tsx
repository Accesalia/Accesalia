import Link from "next/link";
import Image from "next/image";

// Cabecera global: logo Accesalia (izq) + boton MENU (der) -> navegador del ERP.
export function BarraSuperior() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-carbon px-6 py-3 text-white">
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/logotipo.jpg"
          alt="Accesalia"
          width={150}
          height={40}
          priority
          className="h-9 w-auto rounded-sm bg-white/95 px-2 py-1"
        />
        <span className="hidden text-sm font-medium tracking-wide text-white/50 sm:inline">
          ERP · Subvenciones
        </span>
      </Link>

      <Link
        href="/menu"
        className="inline-flex items-center gap-2 rounded-full bg-lima px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        MENÚ
      </Link>
    </header>
  );
}
