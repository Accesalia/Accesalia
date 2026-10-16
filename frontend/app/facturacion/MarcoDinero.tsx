import Link from "next/link";
import type { Yo } from "../../lib/sesion";
import { calendarioFiscal, librosFiscales } from "../../lib/fiscal";
import { nuevasHojas } from "../../lib/nuevasHojas";
import { BarraSuperior } from "../components/BarraSuperior";
import { areasDe, type Area } from "./Areas";
import { AreasBarra, type PestanaArea } from "./AreasBarra";

// EL MARCO COMUN DEL AREA DEL DINERO (Monica, 16-oct-2026: "las pantallas de
// facturacion que estaban en borrador, vamos a subirlas"). Es el de la maqueta
// validada (docs/figma/area-dinero-v1.html): las cuatro areas arriba, con su
// contador, y a la izquierda el menu de cada area. Todas las pantallas del dinero
// van dentro:
//   <MarcoDinero yo={yo} area="pagar" activo="impuestos">...</MarcoDinero>
// Lo que aun no esta montado sale en gris con «luego»: se ve que va a existir,
// pero no lleva a ningun sitio. Asignar no lleva menu lateral (asi en la maqueta):
// su pantalla ocupa todo el ancho. En Pagar puede haber DOS entradas activas a la
// vez (Impuestos + la empresa): `activo` admite una lista.

export type ItemMenu = { clave: string; titulo: string; href?: string; cuenta?: number };
export type GrupoMenu = { titulo: string; items: ItemMenu[] };

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

/** LOS MENUS DE CADA AREA, los de la maqueta. Una entrada sin href = «luego».
 *  Cuando se monta una pantalla, se le pone aqui su href. */
function menuDe(area: Area, c: Record<string, number | undefined>): GrupoMenu[] | null {
  if (area === "cobrar")
    return [
      {
        titulo: "Para hacer",
        items: [
          { clave: "nuevas", titulo: "Nuevas Hojas Encargo Firmadas", href: "/facturacion/cobrar", cuenta: c.nuevas },
          { clave: "modificar", titulo: "Modificar Hitos" },
          { clave: "facturable", titulo: "Facturable ya", href: "/facturacion/cobrar/proximos?ver=ya", cuenta: c.facturable },
          { clave: "proforma", titulo: "Generar Proforma", href: "/facturacion/proformas" },
          { clave: "sin-justificante", titulo: "Facturas sin justificante", href: "/facturacion/cobrar/sin-justificante", cuenta: c.sinJustificante },
        ],
      },
      {
        titulo: "Consultar",
        items: [
          { clave: "buscar", titulo: "Buscar dirección" },
          { clave: "contratado", titulo: "Todo lo contratado", href: "/facturacion/cobrar/contratado" },
          { clave: "proximos", titulo: "Próximos hitos", href: "/facturacion/cobrar/proximos" },
          { clave: "facturas", titulo: "Facturas emitidas", href: "/facturacion/cobrar/facturas" },
          // No esta en la maqueta: se queda hasta que «Buscar dirección» la sustituya.
          { clave: "por-cobrar", titulo: "Lo que queda por cobrar", href: "/facturacion/cobrar/por-cobrar" },
        ],
      },
      { titulo: "Más adelante", items: [{ clave: "morosidad", titulo: "Morosidad" }] },
    ];
  if (area === "pagar")
    return [
      {
        titulo: "Pagos",
        items: [
          { clave: "impuestos", titulo: "Impuestos", href: "/pagar", cuenta: c.pagar },
          { clave: "nominas", titulo: "Nóminas y SS" },
          { clave: "proveedores", titulo: "Proveedores" },
          { clave: "gastos-fijos", titulo: "Gastos fijos" },
        ],
      },
      {
        titulo: "Empresa",
        items: [
          { clave: "emp-todas", titulo: "Las dos", href: "/pagar" },
          { clave: "emp-accesalia", titulo: "Accesalia", href: "/pagar?empresa=accesalia" },
          { clave: "emp-daniel", titulo: "Daniel de Soto", href: "/pagar?empresa=daniel_autonomo" },
        ],
      },
    ];
  if (area === "prever")
    return [
      {
        titulo: "Previsión",
        items: [
          { clave: "llegamos", titulo: "¿Llegamos?", href: "/prever" },
          { clave: "entradas", titulo: "Entradas previstas" },
          { clave: "salidas", titulo: "Salidas previstas" },
        ],
      },
      {
        titulo: "Supuestos",
        items: [
          { clave: "saldo-minimo", titulo: "Saldo mínimo" },
          { clave: "retraso", titulo: "Retraso por pagador" },
          { clave: "escenarios", titulo: "Escenarios" },
        ],
      },
    ];
  return null;
}

export async function MarcoDinero({
  yo,
  area,
  activo,
  cuentas = {},
  children,
}: {
  yo: Yo;
  area: Area;
  /** La entrada (o entradas) del menu lateral en la que se esta. */
  activo?: string | string[];
  /** Contadores ya calculados por la pagina (si no, se calculan aqui). */
  cuentas?: Record<string, number | undefined>;
  children: React.ReactNode;
}) {
  const [pagar, nuevas] = await Promise.all([
    cuentas.pagar ?? pagosDeLaSemana(yo),
    cuentas.nuevas ?? nuevasHojas().then((f) => f.length).catch(() => 0),
  ]);
  const c = { ...cuentas, pagar, nuevas };
  const pestanas: PestanaArea[] = areasDe(yo).map((a) => ({
    clave: a.clave,
    titulo: a.titulo,
    href: a.href,
    cuenta: a.clave === "cobrar" ? nuevas : a.clave === "pagar" ? pagar : undefined,
    aviso: a.clave === "pagar",
  }));
  const menu = menuDe(area, c);
  const activos = new Set(Array.isArray(activo) ? activo : activo ? [activo] : []);
  return (
    <div className="flex min-h-screen flex-col">
      <BarraSuperior />
      <AreasBarra areas={pestanas} activa={area} />
      <div className="flex flex-1">
        {menu && (
          <aside className="w-[260px] shrink-0 border-r border-black/10 bg-white px-3.5 py-5">
            {menu.map((g) => (
              <div key={g.titulo} className="mb-4">
                <div className="mx-3 mb-2 text-[11px] font-bold uppercase tracking-[.12em] text-carbon/50">{g.titulo}</div>
                {g.items.map((it) =>
                  it.href ? (
                    <Link
                      key={it.clave}
                      href={it.href}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[14.5px] ${activos.has(it.clave) ? "bg-[#eef7e4] font-bold text-[#2f5d14]" : "font-medium text-carbon/85 hover:bg-black/[.03]"}`}
                    >
                      <span>{it.titulo}</span>
                      {it.cuenta ? <span className={`text-[12.5px] font-bold ${activos.has(it.clave) ? "text-lima-dark" : "text-carbon/55"}`}>{it.cuenta}</span> : null}
                    </Link>
                  ) : (
                    <div key={it.clave} className="flex items-center justify-between gap-2 px-3 py-2 text-[14.5px] text-carbon/40" title="Se monta cuando esté su pantalla">
                      <span>{it.titulo}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide">luego</span>
                    </div>
                  ),
                )}
              </div>
            ))}
          </aside>
        )}
        <main className="min-w-0 flex-1 px-8 pb-16 pt-6 text-sm">{children}</main>
      </div>
    </div>
  );
}
