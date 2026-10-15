"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TitularFirma, UsoFirma } from "../../../lib/firmaDigital";
import { accionElegirFirmaDeUso, accionRetirarFirma, accionSubirFirma, type Resultado } from "./acciones";

// Arriba, un titular por tarjeta: su certificado vivo (de quien es, quien lo
// emite, hasta cuando vale) con renovar, PDF de prueba y retirar; sin
// certificado, subirlo. Debajo, los usos: con que titular firma cada uno.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
const BOTON = "rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-carbon/75 hover:border-lima hover:text-carbon disabled:opacity-50";
const PRINCIPAL = "rounded-xl bg-lima px-4 py-2 text-sm font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-50";

function Caducidad({ hasta }: { hasta: string }) {
  const dias = Math.floor((new Date(hasta).getTime() - Date.now()) / 864e5);
  if (dias < 0) return <span className="rounded-full bg-alerta px-2 py-0.5 text-[12px] font-bold text-white">Caducada</span>;
  if (dias <= 60) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[12px] font-bold text-amber-900">Caduca en {dias} días</span>;
  return null;
}

function Subir({ empresa, onFin }: { empresa: string; onFin: (r: Resultado) => void }) {
  const [pendiente, empezar] = useTransition();
  return (
    <form
      action={(datos) =>
        empezar(async () => {
          const r = await accionSubirFirma(datos).catch((e: Error) => ({ ok: false as const, error: e.message }));
          onFin(r);
        })
      }
      className="mt-3 space-y-2 rounded-xl border border-lima/60 bg-lima-soft/40 p-3"
    >
      <input type="hidden" name="empresa" value={empresa} />
      <label className="block text-[13px] font-semibold text-carbon/80">
        Certificado (.p12 o .pfx)
        <input type="file" name="certificado" accept=".p12,.pfx" required className="mt-1 block w-full text-sm text-carbon file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:font-semibold" />
      </label>
      <label className="block text-[13px] font-semibold text-carbon/80">
        Contraseña del certificado
        <input type="password" name="clave" required autoComplete="off" className="mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm focus:border-lima focus:outline-none" />
      </label>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pendiente} className={PRINCIPAL}>{pendiente ? "Comprobando…" : "Guardar la firma"}</button>
        <button type="button" disabled={pendiente} onClick={() => onFin({ ok: true })} className={BOTON}>Cancelar</button>
      </div>
    </form>
  );
}

export function Firmas({ titulares, usos }: { titulares: TitularFirma[]; usos: UsoFirma[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  const hacer = (accion: () => Promise<Resultado>) =>
    empezar(async () => {
      setError(null);
      const r = await accion().catch((e: Error) => ({ ok: false as const, error: e.message }));
      if (!r.ok) setError(r.error);
      router.refresh();
    });

  return (
    <div className="mt-5 space-y-8">
      <p className="text-[15px] text-carbon/75">
        La app firma sola con estos certificados. Se guardan cifrados: nadie los ve ni los descarga, solo se usan para firmar.
      </p>
      {error && <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}

      <section className="grid gap-4 md:grid-cols-3">
        {titulares.map((t) => (
          <div key={t.clave} className="flex flex-col rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold text-carbon">{t.nombre}</h2>
              {t.nif && <span className="text-[13px] tabular-nums text-carbon/65">{t.nif}</span>}
            </div>
            {t.firma ? (
              <>
                <dl className="mt-3 space-y-1.5 text-[14px] text-carbon/85">
                  <div><dt className="inline font-semibold">Certificado: </dt><dd className="inline">{t.firma.titular}</dd></div>
                  {t.firma.nif && <div><dt className="inline font-semibold">NIF del certificado: </dt><dd className="inline tabular-nums">{t.firma.nif}</dd></div>}
                  <div><dt className="inline font-semibold">Lo emite: </dt><dd className="inline">{t.firma.emisor}</dd></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span><b>Válido hasta:</b> {FECHA.format(new Date(t.firma.validoHasta))}</span>
                    <Caducidad hasta={t.firma.validoHasta} />
                  </div>
                  <div className="text-[13px] text-carbon/65">
                    Subido {FECHA.format(new Date(t.firma.subidaEn))}{t.firma.subidaPor ? ` por ${t.firma.subidaPor}` : ""}
                  </div>
                </dl>
                {subiendo === t.clave ? (
                  <Subir empresa={t.clave} onFin={(r) => { if (!r.ok) setError(r.error); else { setSubiendo(null); router.refresh(); } }} />
                ) : (
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <a href={`/gestiones/firmas/prueba/${t.clave}`} className={BOTON}>PDF de prueba</a>
                    <button type="button" onClick={() => { setError(null); setSubiendo(t.clave); }} className={BOTON}>Renovar</button>
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => {
                        if (confirm(`¿Retirar la firma de ${t.nombre}? Lo que firme con ella dejará de firmarse hasta que subas otra.`))
                          hacer(() => accionRetirarFirma(t.firma!.id));
                      }}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-alerta hover:underline disabled:opacity-50"
                    >
                      Retirar
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mt-3 text-[14px] text-carbon/65">Sin firma subida.</p>
                {subiendo === t.clave ? (
                  <Subir empresa={t.clave} onFin={(r) => { if (!r.ok) setError(r.error); else { setSubiendo(null); router.refresh(); } }} />
                ) : (
                  <div className="mt-auto pt-4">
                    <button type="button" onClick={() => { setError(null); setSubiendo(t.clave); }} className={PRINCIPAL}>Subir el certificado</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-carbon">Con qué firma se firma cada cosa</h2>
        <ul className="mt-3 divide-y divide-black/5">
          {usos.map((u) => {
            const t = titulares.find((x) => x.clave === u.empresa);
            return (
              <li key={u.clave} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
                <div className="min-w-[260px] flex-1">
                  <p className="font-semibold text-carbon">{u.nombre}</p>
                  {u.descripcion && <p className="text-[13px] text-carbon/70">{u.descripcion}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.empresa ?? ""}
                    disabled={pendiente}
                    onChange={(e) => hacer(() => accionElegirFirmaDeUso(u.clave, e.target.value || null))}
                    className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm focus:border-lima focus:outline-none"
                  >
                    <option value="">Sin firmar</option>
                    {titulares.map((x) => (
                      <option key={x.clave} value={x.clave}>{x.nombre}</option>
                    ))}
                  </select>
                  {t && !t.firma && <span className="text-[12px] font-semibold text-amber-800">{t.nombre} no tiene firma subida: no firmará</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
