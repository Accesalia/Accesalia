"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir } from "../../../../components/Elegir";
import { accionEnviar } from "./acciones";

// ENVIAR A LA COMUNIDAD (Monica, 12-oct-2026): elegir los documentos, a quien y
// la plantilla; el texto se retoca antes de enviar. Sale del buzon comercial con
// el nombre del comercial de la oportunidad, y las respuestas van a su correo.

type Doc = { clave: string; tipo: string; nombre: string; enlace: string; fecha: string | null };
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
  destinatarios,
  plantillas,
  remitente,
  responderA,
}: {
  oppId: string;
  documentos: Doc[];
  destinatarios: Dest[];
  plantillas: Plantilla[];
  remitente: string;
  responderA: string | null;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState<string[]>([]);
  const [para, setPara] = useState<string[]>([]);
  const [otros, setOtros] = useState("");
  const [plantilla, setPlantilla] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enCurso, empezar] = useTransition();

  const alterna = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const todos = [...para, ...otros.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)];
  const listo = todos.length > 0 && asunto.trim() && cuerpo.trim();

  const enviar = () => {
    setError(null);
    empezar(async () => {
      const r = await accionEnviar(oppId, { docs, para: todos, asunto, cuerpo, plantillaId: plantilla || null });
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
              setAsunto(p.asunto);
              setCuerpo(p.texto);
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
