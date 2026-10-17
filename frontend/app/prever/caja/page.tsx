import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { cajaDelMes, librosCaja } from "../../../lib/cajaMes";
import { MarcoDinero } from "../../facturacion/MarcoDinero";
import { Caja } from "./Caja";

export const dynamic = "force-dynamic";

// PREVER › LA CAJA DEL MES (Monica, 17-oct-2026). Un mes (?mes=AAAA-MM, por
// defecto este) y, para quien ve los dos libros (direccion), dos pestañas:
// Accesalia y Daniel | Ecobalance. Ver lib/cajaMes.ts.

const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
const mesMas = (m: string, n: number) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);
const TITULO = { accesalia: "Accesalia y Daniel", ecobalance: "Ecobalance" } as const;

export default async function PaginaCaja({ searchParams }: { searchParams: Promise<{ mes?: string; libro?: string }> }) {
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/prever/caja");
  const libros = librosCaja(yo);
  if (!libros.length) redirect("/menu");
  const libro = libros.find((l) => l === sp.libro) ?? libros[0];
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoyMadrid().slice(0, 7);
  const c = await cajaDelMes(libro, mes);
  const url = (m: string, l = libro) => `/prever/caja?mes=${m}${l !== libros[0] ? `&libro=${l}` : ""}`;
  const nombreMes = MES.format(new Date(mes + "-01T00:00:00Z"));
  const BTN = "inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2.5 text-[13px] font-semibold text-carbon/75 hover:border-carbon/40";

  return (
    <MarcoDinero yo={yo} area="prever" activo="caja">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-carbon">
            La caja de {nombreMes}
          </h1>
          <p className="mt-0.5 text-[13px] text-carbon/65">{TITULO[libro]} · qué sale y qué entra este mes</p>
        </div>
        <div className="flex items-center gap-2">
          {libros.length > 1 && (
            <div className="mr-3 inline-flex rounded-lg bg-[#e3e6df] p-0.5">
              {libros.map((l) => (
                <Link key={l} href={url(mes, l)} className={`rounded-md px-3 py-1 text-[13px] font-semibold ${l === libro ? "bg-carbon text-white" : "text-carbon/70 hover:text-carbon"}`}>
                  {TITULO[l]}
                </Link>
              ))}
            </div>
          )}
          <Link href={url(mesMas(mes, -1))} className={BTN} aria-label="Mes anterior">‹</Link>
          <Link href={url(hoyMadrid().slice(0, 7))} className={BTN}>Este mes</Link>
          <Link href={url(mesMas(mes, 1))} className={BTN} aria-label="Mes siguiente">›</Link>
        </div>
      </div>
      <Caja c={c} />
    </MarcoDinero>
  );
}
