import Link from "next/link";
import type { Yo } from "../../../lib/sesion";
import { calendarioFiscal, librosFiscales } from "../../../lib/fiscal";
import { BarraSuperior } from "../../components/BarraSuperior";
import { areasDe } from "../Areas";
import { AreasBarra, type PestanaArea } from "../AreasBarra";

// EL MARCO DE COBRAR (maqueta validada por Monica, 12-oct-2026): las cuatro areas
// arriba, en una franja bajo la barra negra (16-oct), y a la izquierda el menu de Cobrar. Lo que aun no
// esta montado sale en gris con «luego»: se ve que va a existir, pero no lleva
// a ningun sitio.

type Item = { clave: string; titulo: string; href?: string; cuenta?: number };

const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

/** Lo que vence esta semana sin hacer, para el contador rojo de Pagar. */
async function pagosDeLaSemana(yo: Yo): Promise<number> {
  try {
    const hoy = hoyMadrid();
    const tope = new Date(Date.parse(hoy) + 7 * 86400000).toISOString().slice(0, 10);
    const libros = await Promise.all(librosFiscales(yo).map(calendarioFiscal));
    return libros.flat().filter((p) => p.estado === "pendiente" && !p.sinCargo && p.fecha <= tope).length;
  } catch {
    return 0;
  }
}

export async function MarcoCobrar({ yo, activo, nuevas, children }: { yo: Yo; activo: string; nuevas: number; children: React.ReactNode }) {
  const pagar = await pagosDeLaSemana(yo);
  const pestanas: PestanaArea[] = areasDe(yo).map((a) => ({
    clave: a.clave,
    titulo: a.titulo,
    href: a.href,
    cuenta: a.clave === "cobrar" ? nuevas : a.clave === "pagar" ? pagar : undefined,
    aviso: a.clave === "pagar",
  }));
  const grupos: { titulo: string; items: Item[] }[] = [
    {
      titulo: "Para hacer",
      items: [
        { clave: "nuevas", titulo: "Nuevas Hojas Encargo Firmadas", href: "/facturacion/cobrar", cuenta: nuevas },
        { clave: "modificar", titulo: "Modificar Hitos" },
        { clave: "facturable", titulo: "Facturable ya" },
        { clave: "proformas", titulo: "Proformas", href: "/facturacion/proformas" },
      ],
    },
    {
      titulo: "Consultar",
      items: [
        { clave: "por-cobrar", titulo: "Lo que queda por cobrar", href: "/facturacion/cobrar/por-cobrar" },
        { clave: "contratado", titulo: "Todo lo contratado" },
        { clave: "proximos", titulo: "Próximos hitos" },
        { clave: "facturas", titulo: "Facturas emitidas" },
      ],
    },
    { titulo: "Más adelante", items: [{ clave: "morosidad", titulo: "Morosidad" }] },
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <BarraSuperior />
      <AreasBarra areas={pestanas} activa="cobrar" />
      <div className="flex flex-1">
        <aside className="w-[260px] shrink-0 border-r border-black/10 bg-white px-3.5 py-5">
          {grupos.map((g) => (
            <div key={g.titulo} className="mb-4">
              <div className="mx-3 mb-2 text-[11px] font-bold uppercase tracking-[.12em] text-carbon/50">{g.titulo}</div>
              {g.items.map((it) =>
                it.href ? (
                  <Link
                    key={it.clave}
                    href={it.href}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[14.5px] ${it.clave === activo ? "bg-[#eef7e4] font-bold text-[#2f5d14]" : "font-medium text-carbon/85 hover:bg-black/[.03]"}`}
                  >
                    <span>{it.titulo}</span>
                    {it.cuenta ? <span className={`text-[12.5px] font-bold ${it.clave === activo ? "text-lima-dark" : "text-carbon/55"}`}>{it.cuenta}</span> : null}
                  </Link>
                ) : (
                  <div key={it.clave} className="flex items-center justify-between gap-2 px-3 py-2 text-[14.5px] text-carbon/40" title="Se monta cuando validemos su pantalla">
                    <span>{it.titulo}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide">luego</span>
                  </div>
                ),
              )}
            </div>
          ))}
        </aside>
        <main className="min-w-0 flex-1 px-8 pb-16 pt-6 text-sm">{children}</main>
      </div>
    </div>
  );
}
