"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { casa, palabrasDe, palabrasDeDireccion } from "../../lib/casarBusqueda";
import type { AdminConocido, ListasBuscar, Opcion, OppConocida } from "../../lib/buscarYComprobar";
import { accionComprobarAdministrador, accionComprobarDireccion } from "./acciones";

// BUSCAR Y COMPROBAR (Monica, 27-oct-2026; maqueta validada docs/figma/buscar-y-comprobar.html): dos paneles por
// intencion. Buscar filtra al escribir y da una lista; comprobar pregunta al servidor y da una respuesta.

const MAXIMO = 12;
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "Europe/Madrid" });
const fecha = (d: string) => FECHA.format(new Date(`${d}T12:00:00`));
const diasDesde = (d: string) => Math.max(0, Math.floor((Date.now() - new Date(`${d}T12:00:00`).getTime()) / 86_400_000));
/** «hoy», «hace 21 días» o, si pasa de un año, «sin contacto desde agosto de 2019». */
function contacto(d: string | null): { texto: string; viejo: boolean } {
  if (!d) return { texto: "sin contacto apuntado", viejo: true };
  const n = diasDesde(d);
  if (n === 0) return { texto: "último contacto hoy", viejo: false };
  if (n > 365) return { texto: `sin contacto desde ${MES.format(new Date(`${d}T12:00:00`))}`, viejo: true };
  return { texto: `último contacto hace ${n} ${n === 1 ? "día" : "días"}`, viejo: n > 90 };
}

const ETQ: Record<Opcion["etq"], [string, string]> = {
  direccion: ["Dirección", "bg-[#E3EAF0] text-[#104269]"],
  administracion: ["Administración", "bg-[#F3ECDD] text-[#7a5a1c]"],
  contrata: ["Contrata", "bg-[#EDE7F3] text-[#5b3f7a]"],
  persona: ["Persona", "bg-lima-soft text-lima-dark"],
};

const PANEL = "rounded-[18px] border border-black/15 bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,.18),0_18px_36px_-18px_rgba(0,0,0,.6)] sm:p-7";
const CHIP = (on: boolean) =>
  "inline-flex items-center gap-2 rounded-full border-[1.5px] px-[18px] py-[9px] text-[14.5px] font-bold transition " +
  (on ? "border-[#2e3236] bg-[#2e3236] text-white" : "border-carbon/20 bg-white text-carbon/70 hover:border-carbon/45 hover:text-carbon");
const CAJA =
  "flex items-center gap-3 rounded-[14px] border-[1.5px] border-transparent bg-hueso px-[18px] py-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,.08)] transition focus-within:border-lima focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(122,201,67,.18)]";
const ENTRADA = "min-w-0 flex-1 border-0 bg-transparent text-[17px] text-carbon outline-none placeholder:text-carbon/40";
const IR = "ml-auto whitespace-nowrap text-[12.5px] font-bold text-lima-dark";
const BOTON_OSCURO = "inline-flex rounded-full bg-[#2e3236] px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-black";
const BOTON_LIMA = "inline-flex rounded-full bg-lima px-5 py-2.5 text-[14px] font-bold text-carbon transition hover:brightness-95";

function Lupa() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="shrink-0 text-carbon/45" aria-hidden>
      <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function BuscarYComprobar({ listas, altaAdmin }: { listas: ListasBuscar; altaAdmin: boolean }) {
  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <Buscar listas={listas} />
      <Comprobar altaAdmin={altaAdmin} />
    </div>
  );
}

// ------------------------------------------------------------------ quiero buscar

