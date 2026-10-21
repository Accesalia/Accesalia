import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { gastosDelMes, mesMas, puedeVerGastos } from "../../../lib/gastosMes";
import { MarcoDinero } from "../../facturacion/MarcoDinero";
import { Gastos } from "./Gastos";

export const dynamic = "force-dynamic";

// PREVER › GASTOS DEL MES (Monica, 21-oct-2026; maqueta validada: docs/figma/gastos-del-mes.html).
// Un mes (?mes=AAAA-MM, por defecto este). Ver lib/gastosMes.ts.

const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function PaginaGastos({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/prever/gastos");
  if (!puedeVerGastos(yo)) redirect("/menu");
  const hoy = hoyMadrid().slice(0, 7);
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoy;
  const g = await gastosDelMes(mes, yo);
  const nombreMes = MES.format(new Date(mes + "-01T00:00:00Z"));
  const BTN = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[13px] font-semibold text-carbon/75 hover:border-carbon/40";
  const etiqueta = mes === hoy ? "mes en curso" : g.cerrado ? "cerrado" : mes < hoy ? "sin extracto completo" : "previsión";

  return (
    <MarcoDinero yo={yo} area="prever" activo="gastos">
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-black/10 pb-3">
        <h1 className="text-[24px] font-bold leading-tight text-carbon">Gastos del mes</h1>
        <div className="flex items-center gap-2">
          <Link href={`/prever/gastos?mes=${mesMas(mes, -1)}`} className={BTN} aria-label="Mes anterior">◀</Link>
          <span className="min-w-[150px] text-center text-[18px] font-bold capitalize text-carbon">{nombreMes}</span>
          <Link href={`/prever/gastos?mes=${mesMas(mes, 1)}`} className={BTN} aria-label="Mes siguiente">▶</Link>
          {mes !== hoy && (
            <Link href="/prever/gastos" className="ml-1 text-[12.5px] font-semibold text-lima-dark hover:underline">ir a este mes</Link>
          )}
          <span className={`ml-2 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${g.cerrado ? "bg-lima-soft text-lima-dark" : mes === hoy ? "bg-carbon text-white" : "bg-black/5 text-carbon/70"}`}>
            {etiqueta}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12.5px] text-carbon/65">
            {g.hasta ? `último extracto: hasta el ${g.hasta.slice(8, 10)}-${g.hasta.slice(5, 7)}-${g.hasta.slice(0, 4)}` : "aún no hay extractos"}
          </span>
          <Link href="/prever/extracto" className="inline-flex h-9 items-center gap-2 rounded-xl bg-lima px-4 text-[13.5px] font-bold text-carbon hover:bg-lima-dark hover:text-white">
            ⬆ Subir extracto
          </Link>
        </div>
      </div>
      <Gastos g={g} />
    </MarcoDinero>
  );
}
