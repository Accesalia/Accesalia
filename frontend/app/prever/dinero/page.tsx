import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerGastos, mesMas } from "../../../lib/gastosMes";
import { dineroDelMes } from "../../../lib/dineroMes";
import { MarcoDinero } from "../../facturacion/MarcoDinero";
import { Dinero } from "./Dinero";
import { Sali } from "../../components/sali/Sali";

export const dynamic = "force-dynamic";
// Sali consulta antes de contestar: puede tardar mas de un minuto
export const maxDuration = 300;

// PREVER › EL DINERO DEL MES (Monica, 21-oct-2026). Ver lib/dineroMes.ts.

const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function PaginaDinero({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/prever/dinero");
  if (!puedeVerGastos(yo)) redirect("/menu");
  const hoy = hoyMadrid();
  const mesHoy = hoy.slice(0, 7);
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) && sp.mes >= mesHoy ? sp.mes : mesHoy;
  const d = await dineroDelMes(mes, hoy, yo);
  const BTN = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[13px] font-semibold text-carbon/75 hover:border-carbon/40";
  return (
    <MarcoDinero yo={yo} area="prever" activo="dinero">
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-black/10 pb-3">
        <h1 className="text-[24px] font-bold leading-tight text-carbon">El dinero del mes</h1>
        <div className="flex items-center gap-2">
          {mes > mesHoy ? <Link href={`/prever/dinero?mes=${mesMas(mes, -1)}`} className={BTN} aria-label="Mes anterior">◀</Link> : <span className={`${BTN} opacity-30`}>◀</span>}
          <span className="min-w-[150px] text-center text-[18px] font-bold capitalize text-carbon">{MES.format(new Date(mes + "-01T00:00:00Z"))}</span>
          <Link href={`/prever/dinero?mes=${mesMas(mes, 1)}`} className={BTN} aria-label="Mes siguiente">▶</Link>
        </div>
        <span className="ml-auto text-[12.5px] text-carbon/65">
          {d.hasta ? `saldos del último extracto, hasta el ${d.hasta.slice(8, 10)}-${d.hasta.slice(5, 7)}: lo de después es previsión` : "aún no hay extractos"}
        </span>
      </div>
      {/* Preguntale a Sali: solo direccion (Monica, 21-oct) */}
      {yo.veTodo && <div className="mb-3"><Sali pantalla={`Prever › El dinero del mes (${mes}, y las próximas 8 semanas)`} /></div>}
      <Dinero d={d} />
    </MarcoDinero>
  );
}
