import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { pendientesDeRevisar } from "../../../lib/revisionPolycam";
import { accionBuscar, accionVincular, haceViabilidades } from "./acciones";
import { Vincular } from "./Piezas";

export const dynamic = "force-dynamic";

// ============================================================================
// REVISION POLYCAM (Monica, 2-oct-2026). El nombre de la pantalla es suyo.
//
// El buzon guarda todo lo que entra y NO decide de quien es. Decidirlo es trabajo
// de Alex, y esto es donde lo hace. Sus palabras:
//
//   "cuando Alex revise su lista de 'polycam pendientes' le tiene que salir en
//    pantalla una lista de direcciones y el enlace a abrir para cada uno. Y al
//    lado un boton para un modal. (...) El cotejo propone los posibles, Alex
//    decide cuales son."
//
// PENDIENTE = SIN NINGUN ACCESO VINCULADO. No hay campo de estado a proposito: un
// estado aparte se desincroniza del hecho. En cuanto Alex marca una escalera, el
// escaneado desaparece de esta lista porque ya tiene dueño.
//
// EL AZUL ES EL DE LA GUIA. `ajeno` es "lo que no depende de nosotros: el
// arquitecto, el escaneo, el 3D", y esta pantalla es exactamente eso: lo que llega
// de fuera. Es la primera vez que ese color se usa para lo que se definio.
// ============================================================================

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const ROTULO = "text-[11px] font-bold uppercase tracking-wider text-carbon/45";
const ENLACE_AJENO =
  "inline-flex h-[30px] items-center justify-center rounded-[8px] border border-ajeno/40 bg-ajeno-soft px-3.5 text-[12px] font-bold uppercase tracking-wide text-[#3f5f80] transition hover:bg-[#dde7f1]";

const CUANDO = new Intl.DateTimeFormat("es-ES", {
  day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid",
});

/** "hace 6 días", que es como Monica quiere medirlo: "hace 6 dias que tienes un
 *  escaneado esperando". Las horas se dicen en horas, que un escaneo de esta
 *  mañana no lleva "0 días". */
function loQueLleva(iso: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 60) return minutos <= 1 ? "ahora mismo" : `hace ${minutos} minutos`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return horas === 1 ? "hace una hora" : `hace ${horas} horas`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

export default async function RevisionPolycam() {
  await haceViabilidades();
  const pendientes = await pendientesDeRevisar();

  // Los que llevan más esperando, arriba. Es lo que hay que quitarse de encima.
  const lista = [...pendientes].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  const sinCandidatos = lista.filter((e) => e.candidatos.length === 0).length;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1120px] px-6 pb-16 pt-5">
        {/* AL MENU, NO AL AREA COMERCIAL. Esta pantalla estuvo un rato en
            /comercial/ y era un callejon: la abre la funcion `viabilidades`, que
            NO abre el area comercial, asi que Alex pulsaba volver y el area lo
            echaba de vuelta aqui. Monica, 2-oct-2026: "yo diria que NO va en
            comercial, va en funcion VIABILIDAD". */}
        <Link
          href="/menu"
          className="text-sm font-semibold text-carbon/55 transition hover:text-carbon"
        >
          ← Áreas de Accesalia
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <div className={ROTULO}>Lo que ha entrado por el buzón</div>
            <h1 className="mt-1 text-[25px] font-bold leading-tight text-carbon">
              Revisión Polycam
            </h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px] text-carbon/60">
              El buzón guarda todo lo que llega, venga de donde venga y diga lo que diga el asunto.
              Aquí se dice <b className="text-carbon/80">de qué portal es cada escaneo</b>: el cotejo
              propone los posibles y tú marcas cuáles son. En cuanto uno queda vinculado, desaparece
              de esta lista.
            </p>
          </div>
          {lista.length > 0 && (
            <div className="rounded-[10px] border border-ajeno/40 bg-ajeno-soft px-4 py-2.5">
              <div className="text-[22px] font-bold leading-none text-[#3f5f80]">{lista.length}</div>
              <div className="mt-1 text-[12px] font-semibold text-[#3f5f80]">por revisar</div>
            </div>
          )}
        </div>

        {sinCandidatos > 0 && (
          <div className="mt-4 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            <b>
              {sinCandidatos === 1
                ? "Uno de ellos no encaja con ninguna dirección de la cartera."
                : `${sinCandidatos} de ellos no encajan con ninguna dirección de la cartera.`}
            </b>{" "}
            O es una finca que todavía no está de alta, o el asunto no llevaba la dirección. Buscarla
            a mano está pendiente de montar.
          </div>
        )}

        {lista.length === 0 ? (
          /* El vacío se dice, no se deja en blanco: un día sin escaneos y una
             pantalla que no carga se parecen demasiado. */
          <div className={`${CAJA} mt-5 px-6 py-10 text-center`}>
            <p className="text-[15px] font-semibold text-carbon/70">
              No hay ningún escaneado esperando.
            </p>
            <p className="mt-1.5 text-[13px] text-carbon/55">
              El buzón se repasa cada diez minutos. Lo que entre aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {lista.map((e) => (
              <div key={e.id} className={`${CAJA} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                  <div className="min-w-0">
                    {/* El asunto ES la dirección, así que va grande y primero. */}
                    <div className="text-[17px] font-bold leading-tight text-carbon/90">
                      {e.asunto || (
                        <span className="text-amber-700/80">(el correo venía sin asunto)</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-carbon/60">
                      <span>{e.remitente ?? "sin remitente"}</span>
                      <span className="text-carbon/25">·</span>
                      <span>{CUANDO.format(new Date(e.creadoEn))}</span>
                      <span className="text-carbon/25">·</span>
                      <span className="font-semibold text-carbon/70">{loQueLleva(e.creadoEn)}</span>
                      {e.nombreOriginal && (
                        <>
                          <span className="text-carbon/25">·</span>
                          <span className="truncate">{e.nombreOriginal}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {/* Los dos caminos por los que llega un escaneo, y los dos se
                        enseñan si están: el fichero nuestro y el enlace de Polycam. */}
                    {e.enlaceFichero && (
                      <a href={e.enlaceFichero} target="_blank" rel="noreferrer" className={ENLACE_AJENO}>
                        Abrir el fichero
                      </a>
                    )}
                    {e.rutaPolycam && (
                      <a href={e.rutaPolycam} target="_blank" rel="noreferrer" className={ENLACE_AJENO}>
                        Abrir en Polycam
                      </a>
                    )}
                    {!e.enlaceFichero && !e.rutaPolycam && (
                      <span className="text-[12px] font-semibold text-amber-700/80">
                        sin fichero ni enlace
                      </span>
                    )}
                    <Vincular
                      polycamId={e.id}
                      asunto={e.asunto}
                      candidatos={e.candidatos}
                      guardar={accionVincular}
                      buscar={accionBuscar}
                    />
                  </div>
                </div>

                {/* Ver el dato sin clicar: lo que el cotejo propone se enseña aquí,
                    sin tener que abrir la ventana para saber si hay candidatos. */}
                {e.candidatos.length > 0 && (
                  <div className="mt-3 border-t border-black/5 pt-3 text-[12px] text-carbon/65">
                    <span className={ROTULO}>Encaja con</span>{" "}
                    {e.candidatos.map((g, i) => (
                      <span key={g.clave}>
                        {i > 0 && <span className="text-carbon/25"> · </span>}
                        <b className="font-semibold text-carbon/80">{g.direccion}</b> {g.municipio}
                        {g.accesos.length > 1 && (
                          <span className="text-carbon/55"> ({g.accesos.length} escaleras)</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
