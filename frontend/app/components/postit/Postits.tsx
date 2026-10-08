"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { abiertosMios, descartar, guardarDeVerdad, guardarSolo, misPostits, proponer } from "./acciones";

// EL POSTIT DE LA LLAMADA (Monica, 8-oct-2026): "el equivalente al bloc de
// postit de la secretaria". El boton LLAMADA no abre una pantalla: pone un
// postit delante, flotando, y la app sigue usandose por detras para mirar "que
// hay de lo mio". Se arrastra por la cabecera; clic dentro para escribir, clic
// fuera para usar la app. Puede haber varios a la vez.
//
// Se guarda SOLO a cada cambio, desde la primera letra, y sigue ahi hasta que
// se pulsa Guardar o Descartar. Si se recarga la pagina, los abiertos vuelven.
// Cada uno ve y reabre los suyos ("Mis llamadas"); direccion, todos.
//
// Vive en el layout de la app, no en una pagina: por eso no se cierra al
// navegar. El boton de la barra le habla con dos eventos del navegador.

export const EVENTO_NUEVA = "llamada:nueva";
export const EVENTO_LISTA = "llamada:lista";

type Elegido = { tipo: string; id: string | null; etiqueta: string } | null;
type Propuesta = { tipo: string; id: string; nombre: string; detalle: string };
type Nota = {
  id: string;
  estado: string;
  recibida_en: string | null;
  que_dicen: string;
  quien_texto: string;
  quien: Elegido;
  donde_texto: string;
  donde: Elegido;
  area: string | null;
  autor: string;
  mia: boolean;
};
type Ventana = { nota: Nota; x: number; y: number; z: number; plegado: boolean };

const AREAS = [
  ["comercial", "Comercial"],
  ["visita_escaneado", "Visita escaneado"],
  ["proyecto", "Proyecto"],
  ["requerimientos", "Requerimientos"],
  ["licencias", "Licencias"],
  ["visados", "Visados"],
  ["obra", "Obra"],
  ["subvenciones", "Subvenciones"],
  ["iee", "IEE"],
  ["caes", "CAES"],
  ["presupuestos", "3 presupuestos"],
  ["facturacion", "Facturación"],
] as const;

const NOMBRE_ESTADO: Record<string, string> = {
  abierta: "Sin guardar",
  por_colocar: "Guardada",
  descartada: "Descartada",
  colocada: "Colocada",
  archivada: "Archivada",
};

const ANCHO = 380;
const CAMPO =
  "w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima read-only:bg-white/60";
const ETIQUETA = "text-[10px] font-bold uppercase tracking-wide text-carbon/70";

const HORA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
const DIA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" });
function cuando(iso: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const hoy = DIA.format(new Date()) === DIA.format(d);
  return hoy ? HORA.format(d) : `${DIA.format(d)} · ${HORA.format(d)}`;
}

/** Enter pasa al campo siguiente, nunca envia (guia de estilo, regla 9). */
function enterPasaDeCampo(e: KeyboardEvent<HTMLDivElement>) {
  const t = e.target as HTMLElement;
  if (e.key !== "Enter" || t.tagName !== "INPUT") return;
  e.preventDefault();
  const campos = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("textarea, input, button[data-area]"));
  campos[campos.indexOf(t) + 1]?.focus();
}

// ------------------------------------------------------------ persona / direccion

