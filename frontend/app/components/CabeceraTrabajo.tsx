import Link from "next/link";
import { BarraSuperior } from "./BarraSuperior";
import { Salida } from "./Salida";
import { ICONOS, Trazo, type Icono } from "./Iconos";
import { letraMenu } from "./letraMenu";
import { COLORES_VIVOS, type ColorVivo } from "./Submenu";
import { GRUPOS, type Grupo } from "../menu/TarjetaVelada";

// LAS PANTALLAS DE TRABAJO (nivel 3; Monica, 21-oct-2026). Arriba, una cabecera
// grafito con un velo del color de su boton, la miga (grupo › area), su icono y su
// titulo, y una linea dorada de 1 px que la separa. Debajo, el fondo petroleo con
// las tarjetas blancas. Maqueta: https://claude.ai/artifact/KMxfsqi9jepAwbhnTnQzW3
// El primer uso es Negocio › Trabajo contratado; las demas pantallas iran igual.

export const FONDO_TRABAJO = "#17393b";

export function PaginaTrabajo({
  grupo,
  area,
  salida,
  titulo,
  subtitulo,
  color,
  icono,
  cabecera,
  children,
}: {
  grupo: Grupo;
  area: string;
  salida: { href: string; texto: string };
  titulo: string;
  subtitulo?: string;
  color: ColorVivo;
  icono: Icono;
  /** Lo que va dentro de la cabecera, debajo del titulo (el periodo, por ejemplo). */
  cabecera?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = COLORES_VIVOS[color].solido;
  return (
    <div className={`${letraMenu.variable} min-h-screen`} style={{ background: FONDO_TRABAJO }}>
      <BarraSuperior />
      <Salida href={salida.href}>{salida.texto}</Salida>
      <header className="text-[#f3f4f1]" style={{ background: `linear-gradient(90deg, ${c}52, transparent 55%), #2e3236` }}>
        <div className="mx-auto max-w-[1180px] px-4 pb-5 pt-6 sm:px-6">
          <p className="flex gap-2 font-[family-name:var(--letra-menu)] text-[12.5px] font-extrabold uppercase tracking-[0.1em]">
            <span style={{ color: GRUPOS[grupo].rotulo }}>● {GRUPOS[grupo].nombre}</span>
            <span className="text-[#f3f4f1]/35">›</span>
            <span className="text-[#f3f4f1]/80">{area}</span>
          </p>
          <div className="mt-2.5 flex items-center gap-3.5">
            <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[9px] text-white" style={{ background: c, boxShadow: `0 6px 14px -6px ${c}` }}>
              <Trazo className="h-5 w-5">{ICONOS[icono]}</Trazo>
            </span>
            <h1 className="font-[family-name:var(--letra-menu)] text-[34px] font-extrabold tracking-[-0.02em]">{titulo}</h1>
          </div>
          {subtitulo && <p className="mt-1.5 text-[14.5px] text-[#f3f4f1]/75">{subtitulo}</p>}
          {cabecera}
        </div>
      </header>
      <div className="h-px" style={{ background: "linear-gradient(90deg, #b8913f, #e3c37a 50%, #b8913f)" }} />
      <main className="mx-auto max-w-[1180px] px-4 pb-20 pt-2 sm:px-6">{children}</main>
    </div>
  );
}

/** Un bloque de la pantalla: su titulo (claro, sobre el fondo oscuro) con el cuadradito del color. */
export function BloqueTrabajo({ titulo, nota, color, children }: { titulo: string; nota?: string; color: ColorVivo; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="flex items-center gap-2.5 font-[family-name:var(--letra-menu)] text-[20px] font-extrabold tracking-[-0.01em] text-[#f3f4f1]">
        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: COLORES_VIVOS[color].solido }} />
        {titulo}
      </h2>
      {nota && <p className="ml-5 mt-1 max-w-[80ch] text-[13.5px] text-[#f3f4f1]/75">{nota}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

const DIA = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** El periodo: atajos (mes, trimestre, año, año pasado) y las fechas a mano. Un formulario GET. */
export function Periodo({ ruta, desde, hasta, color }: { ruta: string; desde: string; hasta: string; color: ColorVivo }) {
  const hoy = DIA(new Date());
  const [a, m] = [Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7))];
  const tri = String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0");
  const atajos = [
    { texto: "Este mes", desde: `${hoy.slice(0, 7)}-01`, hasta: hoy },
    { texto: "Este trimestre", desde: `${a}-${tri}-01`, hasta: hoy },
    { texto: "Este año", desde: `${a}-01-01`, hasta: hoy },
    { texto: "Año pasado", desde: `${a - 1}-01-01`, hasta: `${a - 1}-12-31` },
  ];
  const c = COLORES_VIVOS[color].solido;
  const campo = "rounded-[5px] border border-white/20 bg-white/10 px-2 py-1 text-[13.5px] text-[#f3f4f1] [color-scheme:dark]";
  return (
    <form action={ruta} className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {atajos.map((x) => {
          const activo = x.desde === desde && x.hasta === hasta;
          return (
            <Link
              key={x.texto}
              href={`${ruta}?desde=${x.desde}&hasta=${x.hasta}`}
              className="rounded-[5px] border px-3 py-1.5 text-[13px] font-bold transition"
              style={activo ? { background: c, borderColor: c, color: "#fff" } : { borderColor: "rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "#f3f4f1" }}
            >
              {x.texto}
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#f3f4f1]/70">
        <label htmlFor="desde">Del</label>
        <input id="desde" type="date" name="desde" defaultValue={desde} className={campo} />
        <label htmlFor="hasta">al</label>
        <input id="hasta" type="date" name="hasta" defaultValue={hasta} className={campo} />
        <button type="submit" className="rounded-[5px] px-3.5 py-1 text-[13.5px] font-bold text-white" style={{ background: c }}>
          Ver
        </button>
      </div>
    </form>
  );
}
