import Link from "next/link";

// LA TARJETA VELADA DEL MENU (Monica, 21-oct-2026): "grafito y colores vivos me
// ha FLIPADO". Solo para el menu principal: los demas menus de botones siguen con
// la de ../components/Accesos. El color ya no es de cada boton sino de su GRUPO
// (cuatro en vez de ocho, para que no parezca confeti): un velo de ese color que
// se funde hacia el blanco y el icono en un circulo de color solido. Maqueta:
// https://claude.ai/artifact/EmRehB6VpiConqcHozFHzS (version D, fondo grafito).

/** Los colores vivos de cada grupo: el solido (icono), el velo y el rotulo sobre el grafito. */
export const GRUPOS = {
  trabajo: { nombre: "Trabajo del día", solido: "#3f8a1c", velo: "#d3ecbf", rotulo: "#a6dc7e" },
  dinero: { nombre: "Dinero", solido: "#d4860b", velo: "#fbdfa6", rotulo: "#f3c46a" },
  direccion: { nombre: "Dirección", solido: "#6a4fc4", velo: "#ddd2f6", rotulo: "#c3b3f2" },
  todos: { nombre: "Para todos", solido: "#2b6cb3", velo: "#cfe1f6", rotulo: "#9cc4ee" },
} as const;
export type Grupo = keyof typeof GRUPOS;

/** Los iconos, trazos de 24x24. */
const ICONOS = {
  comercial: <><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>,
  administracion: <><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" /></>,
  euro: <><path d="M17 6a7 7 0 1 0 0 12" /><path d="M4 10h9M4 14h9" /></>,
  hoja: <><path d="M12 3c5 0 8 3 8 8-5 0-8-3-8-8z" /><path d="M12 21v-10" /><path d="M12 14c-4 0-7-2-7-6 4 0 7 2 7 6" /></>,
  grafica: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  lupa: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>,
  libro: <><path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" /><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" /></>,
  persona: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  casco: <><path d="M3 17h18" /><path d="M5 17a7 7 0 0 1 14 0" /><path d="M12 6v4" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
  radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 12l6-6" /></>,
  escaner: <><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3" /><path d="M7 12h10" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  nube: <path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8z" />,
  plantilla: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  firma: <><path d="M3 21h18" /><path d="M14.5 4.5l3 3L8 17H5v-3z" /></>,
  ficha: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 17v-3M12 17v-6M16 17v-4" /></>,
  historico: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></>,
} as const;
export type Icono = keyof typeof ICONOS;

function Trazo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

/** El rotulo de un grupo: su nombre en su color y una raya fina hasta el final. */
export function RotuloGrupo({ grupo }: { grupo: Grupo }) {
  const g = GRUPOS[grupo];
  return (
    <h2
      className="mb-3 flex items-center gap-3 font-[family-name:var(--letra-menu)] text-[12.5px] font-bold uppercase tracking-[0.1em]"
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
      <span
        className="grid h-10 w-10 place-items-center rounded-full text-white"
        style={{ background: g.solido, boxShadow: `0 4px 10px -4px ${g.solido}` }}
      >
        <Trazo className="h-[18px] w-[18px]">{ICONOS[icono]}</Trazo>
      </span>
      <div className="absolute right-[18px] top-[18px]">
        {href ? (
          insignia
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wide text-carbon/60">Próximamente</span>
        )}
      </div>
      <h3 className="mt-3.5 text-balance font-[family-name:var(--letra-menu)] text-[17.5px] font-bold leading-snug tracking-[-0.01em] text-carbon">
        {nombre}
      </h3>
      <p className="mt-2 pr-5 text-[13.5px] leading-[1.45] text-carbon/70">{desc}</p>
    </>
  );
  const forma = "relative flex min-h-[168px] flex-col rounded-[20px] p-5 pb-[18px]";
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
      className={`${forma} group shadow-[0_2px_4px_rgba(0,0,0,.18),0_14px_30px_-14px_rgba(0,0,0,.5)] transition hover:-translate-y-[3px] hover:shadow-[0_4px_8px_rgba(0,0,0,.2),0_22px_40px_-14px_rgba(0,0,0,.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lima motion-reduce:transition-none`}
    >
      {cuerpo}
      <span
        className="absolute bottom-3.5 right-4 -translate-x-1.5 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
        style={{ color: g.solido }}
      >
        <Trazo className="h-[18px] w-[18px]">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </Trazo>
      </span>
    </Link>
  );
}
