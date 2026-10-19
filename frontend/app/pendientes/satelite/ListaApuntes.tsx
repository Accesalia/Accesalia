"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Apunte, TipoApunte } from "../../../lib/apuntesSatelite";
import { accionAltaAdmin, accionDescartar, accionHecho } from "./acciones";

// Cada apunte del satelite: lo que se mando desde el movil, quien y cuando, y
// lo que se hace con el: completarlo y darlo de alta, o descartarlo.

const fecha = (f: string | null) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "");
const BTN_PRIM = "rounded-lg bg-lima px-3.5 py-1.5 text-[13px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50";
const BTN = "rounded-lg border border-black/15 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-carbon/75 transition hover:border-carbon/40 disabled:opacity-50";
const CAMPO = "rounded-lg border border-carbon/40 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-lima";
const ETQ = "flex flex-col text-[11px] font-bold uppercase tracking-wide text-carbon/65";

export function ListaApuntes({ apuntes, tipo }: { apuntes: Apunte[]; tipo: TipoApunte }) {
  if (!apuntes.length)
    return <p className="mt-6 rounded-2xl border border-black/5 bg-white px-5 py-10 text-center text-[14px] text-carbon/60">Nada pendiente.</p>;
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {apuntes.map((a) => (
        <Fila key={a.id} a={a} tipo={tipo} />
      ))}
    </ul>
  );
}

function Fila({ a, tipo }: { a: Apunte; tipo: TipoApunte }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [completar, setCompletar] = useState(false);
  const [descartar, setDescartar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const d = a.datos as {
    telefono?: string | null; correo?: string | null; tipoContacto?: string | null; sobre?: string | null;
    contactoNombre?: string | null; contactoTelefono?: string | null; contactoCorreo?: string | null; fotos?: unknown[];
  };
  const [nombre, setNombre] = useState(a.nombre ?? "");
  const [telefono, setTelefono] = useState(d.telefono ?? "");
  const [correo, setCorreo] = useState(d.correo ?? "");
  const hacer = (p: Promise<{ ok: true } | { ok: false; error: string }>) =>
    empezar(async () => {
      const r = await p;
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  const titulo = tipo === "oportunidad" ? a.direccion ?? "(sin dirección)" : a.nombre ?? "(sin nombre)";
  const detalle = [
    tipo === "oportunidad" && (d.contactoNombre || d.contactoTelefono || d.contactoCorreo)
      ? `contacto: ${[d.contactoNombre, d.contactoTelefono, d.contactoCorreo].filter(Boolean).join(" · ")}`
      : null,
    tipo === "contacto" && d.tipoContacto ? d.tipoContacto : null,
    tipo !== "oportunidad" ? [d.telefono, d.correo].filter(Boolean).join(" · ") || null : null,
    tipo !== "oportunidad" && d.sobre ? `sobre: ${d.sobre}` : null,
    d.fotos?.length ? `${d.fotos.length} ${d.fotos.length === 1 ? "foto" : "fotos"}` : null,
  ].filter(Boolean);

  return (
    <li className="rounded-2xl border border-black/10 bg-white px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-carbon/60">
            {fecha(a.fecha ?? a.creadoEn)}
            {a.autor && ` · ${a.autor}`}
          </div>
          <div className="text-[16px] font-bold text-carbon">{titulo}</div>
          {detalle.length > 0 && <div className="text-[12.5px] text-carbon/65">{detalle.join(" · ")}</div>}
          {a.nota && <p className="mt-1.5 whitespace-pre-line text-[13.5px] text-carbon/85">«{a.nota}»</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          {tipo === "oportunidad" ? (
            <Link href={`/comercial/oportunidades/nueva?apunte=${a.id}`} className={BTN_PRIM}>
              Completar y dar de alta
            </Link>
          ) : tipo === "contacto" ? (
            <button type="button" className={BTN_PRIM} disabled={ocupado} onClick={() => hacer(accionHecho(a.id))}>
              Ya lo he colocado
            </button>
          ) : (
            <button type="button" className={BTN_PRIM} disabled={ocupado} onClick={() => setCompletar((x) => !x)}>
              Completar y dar de alta
            </button>
          )}
          <button type="button" className={BTN} disabled={ocupado} onClick={() => setDescartar((x) => !x)}>
            Descartar
          </button>
        </div>
      </div>

      {completar && tipo === "administrador" && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-[rgba(124,109,178,0.12)] p-3">
          <label className={ETQ}>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={CAMPO + " mt-1 w-[240px] font-normal normal-case"} />
          </label>
          <label className={ETQ}>
            Teléfono
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={CAMPO + " mt-1 w-[150px] font-normal"} />
          </label>
          <label className={ETQ}>
            Correo
            <input value={correo} onChange={(e) => setCorreo(e.target.value)} className={CAMPO + " mt-1 w-[230px] font-normal normal-case"} />
          </label>
          <button
            type="button"
            className={BTN_PRIM}
            disabled={ocupado || !nombre.trim() || (!telefono.trim() && !correo.trim())}
            onClick={() => hacer(accionAltaAdmin(a.id, { nombre, telefono, correo }))}
          >
            Dar de alta
          </button>
          <span className="w-full text-[12px] text-carbon/60">
            Se crea como administrador posible tuyo, todavía sin administración; la nota va a sus notas.
          </span>
        </div>
      )}

      {descartar && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Por qué no sigue? (opcional)" className={CAMPO + " min-w-[280px] flex-1"} />
          <button type="button" className={BTN} disabled={ocupado} onClick={() => hacer(accionDescartar(a.id, motivo))}>
            Descartarlo
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-[13px] font-semibold text-alerta">{error}</p>}
    </li>
  );
}
