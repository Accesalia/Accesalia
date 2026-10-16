import Link from "next/link";

// LAS CUATRO AREAS, EN UNA FRANJA BAJO LA BARRA NEGRA (Monica, 16-oct-2026):
// Cobrar, Pagar, Prever y Asignar, con su contador. Antes iban dentro de la barra
// negra (maqueta del 12-oct), pero no cabian: la cuarta quedaba tapada por los
// botones de la barra. Ahora van en el cuerpo de la pagina, a lo ancho.

export type PestanaArea = { clave: string; titulo: string; href: string; cuenta?: number; aviso?: boolean };

export function AreasBarra({ areas, activa }: { areas: PestanaArea[]; activa: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-white px-6 py-3">
      {areas.map((a) => {
        const on = a.clave === activa;
        return (
          <Link
            key={a.clave}
            href={a.href}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-[14px] font-semibold transition ${on ? "bg-carbon text-white" : "border border-black/10 bg-white text-carbon/75 hover:border-carbon/40"}`}
          >
            {a.titulo}
            {a.cuenta ? (
              <span className={`rounded-full px-1.5 text-[11.5px] font-bold ${a.aviso ? "bg-alerta text-white" : on ? "bg-white text-carbon" : "bg-black/[.06] text-carbon"}`}>{a.cuenta}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
