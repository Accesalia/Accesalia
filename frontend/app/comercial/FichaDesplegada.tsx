"use client";

import { useState } from "react";
import type { FichaExtracto, EntradaCuadro } from "../../lib/cuadroComercial";

// LA FICHA COMERCIAL, DESPLEGADA EN LA PROPIA LISTA (Monica, 12-sep-2026, con
// su boceto en docs/EJEMPLO FICHA COMERCIAL DESPLEGADA.png):
//
//   "Hay una ficha comercial por cada oportunidad abierta donde vamos poniendo
//    muchos datos. La idea es que aqui se pueda tener un extracto de lo mas
//    relevante para no tener que ir siempre a la ficha a ver cosas: lo
//    inmediatamente urgente se ve aqui, desplegado, y si quieres mas, un boton
//    te lleva a ver la ficha completa."
//
// Decisiones suyas que hay que respetar:
//   - MEJOR VERLO QUE TENER QUE PINCHAR. Los telefonos se ven, no se esconden:
//     "invita a llamar, que es bueno".
//   - Lo que aun no existe sale como HUECO, no se oculta ([[campo-vacio-no-es-campo-irrelevante]]).
//   - El diario de la derecha trae SOLO las entradas de esta direccion.
//
// Nada de aqui lleva todavia a otra pantalla: la ficha completa, el visor de
// correo y los documentos estan por montar.

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function Rotulo({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold uppercase tracking-wider text-carbon/45">{children}</div>;
}

// Un hueco: lo que todavia no ha pasado se ve, para que se note que falta.
function Hueco({ texto }: { texto: string }) {
  return (
    <span className="rounded-md border border-dashed border-black/15 px-2 py-1 text-sm text-carbon/35">{texto}</span>
  );
}

// ------------------------------------------------------------ los dos papeles

function Documentos({ docs }: { docs: FichaExtracto["documentos"] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {docs.map((d) => (
        <div key={d.rotulo} className="flex items-center justify-between gap-3">
          <span className={"text-base font-bold " + (d.href ? "text-carbon" : "text-carbon/35")}>{d.rotulo}</span>
          {d.href ? (
            <span
              title="El visor de documentos está por montar"
              className="grid h-8 w-8 shrink-0 cursor-not-allowed place-items-center rounded-lg border border-black/10 bg-white text-carbon/70"
            >
              <svg width="15" height="18" viewBox="0 0 15 18" fill="none" aria-hidden>
                <path d="M1 1h8l5 5v11H1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M9 1v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </span>
          ) : (
            <Hueco texto={d.falta} />
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ el correo

function Envio({ envio }: { envio: FichaExtracto["envio"] }) {
  if (!envio)
    return (
      <div className="flex h-full items-center">
        <Hueco texto="Todavía no se ha enviado nada" />
      </div>
    );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-base text-carbon/85">{envio.cuando}</p>
        <span
          title="El correo entero se verá cuando montemos el buzón"
          className="cursor-not-allowed rounded-md bg-black/5 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-carbon/50"
        >
          Ver mail
        </span>
      </div>
      <div className="mt-2 space-y-0.5 text-sm leading-snug text-carbon/60">
        <p>
          <span className="text-carbon/45">mail a: </span>
          {envio.para.join(", ")}
        </p>
        {envio.cc.length > 0 && (
          <p>
            <span className="text-carbon/45">CC: </span>
            {envio.cc.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ a quien llamar

function Contactos({ contactos }: { contactos: FichaExtracto["contactos"] }) {
  return (
    <div>
      <Rotulo>Contactos</Rotulo>
      {contactos.length === 0 ? (
        <div className="mt-2">
          <Hueco texto="Sin contactos en la ficha" />
        </div>
      ) : (
        <ul className="mt-2 space-y-1">
          {contactos.map((c) => (
            <li key={c.papel + c.nombre} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <span className="text-base text-carbon">
                {c.nombre} <span className="text-sm text-carbon/50">· {c.papel}</span>
              </span>
              {c.telefono ? (
                <a
                  href={`tel:${c.telefono.replace(/\s/g, "")}`}
                  className="shrink-0 text-base font-bold tabular-nums text-lima-dark hover:underline"
                >
                  {c.telefono}
                </a>
              ) : (
                <span className="shrink-0 text-sm text-carbon/30">sin teléfono</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------ el relato de Sali

function Sali({ sali }: { sali: FichaExtracto["sali"] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div
        className={
          "flex items-start justify-between gap-3 px-4 py-3 " +
          (sali?.atencion ? "bg-amber-50" : "bg-lima-soft")
        }
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-wider text-carbon/70">Sali</span>
            {sali && (
              <span className="text-xs text-carbon/45">{sali.cuando}</span>
            )}
          </div>
          <p className="mt-1.5 text-base leading-snug text-carbon/85">
            {sali ? sali.conclusion : <span className="text-carbon/40">Sali aún no ha mirado esta oportunidad.</span>}
          </p>
        </div>
        <span
          title="Actualizar el estado — Sali todavía no está enchufada"
          className="grid h-8 w-8 shrink-0 cursor-not-allowed place-items-center rounded-lg text-carbon/45 hover:bg-black/5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M14 8a6 6 0 1 1-1.8-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M14 1.5V4.5H11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <div className="space-y-3 px-4 py-3.5 text-base leading-relaxed text-carbon/80">
        {sali ? (
          sali.parrafos.map((p, i) => <p key={i}>{p}</p>)
        ) : (
          <p className="text-carbon/40">
            Aquí irá cómo ha ido el proceso con la comunidad desde el principio, escrito a partir del diario.
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ solo lo de aqui

function Historia({ entradas }: { entradas: EntradaCuadro[] }) {
  return (
    <div className="flex max-h-[22rem] flex-col overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="border-b border-black/5 px-4 py-3 text-base text-carbon/70">Tu historia con esta comunidad</div>
      {entradas.length === 0 ? (
        <p className="px-4 py-6 text-sm text-carbon/40">Todavía no hay nada grabado de esta dirección.</p>
      ) : (
        <ul className="divide-y divide-black/5 overflow-y-auto">
          {entradas.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-carbon/55">
                <span className="font-bold text-carbon/80">{ddmm(e.fecha)}</span>
                <span className="rounded-full border border-black/5 bg-hueso px-2 py-px text-xs font-semibold">{e.tipo}</span>
                {e.con && <span className="text-lima-dark">{e.con}</span>}
                {e.revisar && (
                  <span className="rounded-full bg-amber-50 px-2 py-px text-xs font-bold uppercase tracking-wide text-amber-700">
                    revisar
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-base leading-snug text-carbon/80">{e.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------ el conjunto

export function FichaDesplegada({ ficha }: { ficha: FichaExtracto | null }) {
  const f = ficha;
  return (
    <div className="border-t border-black/5 bg-hueso/50 px-5 py-5">
      {!f && (
        <p className="mb-4 rounded-lg border border-dashed border-black/15 bg-white px-4 py-3 text-sm text-carbon/55">
          De esta oportunidad todavía no hay nada en la app: ni viabilidad, ni hoja, ni correos, ni contactos. Así se verá
          cuando los haya.
        </p>
      )}

      {/* papeles | correo | a quien llamar */}
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
        <Documentos
          docs={
            f?.documentos ?? [
              { rotulo: "Viabilidad", href: null, falta: "sin hacer" },
              { rotulo: "Hoja de encargo", href: null, falta: "sin hacer" },
            ]
          }
        />
        <div className="md:border-l md:border-black/10 md:pl-5">
          <Envio envio={f?.envio ?? null} />
        </div>
        <div className="md:border-l md:border-black/10 md:pl-5">
          <Contactos contactos={f?.contactos ?? []} />
        </div>
      </div>

      {/* el estado de Sali | el diario de esta direccion */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Sali sali={f?.sali ?? null} />
        <Historia entradas={f?.historia ?? []} />
      </div>
    </div>
  );
}

/** El "Cobra / No cobra" de la cabecera, cuando esta desplegada. */
export function Cobro({ cobra }: { cobra: boolean | null }) {
  const [estado, setEstado] = useState(cobra);
  const boton = (valor: boolean) =>
    "px-3 py-1 text-sm font-bold uppercase tracking-wide transition " +
    (estado === valor ? "bg-carbon text-white" : "text-carbon/45 hover:text-carbon");
  const pulsar = (e: React.MouseEvent, valor: boolean) => {
    e.stopPropagation(); // no cerrar la ficha al elegir
    setEstado(valor);
  };
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-black/15 bg-white" title="Todavía no se guarda">
      <button type="button" onClick={(e) => pulsar(e, true)} className={boton(true)}>Cobra</button>
      <span className="w-px bg-black/10" />
      <button type="button" onClick={(e) => pulsar(e, false)} className={boton(false)}>No cobra</button>
    </div>
  );
}
