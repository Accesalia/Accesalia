import Link from "next/link";
import { BarraSuperior } from "./BarraSuperior";
import { Salida } from "./Salida";
import { ICONOS, Trazo, type Icono } from "./Iconos";
import { letraMenu } from "./letraMenu";
import { GRUPOS, type Grupo } from "../menu/TarjetaVelada";

// LOS SUBMENUS (Monica, 21-oct-2026): "la idea es que de un vistazo uno sepa a
// que nivel esta". Tres niveles:
//   1. el menu principal: grafito y tarjetas CLARAS veladas, color por grupo;
//   2. un submenu (esta pieza): el mismo grafito, tarjetas OSCURAS en indice, a
//      dos columnas y con aire a los lados, cada boton con su color; encima del
//      titulo, el grupo del menu del que se viene, en su color;
//   3. la pantalla de trabajo: el fondo claro (se repensara aparte).
// Maqueta: https://claude.ai/artifact/8E5rXb8SpJawFQy4zfEHac (version C).
//
// Muchas areas se convertiran en submenu (comercial, facturacion...): un
// submenu nuevo = PaginaSubmenu + IndiceSubmenu + una TarjetaIndice por boton.
// Los colores: dentro de un submenu, que no se repitan (hay ocho).

/** Ocho colores vivos: el solido (icono) y el claro (que se lee sobre lo oscuro). */
export const COLORES_VIVOS = {
  verde: { solido: "#3f8a1c", claro: "#a6dc7e" },
  azul: { solido: "#2b6cb3", claro: "#9cc4ee" },
  ambar: { solido: "#d4860b", claro: "#f3c46a" },
  frambuesa: { solido: "#c03a6b", claro: "#f29bbb" },
  turquesa: { solido: "#12867a", claro: "#7fd6cb" },
  teja: { solido: "#c2552b", claro: "#f2a782" },
  lila: { solido: "#6a4fc4", claro: "#c3b3f2" },
  bronce: { solido: "#9a7433", claro: "#d9b77a" },
} as const;
export type ColorVivo = keyof typeof COLORES_VIVOS;

/** El marco: barra, salida, el grupo del que se viene, titulo y subtitulo. */
export function PaginaSubmenu({
  grupo,
  titulo,
  subtitulo,
  salida = { href: "/menu", texto: "← Menú" },
  children,
}: {
  grupo: Grupo;
  titulo: string;
  subtitulo?: React.ReactNode;
  salida?: { href: string; texto: string };
  children: React.ReactNode;
}) {
  const g = GRUPOS[grupo];
  return (
    <div className={`${letraMenu.variable} min-h-screen bg-[#2e3236] text-[#f3f4f1]`}>
      <BarraSuperior />
      <main className="mx-auto max-w-[940px] px-4 pb-16 pt-6 sm:px-6">
        <Salida href={salida.href}>{salida.texto}</Salida>
        <p
          className="mt-4 flex items-center gap-2 font-[family-name:var(--letra-menu)] text-[12.5px] font-extrabold uppercase tracking-[0.12em]"
          style={{ color: g.rotulo }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: g.rotulo }} />
          {g.nombre}
        </p>
        <h1 className="mt-1.5 font-[family-name:var(--letra-menu)] text-[34px] font-extrabold tracking-[-0.02em] sm:text-[38px]">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-[#f3f4f1]/75">{subtitulo}</p>}
        {children}
      </main>
    </div>
  );
}

/** La rejilla del indice: dos columnas (una en el movil). */
export function IndiceSubmenu({ children, className = "mt-7" }: { children: React.ReactNode; className?: string }) {
  return <div className={"grid grid-cols-1 gap-x-[18px] gap-y-3.5 md:grid-cols-2 " + className}>{children}</div>;
}

/** Una tarjeta del indice. Sin `href`, apagada con su `etiqueta`. */
export function TarjetaIndice({
  nombre,
  desc,
  href,
  color,
  icono,
  insignia,
  pie,
  etiqueta = "Próximamente",
}: {
  nombre: string;
  desc: string;
  href: string | null;
  color: ColorVivo;
  icono: Icono;
  /** Arriba a la derecha: lo que hay esperando. */
  insignia?: React.ReactNode;
  /** Debajo de la explicacion: una cifra («1.228 en la app»). Sale en su color claro. */
  pie?: React.ReactNode;
  etiqueta?: string;
}) {
  const c = COLORES_VIVOS[color];
  const fondo = { background: `linear-gradient(90deg, ${c.solido}4d 0%, transparent 45%), #3a3e44` };
  const cuerpo = (
    <>
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"
        style={{ background: c.solido, boxShadow: `0 4px 10px -4px ${c.solido}` }}
      >
        <Trazo className="h-[18px] w-[18px]">{ICONOS[icono]}</Trazo>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="flex-1 font-[family-name:var(--letra-menu)] text-[16.5px] font-bold leading-snug tracking-[-0.01em]">{nombre}</span>
          {href ? insignia : <span className="pt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#f3f4f1]/55">{etiqueta}</span>}
        </span>
        <span className="mt-0.5 block text-[13px] leading-[1.4] text-[#f3f4f1]/72">{desc}</span>
        {pie && (
          <span className="mt-1 block text-[12.5px] font-semibold" style={{ color: c.claro }}>
            {pie}
          </span>
        )}
      </span>
    </>
  );
  const forma = "relative flex items-center gap-4 rounded-2xl border py-4 pl-4 pr-11";
  if (!href)
    return (
      <div className={`${forma} border-white/5 opacity-55`} style={fondo}>
        {cuerpo}
      </div>
    );
  return (
    <Link
      href={href}
      style={fondo}
      className={`${forma} group border-white/[0.08] shadow-[0_2px_4px_rgba(0,0,0,.18),0_14px_30px_-14px_rgba(0,0,0,.5)] transition hover:-translate-y-0.5 hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lima motion-reduce:transition-none`}
    >
      {cuerpo}
      <span
        className="absolute right-4 top-1/2 -translate-x-1.5 -translate-y-1/2 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
        style={{ color: c.claro }}
      >
        <Trazo className="h-[18px] w-[18px]">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </Trazo>
      </span>
    </Link>
  );
}