function Buscar({ listas }: { listas: ListasBuscar }) {
  const router = useRouter();
  const [que, setQue] = useState<"dir" | "gente">("dir");
  const [q, setQ] = useState("");

  const filas = useMemo(() => {
    const palabras = que === "dir" ? palabrasDeDireccion(q) : palabrasDe(q);
    if (!palabras.length) return { lista: [] as (Opcion & { sub?: boolean; por?: string | null })[], total: 0 };
    const lista: (Opcion & { sub?: boolean; por?: string | null })[] = [];
    const vistas = new Set<string>();
    let total = 0;
    for (const s of que === "dir" ? listas.direcciones : listas.gente) {
      if (vistas.has(s.id)) continue;
      const c = casa(palabras, s);
      if (!c) continue;
      total++;
      if (lista.filter((x) => !x.sub).length >= MAXIMO) continue;
      vistas.add(s.id);
      lista.push({ ...s, por: c.por });
      // Una administracion, con todas sus personas debajo (y no se repiten sueltas).
      for (const h of s.hijos ?? []) {
        vistas.add(h.id);
        lista.push({ ...h, sub: true });
      }
    }
    return { lista, total };
  }, [q, que, listas]);

  const ir = (s: Opcion) => s.href && router.push(s.href);

  return (
    <section className={PANEL}>
      <h2 className="font-[family-name:var(--letra-menu)] text-[24px] font-extrabold text-carbon">Quiero buscar</h2>
      <p className="mt-1 text-[14px] text-carbon/60">Algo que sé que está y quiero abrir.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={CHIP(que === "dir")} onClick={() => setQue("dir")}>
          📍 Una dirección
        </button>
        <button type="button" className={CHIP(que === "gente")} onClick={() => setQue("gente")}>
          👤 Una persona o empresa
        </button>
      </div>
      <label className={CAJA + " mt-4"}>
        <Lupa />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filas.lista[0]) ir(filas.lista[0]);
          }}
          placeholder={que === "dir" ? "Calle y número…" : "Nombre, teléfono o correo…"}
          className={ENTRADA}
          aria-label="Quiero buscar"
        />
      </label>
      <p className="mt-2 px-1 text-[12.5px] text-carbon/50">
        {que === "dir"
          ? "Calle y número, sin tildes, en cualquier orden. Al elegir, a su ficha."
          : "Nombre, teléfono o correo: personas, administraciones, contratas, vecinos… sin pensar qué es."}
      </p>
      {palabrasDe(q).length > 0 && (
        <div className="mt-3">
          {filas.lista.length === 0 ? (
            <p className="px-1 text-[14px] text-carbon/60">Nada con «{q.trim()}». Prueba con menos palabras.</p>
          ) : (
            <>
              {filas.lista.map((s) => (
                <button
                  key={(s.sub ? "h:" : "") + s.id}
                  type="button"
                  onClick={() => ir(s)}
                  disabled={!s.href}
                  className={"flex w-full items-center gap-3 rounded-[10px] py-2.5 pr-3 text-left transition hover:bg-lima-soft disabled:cursor-default " + (s.sub ? "pl-10" : "pl-3")}
                >
                  <span className={"whitespace-nowrap rounded-md px-[7px] py-[2px] text-[10.5px] font-extrabold uppercase tracking-[.07em] " + ETQ[s.etq][1]}>{ETQ[s.etq][0]}</span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-carbon">{s.nombre}</span>
                    {(s.por || s.detalle) && (
                      <span className="block text-[12.5px] text-carbon/60">{[s.por ? `por ${s.por}` : null, s.detalle].filter(Boolean).join(" · ")}</span>
                    )}
                  </span>
                  {s.href && <span className={IR}>Ir a su ficha →</span>}
                </button>
              ))}
              {filas.total > MAXIMO && (
                <p className="mt-2 px-1 text-[12.5px] text-carbon/50">
                  Salen las {MAXIMO} primeras de {filas.total}: escribe algo más para afinar.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ quiero comprobar si ya existe

type Respuesta =
  | { de: "dir"; q: string; opps: OppConocida[] }
  | { de: "adm"; q: string; admins: AdminConocido[] };

function Comprobar({ altaAdmin }: { altaAdmin: boolean }) {
  const [que, setQue] = useState<"dir" | "adm">("dir");
  const [q, setQ] = useState("");
  const [r, setR] = useState<Respuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const comprobar = () => {
    const texto = q.trim();
    if (!texto) return;
    setError(null);
    empezar(async () => {
      if (que === "dir") {
        const x = await accionComprobarDireccion(texto);
        if (!x.ok) return setError(x.error);
        setR({ de: "dir", q: texto, opps: x.opps });
      } else {
        const x = await accionComprobarAdministrador(texto);
        if (!x.ok) return setError(x.error);
        setR({ de: "adm", q: texto, admins: x.admins });
      }
    });
  };

  return (
    <section className={PANEL}>
      <h2 className="font-[family-name:var(--letra-menu)] text-[24px] font-extrabold text-carbon">Quiero comprobar si ya existe</h2>
      <p className="mt-1 text-[14px] text-carbon/60">Antes de empezar algo nuevo: ¿la conocemos ya?, ¿lo lleva alguien?</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={CHIP(que === "dir")} onClick={() => (setQue("dir"), setR(null))}>
          📍 Esta dirección
        </button>
        <button type="button" className={CHIP(que === "adm")} onClick={() => (setQue("adm"), setR(null))}>
          🏢 Este administrador
        </button>
      </div>
      <form
        className="mt-4 flex items-stretch gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          comprobar();
        }}
      >
        <label className={CAJA + " flex-1"}>
          <Lupa />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={que === "dir" ? "La dirección: calle y número…" : "La administración o la persona…"}
            className={ENTRADA}
            aria-label="Quiero comprobar si ya existe"
          />
        </label>
        <button type="submit" disabled={ocupado || !q.trim()} className={BOTON_OSCURO + " items-center disabled:opacity-50"}>
          {ocupado ? "Mirando…" : "Comprobar"}
        </button>
      </form>
      {error && <p className="mt-3 text-[13px] text-alerta">{error}</p>}
      {r && !ocupado && <div className="mt-4">{r.de === "dir" ? <RespuestaDireccion q={r.q} opps={r.opps} /> : <RespuestaAdmin q={r.q} admins={r.admins} altaAdmin={altaAdmin} />}</div>}
    </section>
  );
}

function RespuestaDireccion({ q, opps }: { q: string; opps: OppConocida[] }) {
  if (!opps.length)
    return (
      <div className="rounded-[14px] border-2 border-[#d9d9d9] bg-hueso p-5">
        <div className="font-[family-name:var(--letra-menu)] text-[22px] font-extrabold text-carbon">No, nunca la hemos visto</div>
        <div className="mt-1 text-[14.5px] text-carbon/65">Ninguna opp en «{q}». Es nueva: puedes empezar.</div>
        <Link href={`/comercial/oportunidades/nueva?direccion=${encodeURIComponent(q)}`} className={BOTON_LIMA + " mt-5"}>
          + Abrir oportunidad con esta dirección
        </Link>
      </div>
    );
  // La primera vez que la vimos: la opp mas antigua.
  const primera = [...opps].filter((o) => o.apertura).sort((a, b) => a.apertura!.localeCompare(b.apertura!))[0];
  return (
    <div className="rounded-[14px] border-2 border-lima bg-lima-soft p-5">
      <div className="font-[family-name:var(--letra-menu)] text-[22px] font-extrabold text-lima-dark">Sí, ya la conocemos</div>
      {primera?.apertura && (
        <div className="mt-1 text-[14.5px] text-carbon/75">
          Vista por primera vez el {fecha(primera.apertura)}
          {primera.comercial && (
            <>
              , por <b>{primera.comercial}</b>
            </>
          )}
          .
        </div>
      )}
      <div className="mt-3">
        {opps.map((o) => {
          const c = contacto(o.ultimoContacto);
          return (
            <div key={o.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-black/10 py-3">
              <div className="min-w-[220px] flex-1">
                <div className="text-[15.5px] font-bold text-carbon">{o.nombre}</div>
                <div className="text-[13px] text-carbon/65">
                  {[o.codigo, o.estado === "abierta" ? "abierta" : o.estado, o.comercial ? `de ${o.comercial}` : null, o.por ? `por ${o.por}` : null].filter(Boolean).join(" · ")}
                </div>
                {o.paso && (
                  <div className="mt-0.5 text-[13.5px] text-carbon/85">
                    {o.paso}
                    {o.diasEnElPaso !== null && <b> · {o.diasEnElPaso} {o.diasEnElPaso === 1 ? "día" : "días"} ahí</b>}
                  </div>
                )}
                <div className={"text-[13px] " + (c.viejo ? "font-semibold text-alerta" : "text-carbon/65")}>{c.texto}</div>
              </div>
              <Link href={`/comercial/oportunidades/${o.id}`} className={BOTON_OSCURO}>
                Ir a su ficha →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RespuestaAdmin({ q, admins, altaAdmin }: { q: string; admins: AdminConocido[]; altaAdmin: boolean }) {
  if (!admins.length)
    return (
      <div className="rounded-[14px] border-2 border-[#d9d9d9] bg-hueso p-5">
        <div className="font-[family-name:var(--letra-menu)] text-[22px] font-extrabold text-carbon">No, no está en ninguna cartera</div>
        <div className="mt-1 text-[14.5px] text-carbon/65">Nadie lleva «{q}» ni a nadie que trabaje allí.</div>
        {altaAdmin ? (
          <Link href="/administracion/administraciones/nueva" className={BOTON_LIMA + " mt-5"}>
            + Dar de alta este administrador
          </Link>
        ) : (
          <p className="mt-3 text-[13.5px] text-carbon/70">Para darlo de alta, pídeselo a Administración.</p>
        )}
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      {admins.map((a) => {
        const carteras = new Set(a.personas.map((p) => p.lleva).filter(Boolean)).size;
        return (
          <div key={a.nombre} className="rounded-[14px] border-2 border-lima bg-lima-soft p-5">
            <div className="font-[family-name:var(--letra-menu)] text-[22px] font-extrabold text-lima-dark">Sí, ya existe</div>
            <div className="mt-1 text-[16px] font-semibold text-carbon">
              {a.nombre} ·{" "}
              {a.personas.length === 0
                ? "sin nadie en ninguna cartera"
                : `${a.personas.length} ${a.personas.length === 1 ? "persona" : "personas"}${carteras > 1 ? `, en ${carteras} carteras` : ""}`}
            </div>
            <div className="mt-3">
              {a.personas.map((p) => {
                const c = contacto(p.ultimoContacto);
                const cifras = [p.enCurso ? `${p.enCurso} en curso` : null, p.ganadas ? `${p.ganadas} ${p.ganadas === 1 ? "ganada" : "ganadas"}` : null, p.perdidas ? `${p.perdidas} perdidas` : null]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div key={p.personaId} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/10 py-3">
                    <div className="min-w-[170px] flex-1">
                      <div className="text-[15px] font-bold text-carbon">{p.nombre}</div>
                      <div className="text-[13px] text-carbon/65">{cifras || "sin opps"}</div>
                    </div>
                    <div className="text-[14px]">{p.lleva ? <>la lleva <b>{p.lleva}</b></> : <span className="text-carbon/60">no la lleva nadie</span>}</div>
                    <div className={"text-[13px] " + (c.viejo ? "font-semibold text-alerta" : "text-carbon/65")}>{c.texto}</div>
                    <Link href={`/consulta/personas/${p.personaId}`} className={IR}>
                      Ir a su ficha →
                    </Link>
                  </div>
                );
              })}
            </div>
            {a.empresaId && (
              <Link href={`/administracion/administraciones/${a.empresaId}`} className={BOTON_OSCURO + " mt-3"}>
                Ir a la ficha de {a.nombre} →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
