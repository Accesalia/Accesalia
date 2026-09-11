// Marca a una persona de la que aun no sabemos en que administracion trabaja.
//
// El dato vacio no se disimula: se ve en rojo y con una (i) que al pasar por
// encima (o al enfocarla con el dedo o el tabulador) explica que falta. Asi la
// laguna se convierte en algo que se puede arreglar de un vistazo, en vez de
// quedarse escondida para siempre.
//
// Sin JavaScript a proposito: es un Server Component y el cartelito sale con
// CSS, asi que no cuesta nada cargarlo en listas largas.

const AVISO = "Falta saber la administración de fincas";

export function SinAdministracion({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex items-center gap-1.5">
      <span className="text-red-600">{children}</span>
      <span
        tabIndex={0}
        role="img"
        aria-label={AVISO}
        title={AVISO}
        className="flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full
                   border border-red-500 text-[10px] font-bold italic leading-none text-red-600
                   outline-none focus:ring-2 focus:ring-red-300"
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden whitespace-nowrap
                   rounded-md bg-carbon px-2 py-1 text-xs font-normal text-white shadow-lg
                   group-hover:block group-focus-within:block"
      >
        {AVISO}
      </span>
    </span>
  );
}

/** El nombre de la persona, en rojo y con aviso si no sabemos su administracion. */
export function NombreConAdministracion(
  { nombre, empresa }: { nombre: string; empresa: string | null },
) {
  if (empresa) return <>{nombre}</>;
  return <SinAdministracion>{nombre}</SinAdministracion>;
}
