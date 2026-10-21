import Link from "next/link";
import { ICONOS, Trazo, type Icono } from "../components/Iconos";

// LA TARJETA VELADA DEL MENU (Monica, 21-oct-2026): "grafito y colores vivos me
// ha FLIPADO". Solo para el menu principal: los demas menus de botones siguen con
// la de ../components/Accesos. El color ya no es de cada boton sino de su GRUPO
// (cuatro en vez de ocho, para que no parezca confeti): un velo de ese color que
// se funde hacia el blanco y el icono en un circulo de color solido. Maqueta:
// https://claude.ai/artifact/EmRehB6VpiConqcHozFHzS (version D, fondo grafito).
// Los submenus llevan la otra pieza, ../components/Submenu (tarjeta oscura).

/** Los colores vivos de cada grupo: el solido (icono), el velo y el rotulo sobre el grafito. */
export const GRUPOS = {
  trabajo: { nombre: "Trabajo del día", solido: "#3f8a1c", velo: "#d3ecbf", rotulo: "#a6dc7e" },
  dinero: { nombre: "Dinero", solido: "#d4860b", velo: "#fbdfa6", rotulo: "#f3c46a" },
  direccion: { nombre: "Dirección", solido: "#6a4fc4", velo: "#ddd2f6", rotulo: "#c3b3f2" },
  todos: { nombre: "Para todos", solido: "#2b6cb3", velo: "#cfe1f6", rotulo: "#9cc4ee" },
} as const;
export type Grupo = keyof typeof GRUPOS;
export type { Icono };

/** El rotulo de un grupo: su nombre en su color y una raya fina hasta el final. */
export function RotuloGrupo({ grupo }: { grupo: Grupo }) {
  const g = GRUPOS[grupo];
  return (
    <h2
      className="mb-2.5 flex items-center gap-3 font-[family-name:var(--letra-menu)] text-[11.5px] font-bold uppercase tracking-[0.1em]"
      style={{ color: g.rotulo }}
    >
      {g.nombre}
      <span className="h-px flex-1" style={{ background: g.rotulo, opacity: 0.35 }} />
    </h2>
  );
}

/** Una tarjeta. Sin `href`, sale apagada con «Próximamente». */
export function TarjetaVelada({
  nombre,
  desc,
  href,
  grupo,
  icono,
  insignia,
}: {
  nombre: string;
  desc: string;
  href: string | null;
  grupo: Grupo;
  icono: Icono;
  /** Arriba a la derecha: lo que hay esperando, para no tener que entrar. */
  insignia?: React.ReactNode;
}) {
  const g = GRUPOS[grupo];
  const cuerpo = (
    <>
      <span className="flex items-center gap-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white"
          style={{ background: g.solido, boxShadow: `0 3px 8px -3px ${g.solido}` }}
        >
          <Trazo className="h-[15px] w-[15px]">{ICONOS[icono]}</Trazo>
        </span>
        <h3 className="min-w-0 flex-1 text-balance font-[family-name:var(--letra-menu)] text-[14.5px] font-bold leading-snug tracking-[-0.01em] text-carbon">
          {nombre}
        </h3>
        {href ? (
          insignia
        ) : (
          <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wide text-carbon/60">Próximamente</span>
        )}
      </span>
      <p className="mt-2 pr-4 text-[12.5px] leading-[1.4] text-carbon/70">{desc}</p>
    </>
  );
  // 21-oct (tarde): Monica la ve mejor al 80 %: mas pequeña, mas alargada (icono y titulo en una linea, como en el
  // submenu, para que los dos niveles se parezcan mas) y la explicacion en menos lineas.
  const forma = "relative flex flex-col rounded-2xl px-4 pb-3.5 pt-3.5";
  const velo = { background: `linear-gradient(155deg, ${g.velo} 0%, ${g.velo} 12%, #ffffff 72%)` };
  if (!href)
    return (
      <div className={`${forma} opacity-50`} style={velo}>
        {cuerpo}
      </div>
    );
  return (
    <Link
      href={href}
      style={velo}
      className={`${forma} group shadow-[0_2px_4px_rgba(0,0,0,.18),0_14px_30px_-14px_rgba(0,0,0,.5)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(0,0,0,.2),0_22px_40px_-14px_rgba(0,0,0,.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lima motion-reduce:transition-none`}
    >
      {cuerpo}
      <span
        className="absolute bottom-3 right-3.5 -translate-x-1.5 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
        style={{ color: g.solido }}
      >
        <Trazo className="h-[15px] w-[15px]">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </Trazo>
      </span>
    </Link>
  );
}
