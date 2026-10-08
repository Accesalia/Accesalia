"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Volver } from "../components/Volver";

// LA PANTALLA LLAMADA. Se escribe mientras se habla: el cursor nace en "¿Que me
// dicen?", y en persona y direccion se teclean palabras sueltas. La app propone
// al lado; elegir es para despues, y si no se elige nada se guarda lo escrito.

type Propuesta = { tipo: string; id: string; nombre: string; detalle: string };
type Elegida = { tipo: string; id: string | null } | null;

const CAMPO =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima";
const ETIQUETA = "text-[10px] font-bold uppercase tracking-wide text-carbon/70";
const TARJETA = "rounded-2xl border border-[#bfbfbf] bg-form-card p-4";

/** Enter pasa al campo siguiente, nunca envia (guia de estilo, regla 9). */
function enterPasaDeCampo(e: KeyboardEvent<HTMLFormElement>) {
  const t = e.target as HTMLElement;
  if (e.key !== "Enter" || t.tagName !== "INPUT") return;
  e.preventDefault();
  const campos = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>("textarea, input:not([type=hidden]), button[data-area]"),
  );
  campos[campos.indexOf(t) + 1]?.focus();
}

function ConPropuestas({
  campo,
  etiqueta,
  pista,
  nombre,
  nuevo,
  proponer,
}: {
  campo: "persona" | "direccion";
  etiqueta: string;
  pista: string;
  nombre: string;
  nuevo: { tipo: string; texto: string };
  proponer: (campo: "persona" | "direccion", q: string) => Promise<Propuesta[]>;
}) {
  const [q, setQ] = useState("");
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [elegida, setElegida] = useState<Elegida>(null);
  const ultima = useRef("");

  // Se busca cuando deja de teclear un momento, no a cada letra.
  useEffect(() => {
    const limpio = q.trim();
    if (limpio.length < 2) {
      setPropuestas([]);
      return;
    }
    const t = setTimeout(async () => {
      ultima.current = limpio;
      setBuscando(true);
      const r = await proponer(campo, limpio).catch(() => []);
      if (ultima.current === limpio) {
        setPropuestas(r);
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, campo, proponer]);

  const elegir = (e: Elegida) =>
    setElegida((ya) => (ya && e && ya.tipo === e.tipo && ya.id === e.id ? null : e));
  const esLa = (tipo: string, id: string | null) => elegida?.tipo === tipo && elegida?.id === id;

  // Lo elegido no se pierde de vista aunque la busqueda cambie.
  const lista = [...propuestas];
  if (elegida && elegida.tipo !== nuevo.tipo && !lista.some((p) => esLa(p.tipo, p.id))) {
    const antes = ELEGIDAS.get(`${elegida.tipo}:${elegida.id}`);
    if (antes) lista.unshift(antes);
  }

  return (
    <div className={TARJETA}>
      <input type="hidden" name={`${nombre}_tipo`} value={elegida?.tipo ?? ""} />
      <input type="hidden" name={`${nombre}_id`} value={elegida?.id ?? ""} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <label className="block">
          <span className={ETIQUETA}>{etiqueta}</span>
          <input
            name={`${nombre}_texto`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={pista}
            autoComplete="off"
            className={`${CAMPO} mt-1`}
          />
        </label>
        <div>
          <span className={ETIQUETA}>Propuestas{buscando ? " …" : ""}</span>
          <div className="mt-1 flex flex-col gap-1.5">
            {lista.map((p) => (
              <button
                key={`${p.tipo}:${p.id}`}
                type="button"
                tabIndex={-1}
                onClick={() => {
                  ELEGIDAS.set(`${p.tipo}:${p.id}`, p);
                  elegir({ tipo: p.tipo, id: p.id });
                }}
                className={`rounded-lg border px-2.5 py-1 text-left text-sm transition ${
                  esLa(p.tipo, p.id)
                    ? "border-lima bg-lima-soft text-carbon"
                    : "border-black/10 bg-white text-carbon/90 hover:border-lima"
                }`}
              >
                {esLa(p.tipo, p.id) && <span className="mr-1 font-bold text-lima-dark">✓</span>}
                <b className="font-semibold">{p.nombre}</b>
                {p.detalle && <span className="text-carbon/65"> · {p.detalle}</span>}
              </button>
            ))}
            {q.trim().length >= 2 && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => elegir({ tipo: nuevo.tipo, id: null })}
                className={`rounded-lg border px-2.5 py-1 text-left text-sm transition ${
                  esLa(nuevo.tipo, null)
                    ? "border-amber-400 bg-form-nuevo text-carbon"
                    : "border-amber-200 bg-form-nuevo/60 text-amber-900/80 hover:border-amber-400"
                }`}
              >
                {esLa(nuevo.tipo, null) && <span className="mr-1 font-bold">✓</span>}
                {nuevo.texto}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Lo que se eligio, para volver a enseñarlo si la busqueda ya no lo trae.
const ELEGIDAS = new Map<string, Propuesta>();

export function Formulario({
  yo,
  areas,
  accion,
  proponer,
}: {
  yo: string;
  areas: { clave: string; nombre: string }[];
  accion: (fd: FormData) => Promise<void>;
  proponer: (campo: "persona" | "direccion", q: string) => Promise<Propuesta[]>;
}) {
  const [area, setArea] = useState<string | null>(null);
  const [ahora, setAhora] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setAhora(
      new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    );
  }, []);

  return (
    <form action={accion} onKeyDown={enterPasaDeCampo} onSubmit={() => setGuardando(true)}>
      <Volver />

      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-black/10 pb-3">
        <h1 className="text-3xl font-bold leading-tight text-carbon">Llamada</h1>
        <p className="text-sm text-carbon/65">
          {ahora} · apunta <b className="font-semibold text-carbon/85">{yo}</b>
        </p>
        <div className="ml-auto flex gap-2">
          <Cancelar />
          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-lima px-6 py-2 text-base font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div className={TARJETA}>
          <label className="block">
            <span className={ETIQUETA}>¿Qué me dicen?</span>
            <textarea
              name="que_dicen"
              required
              autoFocus
              rows={8}
              placeholder="Lo que te están contando, tal cual"
              className={`${CAMPO} mt-1 min-h-[200px] resize-y text-base leading-relaxed`}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ConPropuestas
            campo="persona"
            etiqueta="Quién llama"
            pista="nombre y empresa, lo que salga"
            nombre="quien"
            nuevo={{ tipo: "nuevo", texto: "Nueva persona de contacto, por crear" }}
            proponer={proponer}
          />
          <ConPropuestas
            campo="direccion"
            etiqueta="Dirección"
            pista="calle y número"
            nombre="donde"
            nuevo={{ tipo: "nueva", texto: "Nueva dirección, por crear" }}
            proponer={proponer}
          />
        </div>

        <div className={TARJETA}>
          <span className={ETIQUETA}>Área</span>
          <input type="hidden" name="area" value={area ?? ""} />
          <div className="mt-1.5 flex flex-wrap gap-2">
            {areas.map((a) => (
              <button
                key={a.clave}
                type="button"
                data-area
                onClick={() => setArea((ya) => (ya === a.clave ? null : a.clave))}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                  area === a.clave
                    ? "border-lima bg-lima text-carbon"
                    : "border-black/10 bg-white text-carbon/80 hover:border-lima"
                }`}
              >
                {a.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}

/** Cancelar: descarta lo escrito y vuelve a donde se estaba. */
function Cancelar() {
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/menu"))}
      className="rounded-xl border border-black/10 px-5 py-2 text-base font-semibold text-carbon/60 transition hover:border-carbon/30 hover:text-carbon"
    >
      Cancelar
    </button>
  );
}
