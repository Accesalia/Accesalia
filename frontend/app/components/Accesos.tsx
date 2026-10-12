import Link from "next/link";

// LOS MENUS DE BOTONES DE TODA LA APP (Monica, 12-oct-2026). Antes cada pantalla
// de accesos (el menu, Administracion, Documentacion de referencia...) copiaba
// su tarjeta y su rejilla de dos columnas; en cuanto una juntaba unos cuantos
// accesos habia que hacer scroll, y en su pantalla de 27" quedaba todo suelto.
// Ahora es una pieza: CUATRO columnas y tarjetas mas altas, mas cuadraditas que
// rectangulares. El titulo puede ir en dos lineas y el subtitulo en cuatro.
// Un menu nuevo usa esto y no se inventa el suyo.

/** La rejilla: una columna en el movil, dos en tableta, cuatro en pantalla. */
export function RejillaAccesos({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 " + className}>{children}</div>;
}

const BORDE = { lima: "border-lima/40", ajeno: "border-ajeno/40" } as const;

/** CADA ACCESO CON SU COLOR (Monica, 12-oct-2026: "diferenciar los accesos por
 *  colores les ayudaria a todos"). Pasteles con su borde un punto mas oscuro;
 *  el texto sigue en carbon, que se lee igual sobre todos. El color va con el
 *  acceso, no con su posicion: se pone en la lista de cada menu y no cambia
 *  aunque se añadan o quiten otros. */
export const COLORES = {
  azul: "bg-[#e3ecf5] border-[#9db6cf]",
  verde: "bg-[#e2f1d6] border-[#a3cf84]",
  ambar: "bg-[#fcefd2] border-[#e0bd72]",
  arena: "bg-[#f2eadf] border-[#cbb594]",
  turquesa: "bg-[#ddf0ee] border-[#8cc6bf]",
  lila: "bg-[#ece7f6] border-[#b4a6d6]",
  rosa: "bg-[#f8e3e3] border-[#d9a3a3]",
  melocoton: "bg-[#fde6d8] border-[#e6ae8b]",
} as const;
export type ColorAcceso = keyof typeof COLORES;

/** Una tarjeta de acceso. Sin `href`, sale apagada con su `etiqueta` ("Próximamente"). */
export function TarjetaAcceso({
  nombre,
  desc,
  href,
  tono = "lima",
  color,
  etiqueta = "Próximamente",
  insignia,
  pie,
}: {
  nombre: string;
  desc: string;
  href: string | null;
  /** lima = las areas y lo nuestro; ajeno = las puertas por funcion. */
  tono?: keyof typeof BORDE;
  /** Su color propio. Sin el, blanca con el borde del `tono`. */
  color?: ColorAcceso;
  /** Lo que dice una tarjeta que aun no lleva a ningun sitio. */
  etiqueta?: string;
  /** Arriba a la derecha: lo que hay esperando, para no tener que entrar. */
  insignia?: React.ReactNode;
  /** Abajo del todo: una cifra o un aviso. */
  pie?: React.ReactNode;
}) {
  const cuerpo = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h2 className={"text-lg font-semibold leading-snug " + (href ? "text-carbon" : "text-carbon/55")}>{nombre}</h2>
        {!href ? (
          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/40">
            {etiqueta}
          </span>
        ) : (
          insignia
        )}
      </div>
      <p className={"mt-2 text-sm leading-snug " + (!href ? "text-carbon/40" : color ? "text-carbon/75" : "text-carbon/65")}>{desc}</p>
      {pie && <div className="mt-auto pt-3">{pie}</div>}
    </>
  );
  const forma = "flex min-h-[170px] flex-col rounded-2xl p-5";
  return href ? (
    <Link
      href={href}
      className={`${forma} border ${color ? COLORES[color] : `${BORDE[tono]} bg-white`} shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      {cuerpo}
    </Link>
  ) : (
    <div className={`${forma} border border-black/5 bg-hueso/60`}>{cuerpo}</div>
  );
}
