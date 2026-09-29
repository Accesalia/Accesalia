import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { oportunidadesAbiertas, sinSitio } from "../../../lib/buzonPolycam";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { accionColocar, accionRepasar } from "./acciones";

export const dynamic = "force-dynamic";

// ⚠️ PROVISIONAL — SIN REVISAR CON MONICA (29-sep-2026).
//
// La monto porque el reloj repasa el buzon cada diez minutos EN SILENCIO: si un
// correo no se puede colocar, sin esta pantalla no se entera nadie. Sin ella, el
// reloj es una caja negra.
//
// Ella no la ha visto todavia -"no doy abasto con todo a la vez"-, asi que lleva
// su aviso arriba y no se da por buena. Cuando la repase, se quita el aviso o se
// rehace.
//
// La bandeja NO es una tabla: es el propio buzon. Los correos con la etiqueta
// "accesalia-sin-sitio" son los que el reloj miro y no supo donde poner.

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const BOTON =
  "inline-flex h-[32px] shrink-0 items-center justify-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3.5 text-[12px] font-bold uppercase text-white transition hover:bg-[#46769c]";
const CAMPO =
  "w-full rounded-lg border border-carbon/40 bg-white px-2.5 py-1.5 text-[13px] text-carbon outline-none transition focus:border-lima";

export default async function Buzon({
  searchParams,
}: {
  searchParams: Promise<{ colocado?: string; hecho?: string; mirados?: string; falta?: string }>;
}) {
  const { colocado, hecho, mirados, falta } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/buzon");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");

  const [correos, oportunidades] = await Promise.all([sinSitio(), oportunidadesAbiertas()]);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-16 pt-5">
        <Link href="/comercial" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Área comercial
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[25px] font-bold leading-tight text-carbon">Buzón del Polycam</h1>
            <p className="mt-1.5 text-[13px] text-carbon/60">
              Lo que llegó por correo y la app no supo dónde colocar. Se repasa solo cada diez minutos.
            </p>
          </div>
          <form action={accionRepasar}>
            <button className={BOTON}>Repasar el buzón ahora</button>
          </form>
        </div>

        {/* El aviso de que esto no está dado por bueno. Se quita cuando ella lo
            repase, no antes. */}
        <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <b>PANTALLA PROVISIONAL.</b> Montada deprisa para que el reloj no trabaje a ciegas. Funciona, pero{" "}
          <b>no está revisada contigo</b>: los textos, el orden y lo que se ve están sin decidir.
        </div>

        {colocado && (
          <p className="mt-4 rounded-xl border border-lima bg-lima-soft px-4 py-2.5 text-[13px] text-carbon">
            Colocado. Ya está en su oportunidad y avisado quien lo revisa.
          </p>
        )}
        {hecho !== undefined && (
          <p className="mt-4 rounded-xl border border-black/10 bg-hueso px-4 py-2.5 text-[13px] text-carbon">
            Repasado: {mirados ?? 0} correo(s) mirado(s), {hecho} colocado(s).
          </p>
        )}
        {falta && (
          <p className="mt-4 rounded-xl border border-alerta/40 bg-red-50 px-4 py-2.5 text-[13px] text-alerta">
            Elige una oportunidad antes de colocarlo.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {correos.length === 0 ? (
            <p className={CAJA + " px-5 py-10 text-center text-[14px] text-carbon/50"}>
              Nada pendiente: todo lo que ha llegado se ha podido colocar.
            </p>
          ) : (
            correos.map((c) => (
              <form key={c.uid} action={accionColocar.bind(null, c.uid)} className={CAJA + " p-4"}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[15px] font-bold text-carbon">{c.asunto}</span>
                  <span className="text-[12px] text-carbon/55">
                    {c.de} · {c.cuando}
                  </span>
                </div>

                {c.adjuntos.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {c.adjuntos.map((a) => (
                      <span key={a} className="rounded-full border border-black/5 bg-hueso px-2 py-0.5 text-[11px] font-semibold text-carbon/70">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[12px] font-semibold text-alerta">Sin adjuntos: no trae ningún fichero.</p>
                )}

                {c.cuerpo && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-snug text-carbon/70">{c.cuerpo}</p>}

                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="block min-w-[280px] flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.05em] text-[#237812]">
                      De qué oportunidad es
                    </span>
                    <select name="oportunidad" defaultValue="" className={CAMPO + " mt-1"}>
                      <option value="">— elige —</option>
                      {oportunidades.map((o) => (
                        <option key={o.valor} value={o.valor}>
                          {o.texto}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className={BOTON}>Colocarlo aquí</button>
                </div>

                {c.sugerencia && (
                  <p className="mt-2 text-[12px] text-carbon/55">
                    El asunto se parece a <b className="text-carbon/80">{c.sugerencia.nombre}</b>, pero esa dirección no
                    tiene una única oportunidad abierta.
                  </p>
                )}
              </form>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
