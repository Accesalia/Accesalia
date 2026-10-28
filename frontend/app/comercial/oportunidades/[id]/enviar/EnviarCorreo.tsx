"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir } from "../../../../components/Elegir";
import { accionEnviar } from "./acciones";

// ENVIAR A LA COMUNIDAD (Monica, 12-oct-2026): elegir los documentos, a quien y
// la plantilla; el texto se retoca antes de enviar. Sale del buzon comercial con
// el nombre del comercial de la oportunidad, y las respuestas van a su correo.

type Doc = { clave: string; tipo: string; nombre: string; enlace: string; fecha: string | null; hojaId?: string | null; lista?: boolean };
type Dest = { email: string; quien: string };
type Plantilla = { id: string; nombre: string; asunto: string; texto: string; personal: boolean };

const ETQ = "block text-[10px] font-bold uppercase tracking-[0.05em] text-carbon/70";
const CAMPO =
  "mt-1 w-full rounded-lg border border-carbon/40 bg-white px-3 py-1.5 text-sm text-carbon outline-none placeholder:text-carbon/55 focus:border-lima";
const TARJETA = "rounded-2xl border border-[#5c5c5c] bg-form-card p-5";
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Madrid" });

export function EnviarCorreo({
  oppId,
  documentos,
  marcados = [],
  destinatarios,
  plantillas,
  remitente,
  responderA,
  plantillaInicial = "",
  rellenar,
}: {
  oppId: string;
  documentos: Doc[];
  /** Lo que llega marcado desde «Preparar una oferta». */
  marcados?: string[];
  destinatarios: Dest[];
  plantillas: Plantilla[];
  remitente: string;
  responderA: string | null;
  /** La que sale ya puesta (la de la oferta, al llegar desde «Preparar una oferta»). */
  plantillaInicial?: string;
  /** Lo que se cambia en la plantilla: {dirección} y {comercial}. */
  rellenar: { direccion: string; comercial: string };
}) {
  const router = useRouter();
  const [docs, setDocs] = useState<string[]>(marcados);
  // UNO POR HOJA O UNO PARA TODAS (Monica, 27-oct-2026): solo se pregunta si van dos hojas o mas.
  const [conjunto, setConjunto] = useState(false);
  const hojasEnCorreo = docs.filter((c) => c.startsWith("he:")).map((c) => c.slice(3));
  const elegirConjunto = (si: boolean) => {
    setConjunto(si);
    // Con uno para todas, los presupuestos de cada hoja dejan de ir; con uno por hoja, vuelven.
    const deEstas = documentos.filter((x) => x.hojaId && hojasEnCorreo.includes(x.hojaId)).map((x) => x.clave);
    setDocs((l) => (si ? l.filter((c) => !deEstas.includes(c)) : [...new Set([...l, ...deEstas])]));
  };
  const [para, setPara] = useState<string[]>([]);
  const [otros, setOtros] = useState("");
  const relleno = (t: string) =>
    t.replaceAll("{dirección}", rellenar.direccion).replaceAll("{direccion}", rellenar.direccion).replaceAll("{comercial}", rellenar.comercial);
  const inicial = plantillas.find((p) => p.id === plantillaInicial);
  const [plantilla, setPlantilla] = useState(inicial?.id ?? "");
  const [asunto, setAsunto] = useState(inicial ? relleno(inicial.asunto) : "");
  const [cuerpo, setCuerpo] = useState(inicial ? relleno(inicial.texto) : "");
  const [error, setError] = useState<string | null>(null);
  const [enCurso, empezar] = useTransition();

  const alterna = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const todos = [...para, ...otros.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)];
  const listo = todos.length > 0 && asunto.trim() && cuerpo.trim();
  // QUE DIGA QUE FALTA (Monica, 28-oct-2026: el boton apagado, sin saber por que).
  const falta = [!todos.length && "a quién", !asunto.trim() && "asunto", !cuerpo.trim() && "texto"].filter(Boolean).join(" · ");

  const enviar = () => {
    setError(null);
    empezar(async () => {
      const r = await accionEnviar(oppId, { docs, para: todos, asunto, cuerpo, plantillaId: plantilla || null, presupuestoConjunto: conjunto && hojasEnCorreo.length > 1 });
      if (r.ok) router.push(`/comercial/oportunidades/${oppId}?bloque=2&enviado=1`);
      else setError(r.error);
    });
  };

  return (
    <div className="space-y-4">
      <section className={TARJETA}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-carbon">Enviar a la comunidad</h1>
          <div className="flex items-center gap-2.5">
            {falta && !enCurso && <span className="text-[13px] font-semibold text-alerta">Falta: {falta}</span>}
            <Link href={`/comercial/oportunidades/${oppId}?bloque=2`} className="rounded-lg border border-carbon/30 bg-white px-4 py-2 text-sm font-bold text-carbon/75 transition hover:border-carbon">
              Cancelar
            </Link>
            <button
              type="button"
              disabled={!listo || enCurso}
              onClick={enviar}
              className="rounded-lg bg-lima px-5 py-2 text-sm font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-carbon/40"
            >
              {enCurso ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-carbon/70">
          Sale de comercial.accesalia@gmail.com como <b className="text-carbon">«{remitente}»</b>
          {responderA ? (
            <>
              ; las respuestas van a <b className="text-carbon">{responderA}</b>
            </>
          ) : (
            "; ojo: el comercial no tiene correo en la app y las respuestas irán al buzón comercial"
          )}
          . Queda apuntado en el diario de la oportunidad.
        </p>
        {error && <p className="mt-3 rounded-lg border border-alerta/30 bg-alerta/5 px-3 py-2 text-sm text-alerta">{error}</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={TARJETA}>
          <span className={ETQ}>Documentos que se adjuntan</span>
          {documentos.length === 0 ? (
            <p className="mt-2 text-sm text-amber-900/80">Esta oportunidad no tiene todavía ningún documento generado.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {documentos.map((d) => (
                <li key={d.clave} className="flex items-start gap-2 text-sm">
                  <input id={d.clave} type="checkbox" checked={docs.includes(d.clave)} onChange={() => setDocs((l) => alterna(l, d.clave))} className="mt-1" />
                  <label htmlFor={d.clave} className="flex-1 text-carbon">
                    <b>{d.nombre}</b>
                    {d.fecha && <span className="text-carbon/65"> · {FECHA.format(new Date(d.fecha))}</span>}
                  </label>
                  <a href={d.enlace} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-lima-dark hover:underline">
                    ver
                  </a>
                </li>
              ))}
            </ul>
          )}
          {hojasEnCorreo.length > 1 && (
            <div className="mt-3 rounded-xl border border-[#9fb6cb] bg-white px-3 py-2.5 text-sm">
              <b>Van {hojasEnCorreo.length} hojas. ¿Cómo va el presupuesto?</b>
              <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="ppto" checked={!conjunto} onChange={() => elegirConjunto(false)} /> Uno por hoja
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="ppto" checked={conjunto} onChange={() => elegirConjunto(true)} /> Uno para todas
                </label>
              </div>
              {conjunto && <p className="mt-1 text-[12.5px] text-carbon/70">Se genera al enviar, con su número, juntando las hojas que van en el correo.</p>}
            </div>
          )}
        </section>

        <section className={TARJETA}>
          <span className={ETQ}>A quién</span>
          {destinatarios.length === 0 ? (
            <p className="mt-2 text-sm text-amber-900/80">Ningún contacto de esta oportunidad tiene correo guardado: escríbelo abajo.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {destinatarios.map((d) => (
                <li key={d.email} className="flex items-start gap-2 text-sm">
                  <input id={d.email} type="checkbox" checked={para.includes(d.email)} onChange={() => setPara((l) => alterna(l, d.email))} className="mt-1" />
                  <label htmlFor={d.email} className="text-carbon">
                    <b>{d.email}</b> <span className="text-carbon/65">· {d.quien}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-3 block">
            <span className={ETQ}>Otro correo</span>
            <input value={otros} onChange={(e) => setOtros(e.target.value)} placeholder="uno o varios, separados por coma" className={CAMPO} />
          </label>
        </section>
      </div>

      <section className={TARJETA}>
        <span className={ETQ}>Plantilla</span>
        <Elegir
          id="enviar_plantilla"
          nombre=""
          opciones={plantillas.map((p) => ({ valor: p.id, texto: p.nombre, pista: p.personal ? "personal" : "general" }))}
          valor={plantilla}
          alElegir={(v) => {
            setPlantilla(v);
            const p = plantillas.find((x) => x.id === v);
            if (p) {
              setAsunto(relleno(p.asunto));
              setCuerpo(relleno(p.texto));
            }
          }}
          vacio={plantillas.length ? "elige una, o escribe el correo a mano…" : "no hay plantillas todavía"}
          conPista
          clase="mt-1"
        />
        <label className="mt-3 block">
          <span className={ETQ}>Asunto</span>
          <input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Lo que se lee en la bandeja antes de abrirlo" className={CAMPO} />
        </label>
        <label className="mt-3 block">
          <span className={ETQ}>Texto</span>
          <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={12} placeholder="El cuerpo del correo" className={CAMPO + " resize-y leading-relaxed"} />
        </label>
      </section>
    </div>
  );
}
