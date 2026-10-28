import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { direccionDelAsunto, enlaceAbrirOpp, escaneosSinOpp } from "../../../lib/polycamSinOpp";

export const dynamic = "force-dynamic";

// ESCANEOS QUE HAS ENVIADO SIN OPORTUNIDAD (Monica, 28-oct-2026). Cada comercial,
// los suyos; direccion, todos. «Abrir la oportunidad» lleva al alta con la
// direccion ya escrita; en cuanto existe, el buzon coloca el escaneo solo y sale
// de esta lista.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const BOTON =
  "inline-flex h-[30px] shrink-0 items-center justify-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3 text-[11.5px] font-bold uppercase text-white transition hover:bg-[#46769c]";

export default async function EscaneosSinOpp() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/escaneos-sin-opp");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/pendientes");
  const lista = await escaneosSinOpp(yo.veTodo ? {} : { visitoId: yo.id });
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Salida href="/pendientes">← Pendientes</Salida>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">
          {yo.veTodo ? "Escaneos sin oportunidad" : "Escaneos que has enviado sin oportunidad"} · {lista.length}
        </h1>
        <p className="mt-1 max-w-[780px] text-[13px] text-carbon/70">
          Si hay un Polycam es porque la dirección se ha visto y estudiado: debería tener su oportunidad abierta. Ábrela y
          el escaneo se colocará solo en la siguiente pasada del buzón (cada 10 minutos). Si ya existe con otro nombre,
          díselo a Alex.
        </p>
        {lista.length ? (
          <table className="mt-4 w-auto border-collapse text-[13.5px]">
            <tbody>
              {lista.map((e) => (
                <tr key={e.id} className="border-b border-black/10 align-middle">
                  <td className="py-2 pr-4 text-[12px] text-carbon/60">{FECHA.format(new Date(e.creadoEn))}</td>
                  <td className="max-w-[420px] py-2 pr-4 font-semibold text-carbon">{direccionDelAsunto(e.asunto) || "(el correo venía sin asunto)"}</td>
                  {yo.veTodo && <td className="py-2 pr-4 text-[12px] text-carbon/60">{e.remitente ?? "—"}</td>}
                  <td className="py-2 pr-4 text-[12px] text-carbon/60">{e.vinculado ? "su edificio no tiene opp abierta" : "sin colocar"}</td>
                  <td className="py-2">
                    <a href={enlaceAbrirOpp(e.asunto)} className={BOTON}>
                      Abrir la oportunidad
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-6 text-[13px] text-carbon/60">Ninguno: todos tus escaneos tienen su oportunidad.</p>
        )}
      </main>
    </div>
  );
}