function ConPropuestas({
  campo,
  etiqueta,
  pista,
  texto,
  elegido,
  nuevo,
  soloLeer,
  cambia,
}: {
  campo: "persona" | "direccion";
  etiqueta: string;
  pista: string;
  texto: string;
  elegido: Elegido;
  nuevo: { tipo: string; texto: string };
  soloLeer: boolean;
  cambia: (texto: string, elegido: Elegido) => void;
}) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [buscando, setBuscando] = useState(false);
  const ultima = useRef("");

  // Se busca cuando deja de teclear un momento, no a cada letra.
  useEffect(() => {
    const q = texto.trim();
    if (soloLeer || q.length < 2) {
      setPropuestas([]);
      return;
    }
    const t = setTimeout(async () => {
      ultima.current = q;
      setBuscando(true);
      const r = await proponer(campo, q).catch(() => []);
      if (ultima.current === q) {
        setPropuestas(r);
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [texto, campo, soloLeer]);

  const esLa = (tipo: string, id: string | null) => elegido?.tipo === tipo && elegido?.id === id;
  const elegir = (e: NonNullable<Elegido>) => cambia(texto, esLa(e.tipo, e.id) ? null : e);
  // Lo elegido no se pierde de vista aunque la busqueda ya no lo traiga.
  const otras = propuestas.filter((p) => !esLa(p.tipo, p.id));

  const pildora = (activo: boolean, nueva = false) =>
    `rounded-md border px-2 py-0.5 text-left text-[13px] leading-snug transition ${
      nueva
        ? activo
          ? "border-amber-400 bg-form-nuevo text-carbon"
          : "border-amber-200 bg-form-nuevo/60 text-amber-900/80 hover:border-amber-400"
        : activo
          ? "border-lima bg-lima-soft text-carbon"
          : "border-black/10 bg-white text-carbon/90 hover:border-lima"
    }`;

  return (
    <div>
      <span className={ETIQUETA}>
        {etiqueta}
        {buscando ? " …" : ""}
      </span>
      <input
        value={texto}
        onChange={(e) => cambia(e.target.value, elegido)}
        placeholder={pista}
        autoComplete="off"
        readOnly={soloLeer}
        className={`${CAMPO} mt-0.5`}
      />
      <div className="mt-1 flex flex-col gap-1">
        {elegido && (
          <button
            type="button"
            tabIndex={-1}
            disabled={soloLeer}
            onClick={() => cambia(texto, null)}
            className={pildora(true, elegido.tipo === nuevo.tipo)}
            title={soloLeer ? undefined : "Quitar"}
          >
            <span className="mr-1 font-bold text-lima-dark">✓</span>
            {elegido.etiqueta}
          </button>
        )}
        {otras.map((p) => (
          <button
            key={`${p.tipo}:${p.id}`}
            type="button"
            tabIndex={-1}
            onClick={() => elegir({ tipo: p.tipo, id: p.id, etiqueta: [p.nombre, p.detalle].filter(Boolean).join(" · ") })}
            className={pildora(false)}
          >
            <b className="font-semibold">{p.nombre}</b>
            {p.detalle && <span className="text-carbon/65"> · {p.detalle}</span>}
          </button>
        ))}
        {!soloLeer && texto.trim().length >= 2 && elegido?.tipo !== nuevo.tipo && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => elegir({ tipo: nuevo.tipo, id: null, etiqueta: nuevo.texto })}
            className={pildora(false, true)}
          >
            {nuevo.texto}
          </button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ un postit

function UnPostit({
  ventana,
  delante,
  mover,
  plegar,
  cerrar,
  actualizar,
}: {
  ventana: Ventana;
  delante: () => void;
  mover: (x: number, y: number) => void;
  plegar: () => void;
  cerrar: () => void;
  actualizar: (n: Nota) => void;
}) {
  const { nota, x, y, z, plegado } = ventana;
  // Lo descartado no se toca: lo lee direccion tal cual quedo.
  const soloLeer = !nota.mia || nota.estado === "descartada";
  const [guardado, setGuardado] = useState<"" | "guardando" | "guardado" | "error">("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const cambiado = useRef(false);
  const arrastre = useRef<{ dx: number; dy: number } | null>(null);

  const datos = useCallback(
    (n: Nota) => ({
      id: n.id,
      que_dicen: n.que_dicen,
      quien_texto: n.quien_texto,
      quien: n.quien ? { tipo: n.quien.tipo, id: n.quien.id } : null,
      donde_texto: n.donde_texto,
      donde: n.donde ? { tipo: n.donde.tipo, id: n.donde.id } : null,
      area: n.area,
    }),
    [],
  );

  const vacio = !nota.que_dicen.trim() && !nota.quien_texto.trim() && !nota.donde_texto.trim() && !nota.quien && !nota.donde && !nota.area;

  // SE GUARDA SOLO: un momento despues de cada cambio.
  useEffect(() => {
    if (soloLeer || !cambiado.current || vacio) return;
    const t = setTimeout(async () => {
      setGuardado("guardando");
      const r = await guardarSolo(datos(nota)).catch((e) => ({ error: String(e) }));
      if ("error" in r) setGuardado("error");
      else {
        setGuardado("guardado");
        if (!nota.recibida_en) actualizar({ ...nota, recibida_en: new Date().toISOString() });
      }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nota.que_dicen, nota.quien_texto, nota.quien, nota.donde_texto, nota.donde, nota.area]);

  const cambia = (parte: Partial<Nota>) => {
    cambiado.current = true;
    setAviso("");
    actualizar({ ...nota, ...parte });
  };

  const pulsar = async (que: "guardar" | "descartar") => {
    setOcupado(true);
    const r = await (que === "guardar" ? guardarDeVerdad(datos(nota)) : descartar(datos(nota))).catch((e) => ({
      error: String(e),
    }));
    setOcupado(false);
    if ("error" in r) setAviso(r.error);
    else cerrar();
  };

  const empezar = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    delante();
    arrastre.current = { dx: e.clientX - x, dy: e.clientY - y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const arrastrar = (e: PointerEvent<HTMLDivElement>) => {
    if (!arrastre.current) return;
    const nx = Math.min(Math.max(e.clientX - arrastre.current.dx, 0), window.innerWidth - 120);
    const ny = Math.min(Math.max(e.clientY - arrastre.current.dy, 0), window.innerHeight - 40);
    mover(nx, ny);
  };

  const abierta = nota.estado === "abierta";
  const sePuedeGuardar = nota.mia && abierta;
  const resumen = nota.que_dicen.trim().split("\n")[0].slice(0, 40) || nota.quien_texto || nota.donde_texto || "Llamada";

  return (
    <div
      onPointerDownCapture={delante}
      style={{ left: x, top: y, zIndex: z, width: ANCHO }}
      className="fixed flex max-h-[calc(100vh-16px)] flex-col overflow-hidden rounded-2xl border-2 border-lima bg-form-card shadow-2xl"
    >
      <div
        onPointerDown={empezar}
        onPointerMove={arrastrar}
        onPointerUp={() => (arrastre.current = null)}
        className="flex cursor-move select-none items-center gap-2 bg-lima-soft px-3 py-1.5"
      >
        <span className="text-sm font-bold text-carbon">{plegado ? resumen : "Llamada"}</span>
        <span className="text-xs text-carbon/65">{cuando(nota.recibida_en)}</span>
        {!nota.mia && <span className="truncate text-xs text-carbon/65">· {nota.autor}</span>}
        <span className="ml-auto text-[11px] text-carbon/65">
          {guardado === "guardando" ? "guardando…" : guardado === "error" ? <b className="text-alerta">sin guardar</b> : NOMBRE_ESTADO[nota.estado]}
        </span>
        <button
          type="button"
          onClick={plegar}
          title={plegado ? "Desplegar" : "Plegar"}
          className="rounded px-1.5 text-base leading-none text-carbon/60 hover:bg-black/5 hover:text-carbon"
        >
          {plegado ? "▢" : "–"}
        </button>
        {/* Uno sin guardar no se cierra: se queda hasta Guardar o Descartar.
            Salvo que este en blanco, que no hay nada que perder. */}
        {(!abierta || soloLeer || vacio) && (
          <button
            type="button"
            onClick={cerrar}
            title="Cerrar"
            className="rounded px-1.5 text-base leading-none text-carbon/60 hover:bg-black/5 hover:text-carbon"
          >
            ✕
          </button>
        )}
      </div>

      {!plegado && (
        <div className="flex flex-col gap-2.5 overflow-y-auto p-3" onKeyDown={enterPasaDeCampo}>
          {sePuedeGuardar && (
            <div className="flex items-center justify-end gap-2">
              {abierta && (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => pulsar("descartar")}
                  className="rounded-lg border border-black/10 px-3 py-1 text-sm font-semibold text-carbon/60 transition hover:border-carbon/30 hover:text-carbon"
                >
                  Descartar
                </button>
              )}
              <button
                type="button"
                disabled={ocupado}
                onClick={() => pulsar("guardar")}
                className="rounded-lg bg-lima px-4 py-1 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
          )}
          {aviso && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[13px] text-amber-900">{aviso}</p>
          )}

          <label className="block">
            <span className={ETIQUETA}>¿Qué me dicen?</span>
            <textarea
              value={nota.que_dicen}
              onChange={(e) => cambia({ que_dicen: e.target.value })}
              readOnly={soloLeer}
              autoFocus={nota.mia && abierta && !nota.que_dicen}
              rows={6}
              placeholder="Lo que te están contando, tal cual"
              className={`${CAMPO} mt-0.5 resize-y leading-relaxed`}
            />
          </label>

          <ConPropuestas
            campo="persona"
            etiqueta="Quién llama"
            pista="nombre y empresa, lo que salga"
            texto={nota.quien_texto}
            elegido={nota.quien}
            nuevo={{ tipo: "nuevo", texto: "Nueva persona de contacto, por crear" }}
            soloLeer={soloLeer}
            cambia={(t, e) => cambia({ quien_texto: t, quien: e })}
          />
          <ConPropuestas
            campo="direccion"
            etiqueta="Dirección"
            pista="calle y número"
            texto={nota.donde_texto}
            elegido={nota.donde}
            nuevo={{ tipo: "nueva", texto: "Nueva dirección, por crear" }}
            soloLeer={soloLeer}
            cambia={(t, e) => cambia({ donde_texto: t, donde: e })}
          />

          <div>
            <span className={ETIQUETA}>Área</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {AREAS.map(([clave, nombre]) => (
                <button
                  key={clave}
                  type="button"
                  data-area
                  disabled={soloLeer}
                  onClick={() => cambia({ area: nota.area === clave ? null : clave })}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
                    nota.area === clave
                      ? "border-lima bg-lima text-carbon"
                      : "border-black/10 bg-white text-carbon/80 enabled:hover:border-lima"
                  }`}
                >
                  {nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ mis llamadas

function Lista({
  veTodo,
  abrir,
  cerrar,
}: {
  veTodo: boolean;
  abrir: (n: Nota) => void;
  cerrar: () => void;
}) {
  const [todas, setTodas] = useState(false);
  const [notas, setNotas] = useState<Nota[] | null>(null);

  useEffect(() => {
    setNotas(null);
    misPostits(todas).then(setNotas).catch(() => setNotas([]));
  }, [todas]);

  return (
    <div className="fixed right-4 top-[68px] z-[60] flex max-h-[calc(100vh-84px)] w-[420px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-[#bfbfbf] bg-white shadow-2xl">
      <div className="flex items-center gap-3 border-b border-black/10 px-4 py-2.5">
        <b className="text-sm font-bold uppercase tracking-wider text-carbon/85">{todas ? "Todas las llamadas" : "Mis llamadas"}</b>
        {veTodo && (
          <button
            type="button"
            onClick={() => setTodas((t) => !t)}
            className="text-xs font-semibold text-lima-dark underline-offset-2 hover:underline"
          >
            {todas ? "ver solo las mías" : "ver todas"}
          </button>
        )}
        <button
          type="button"
          onClick={cerrar}
          title="Cerrar"
          className="ml-auto rounded px-1.5 text-base leading-none text-carbon/60 hover:bg-black/5 hover:text-carbon"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto">
        {notas === null && <p className="px-4 py-3 text-sm text-carbon/65">Cargando…</p>}
        {notas?.length === 0 && <p className="px-4 py-3 text-sm text-carbon/65">Ninguna todavía.</p>}
        {notas?.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => abrir(n)}
            className={`block w-full border-b border-black/5 px-4 py-2 text-left transition hover:bg-lima-soft/60 ${
              n.estado === "descartada" ? "opacity-55" : ""
            }`}
          >
            <div className="flex items-baseline gap-2 text-xs text-carbon/65">
              <span>{cuando(n.recibida_en)}</span>
              <span className="font-semibold">{NOMBRE_ESTADO[n.estado]}</span>
              {!n.mia && <span>· {n.autor}</span>}
            </div>
            <div className="line-clamp-2 text-sm text-carbon">{n.que_dicen || "—"}</div>
            {(n.quien || n.quien_texto || n.donde || n.donde_texto) && (
              <div className="truncate text-xs text-carbon/70">
                {[n.quien?.etiqueta ?? n.quien_texto, n.donde?.etiqueta ?? n.donde_texto].filter(Boolean).join(" · ")}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ el que los lleva

export function Postits({ veTodo }: { veTodo: boolean }) {
  const [ventanas, setVentanas] = useState<Ventana[]>([]);
  const [lista, setLista] = useState(false);
  const arriba = useRef(50);

  const colocar = useCallback((nota: Nota, plegado = false) => {
    setVentanas((vs) => {
      if (vs.some((v) => v.nota.id === nota.id)) {
        arriba.current += 1;
        return vs.map((v) => (v.nota.id === nota.id ? { ...v, z: arriba.current, plegado: false } : v));
      }
      // Cada uno nuevo, un poco mas abajo y a la izquierda que el anterior.
      const n = vs.length;
      const x = Math.max(8, window.innerWidth - ANCHO - 24 - n * 28);
      const y = Math.min(76 + n * 28, window.innerHeight - 200);
      arriba.current += 1;
      return [...vs, { nota, x, y, z: arriba.current, plegado }];
    });
  }, []);

  // Los que se quedaron abiertos vuelven solos (se recargo, se cerro la pestaña).
  useEffect(() => {
    abiertosMios()
      .then((ns) => ns.reverse().forEach((n) => colocar(n, ns.length > 1)))
      .catch(() => {});
  }, [colocar]);

  useEffect(() => {
    const nueva = () =>
      colocar({
        id: crypto.randomUUID(),
        estado: "abierta",
        recibida_en: null,
        que_dicen: "",
        quien_texto: "",
        quien: null,
        donde_texto: "",
        donde: null,
        area: null,
        autor: "",
        mia: true,
      });
    const verLista = () => setLista((l) => !l);
    window.addEventListener(EVENTO_NUEVA, nueva);
    window.addEventListener(EVENTO_LISTA, verLista);
    return () => {
      window.removeEventListener(EVENTO_NUEVA, nueva);
      window.removeEventListener(EVENTO_LISTA, verLista);
    };
  }, [colocar]);

  const cambiar = (id: string, f: (v: Ventana) => Ventana) => setVentanas((vs) => vs.map((v) => (v.nota.id === id ? f(v) : v)));

  return (
    <>
      {ventanas.map((v) => (
        <UnPostit
          key={v.nota.id}
          ventana={v}
          delante={() => {
            if (v.z === arriba.current) return;
            arriba.current += 1;
            cambiar(v.nota.id, (w) => ({ ...w, z: arriba.current }));
          }}
          mover={(x, y) => cambiar(v.nota.id, (w) => ({ ...w, x, y }))}
          plegar={() => cambiar(v.nota.id, (w) => ({ ...w, plegado: !w.plegado }))}
          cerrar={() => setVentanas((vs) => vs.filter((w) => w.nota.id !== v.nota.id))}
          actualizar={(nota) => cambiar(v.nota.id, (w) => ({ ...w, nota }))}
        />
      ))}
      {lista && (
        <Lista
          veTodo={veTodo}
          abrir={(n) => {
            colocar(n);
            setLista(false);
          }}
          cerrar={() => setLista(false)}
        />
      )}
    </>
  );
}
