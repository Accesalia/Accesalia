import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { quienSoy } from "../../lib/sesion";
import { RELOJES, RETIRADOS, ultimaDeCadaReloj, ultimasPasadas, type Pasada } from "../../lib/reloj";

export const dynamic = "force-dynamic";

// ============================================================================
// EL CUADERNO DE LOS RELOJES (Monica, 30-sep-2026)
//
// Un reloj que no corre no se queja. El 29-sep los tres se lanzaban puntuales y
// el middleware los mandaba al login con un 307: estuvieron muertos un dia
// entero y se descubrio leyendo los logs de Vercel a mano. Esta pantalla existe
// para que eso se vea desde aqui.
//
// DOS PARTES, y ella lo dijo asi: arriba el estado -una linea por reloj, verde o
// rojo de un vistazo- y abajo el historial, porque lo que hay que poder ver es
// "lleva tres dias fallando" o "ayer tardo diez veces mas de lo normal". Con una
// sola linea por reloj cada pasada borraria la anterior y esa historia no
// existiria.
//
// QUIEN ENTRA: direccion. Es la sala de maquinas, no un area de trabajo.
// ============================================================================

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const ROTULO = "text-[11px] font-bold uppercase tracking-wider text-carbon/45";

const RELOJ_DE_MADRID = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function cuando(iso: string): string {
  return RELOJ_DE_MADRID.format(new Date(iso)).replace(",", " ·");
}

/** "hace 4 minutos". Es el dato que de verdad se mira: la hora exacta dice poco
 *  si no se hace la resta en la cabeza. */
function hace(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "ahora mismo";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

function tardo(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.round(s / 60)} min`;
}

function Marca({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="text-carbon/35">—</span>;
  return ok ? (
    <span className="font-bold text-lima-dark">✓</span>
  ) : (
    <span className="font-bold text-alerta">✗</span>
  );
}

export default async function Relojes() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/relojes");
  // La sala de maquinas es de direccion. No va por nombres: va por ve_todo.
  if (!yo.veTodo) redirect("/menu");

  const [ultimas, historial] = await Promise.all([ultimaDeCadaReloj(), ultimasPasadas(80)]);
  // Los retirados entran SOLO para poner nombre a sus pasadas antiguas del
  // historial. Arriba no salen: una tarea sin horario no es un reloj, y
  // anunciarla como si lo fuera es justo la mentira que esta pantalla evita.
  const porTarea = new Map([...RELOJES, ...RETIRADOS].map((r) => [r.tarea, r]));
  const nombreDe = (tarea: string) => porTarea.get(tarea)?.nombre ?? tarea;

  return (
    <>
      <BarraSuperior />
      <main className="mx-auto max-w-[1120px] px-4 pb-16 pt-5 sm:px-6">
        <Link
          href="/menu"
          className="text-sm font-semibold text-carbon/55 transition-colors hover:text-carbon"
        >
          ← Menú
        </Link>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold leading-tight text-carbon sm:text-4xl">
            Los relojes
          </h1>
          <p className="text-sm text-carbon/65">
            Los trabajos que la app hace sola. Un reloj que no corre no se queja: aquí se ve.
          </p>
        </div>

        {/* ===================== ARRIBA: EL ESTADO =====================
            Una linea por reloj DECLARADO, no por reloj que haya corrido. El que
            nunca ha corrido es justo el que hay que ver. */}
        <section className={`${CAJA} mt-5 overflow-hidden`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 bg-hueso/60 text-left">
                <th className={`px-4 py-2.5 ${ROTULO}`}>Reloj</th>
                <th className={`px-4 py-2.5 ${ROTULO}`}>Cada cuánto</th>
                <th className={`px-4 py-2.5 ${ROTULO}`}>Última vez</th>
                <th className={`px-4 py-2.5 ${ROTULO} text-right`}>Tardó</th>
                <th className={`px-4 py-2.5 ${ROTULO} text-center`}>¿Bien?</th>
                <th className={`px-4 py-2.5 ${ROTULO}`}>Qué dijo</th>
              </tr>
            </thead>
            <tbody>
              {RELOJES.map((r) => {
                const p = ultimas[r.tarea];
                return (
                  <tr key={r.tarea} className="border-b border-black/5 last:border-0 align-middle">
                    <td className="px-4 py-3 font-semibold text-carbon">{r.nombre}</td>
                    <td className="px-4 py-3 text-carbon/65">{r.cada}</td>
                    {p ? (
                      <>
                        <td className="px-4 py-3 text-carbon/90">
                          {hace(p.empezada_en)}
                          <span className="ml-2 text-carbon/45 tabular-nums">{cuando(p.empezada_en)}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-carbon/70">{tardo(p.ms)}</td>
                        <td className="px-4 py-3 text-center text-base">
                          <Marca ok={p.ok} />
                        </td>
                        <td className="px-4 py-3 text-carbon/70">{p.dice ?? "—"}</td>
                      </>
                    ) : (
                      // Un hueco no es un error, y tampoco es gris: es ambar.
                      <td colSpan={4} className="px-4 py-3">
                        <span className="rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1 text-[13px] text-amber-900/80">
                          sin noticias — no ha corrido ni una vez desde que se apunta
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* ===================== ABAJO: EL HISTORIAL ===================== */}
        <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-carbon/70">
          Las últimas pasadas
        </h2>

        {historial.length === 0 ? (
          <p className={`${CAJA} mt-3 px-4 py-6 text-center text-sm text-carbon/55`}>
            Todavía no hay ninguna pasada apuntada. La primera se anotará en cuanto corra un reloj.
          </p>
        ) : (
          <section className={`${CAJA} mt-3 overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-hueso/60 text-left">
                  <th className={`px-4 py-2.5 ${ROTULO}`}>Cuándo</th>
                  <th className={`px-4 py-2.5 ${ROTULO}`}>Reloj</th>
                  <th className={`px-4 py-2.5 ${ROTULO} text-right`}>Tardó</th>
                  <th className={`px-4 py-2.5 ${ROTULO} text-center`}>¿Bien?</th>
                  <th className={`px-4 py-2.5 ${ROTULO}`}>Qué dijo</th>
                  <th className={`px-4 py-2.5 ${ROTULO}`}>Lo lanzó</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((p: Pasada) => (
                  <tr
                    key={p.id}
                    className={`border-b border-black/5 last:border-0 ${p.ok === false ? "bg-alerta/[0.04]" : ""}`}
                  >
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-carbon/90">
                      {cuando(p.empezada_en)}
                    </td>
                    <td className="px-4 py-2 text-carbon/80">{nombreDe(p.tarea)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-carbon/65">{tardo(p.ms)}</td>
                    <td className="px-4 py-2 text-center">
                      <Marca ok={p.ok} />
                    </td>
                    <td className="px-4 py-2 text-carbon/70">{p.dice ?? "—"}</td>
                    <td className="px-4 py-2 text-carbon/55">
                      {p.quien === "reloj" ? "el reloj" : "a mano"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </>
  );
}
