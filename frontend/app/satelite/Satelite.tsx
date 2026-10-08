"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Elegir } from "../components/Elegir";
import { CANALES } from "../../lib/tipoDeNota";
import { reducirFoto } from "../../lib/reducirFoto";
import {
  enviarCola,
  guardarListas,
  leerCola,
  leerListas,
  meterEnCola,
  sacarDeCola,
  type Listas,
  type NotaEnCola,
} from "../../lib/colaSatelite";

// EL SATELITE (Monica, 8-oct-2026): "una minicosa-satelite que sea solo pulsar
// para guardar una nueva nota del diario". En el movil, con un icono en la
// pantalla de inicio. Lo mismo que "Grabar entrada" del PC, en pequeño:
//   · la nota, escrita o dictada con el micro del teclado;
//   · como te has enterado: VISITA por defecto, que se esta en la calle;
//   · direccion y persona, buscando en listas que viven en el movil;
//   · fotos con la camara;
//   · y SIN CONEXION: la nota espera en el movil y sale sola cuando hay red.
// Si la direccion no esta, de momento se marca "revisar despues" y se coloca
// desde la bandeja del PC, que ya sabe darla de alta como nueva.

const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const ETQ = "block text-[11px] font-bold uppercase tracking-[0.05em] text-[#5c4208]/75";
const CAMPO =
  "w-full rounded-xl border border-carbon/40 bg-white px-3 py-2.5 text-[16px] text-carbon outline-none placeholder:text-carbon/45 focus:border-lima";

export function Satelite() {
  const [listas, setListas] = useState<Listas | null>(null);
  const [cola, setCola] = useState<NotaEnCola[]>([]);
  const [red, setRed] = useState(true);
  const [sinSesion, setSinSesion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const [texto, setTexto] = useState("");
  const [canal, setCanal] = useState("visita");
  const [fecha, setFecha] = useState(hoyISO());
  const [opp, setOpp] = useState("");
  const [escrita, setEscrita] = useState("");
  const [con, setCon] = useState("");
  const [fotos, setFotos] = useState<{ foto: Blob; mini: Blob; vista: string }[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  const refrescarCola = useCallback(async () => setCola(await leerCola()), []);

  // Enviar lo que espera y traer las listas frescas, si hay red.
  const sincronizar = useCallback(async () => {
    if (!navigator.onLine) return setRed(false);
    setRed(true);
    setEnviando(true);
    const r = await enviarCola();
    setSinSesion(r === "sin_sesion");
    setRed(r !== "sin_red");
    await refrescarCola();
    setEnviando(false);
    if (r === "enviadas") {
      try {
        const l = await fetch("/api/satelite/listas", { cache: "no-store" });
        if (l.ok && !l.redirected) {
          const nuevas = (await l.json()) as Listas;
          await guardarListas(nuevas);
          setListas(nuevas);
        }
      } catch {
        /* sin red: se quedan las que habia */
      }
    }
  }, [refrescarCola]);

  useEffect(() => {
    leerListas().then((l) => l && setListas(l));
    refrescarCola();
    sincronizar();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw-satelite.js", { scope: "/satelite" }).catch(() => {});
    const alVolver = () => sincronizar();
    window.addEventListener("online", alVolver);
    window.addEventListener("offline", () => setRed(false));
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && sincronizar());
    const cada = setInterval(sincronizar, 60_000);
    return () => {
      window.removeEventListener("online", alVolver);
      clearInterval(cada);
    };
  }, [refrescarCola, sincronizar]);

  const oppElegida = listas?.oportunidades.find((o) => o.valor === opp) ?? null;
  const deOtro =
    oppElegida && listas?.miComercialId && oppElegida.comercialId && oppElegida.comercialId !== listas.miComercialId ? oppElegida.comercial : null;
  const lista = con.split(":")[0];
  const haySitio = opp !== "" || escrita !== "" || lista === "puesto" || lista === "persona";
  const puede = texto.trim() !== "" && canal !== "" && haySitio && !preparando;

  const añadirFotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setPreparando(true);
    try {
      const nuevas: { foto: Blob; mini: Blob; vista: string }[] = [];
      for (const f of Array.from(files).filter((x) => x.type.startsWith("image/"))) {
        const { foto, mini } = await reducirFoto(f);
        nuevas.push({ foto, mini, vista: URL.createObjectURL(mini) });
      }
      setFotos((a) => [...a, ...nuevas].slice(0, 20));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPreparando(false);
    }
  };

  const guardar = async () => {
    if (!puede) return;
    setError(null);
    const personaTexto = listas?.personas.find((p) => p.valor === con)?.texto;
    const nota: NotaEnCola = {
      id: crypto.randomUUID(),
      creada: new Date().toISOString(),
      texto: texto.trim(),
      canal,
      fecha,
      oportunidadId: opp || null,
      persona: con || null,
      dondeTexto: opp ? null : escrita || null,
      resumen: [oppElegida?.texto ?? (escrita ? `${escrita} (revisar)` : null), personaTexto].filter(Boolean).join(" · ") || "nota",
      fotos: fotos.map(({ foto, mini }) => ({ foto, mini })),
    };
    await meterEnCola(nota);
    fotos.forEach((f) => URL.revokeObjectURL(f.vista));
    setTexto("");
    setCanal("visita");
    setFecha(hoyISO());
    setOpp("");
    setEscrita("");
    setCon("");
    setFotos([]);
    setAviso(navigator.onLine ? "Guardada. Enviándola…" : "Guardada en el móvil. Saldrá sola en cuanto haya cobertura.");
    setTimeout(() => setAviso(null), 4000);
    await refrescarCola();
    sincronizar();
  };

  const corregir = async (n: NotaEnCola) => {
    setTexto(n.texto);
    setCanal(n.canal);
    setFecha(n.fecha);
    setOpp(n.oportunidadId ?? "");
    setEscrita(n.dondeTexto ?? "");
    setCon(n.persona ?? "");
    setFotos(n.fotos.map((f) => ({ ...f, vista: URL.createObjectURL(f.mini) })));
    await sacarDeCola(n.id);
    await refrescarCola();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto min-h-screen max-w-[560px] bg-[#fcf8e7] px-4 pb-24 pt-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[18px] font-extrabold uppercase tracking-[0.04em] text-[#5c4208]">Nota rápida</h1>
        <span className={"rounded-full px-2.5 py-0.5 text-[11px] font-bold " + (red ? "bg-lima-soft text-lima-dark" : "bg-amber-100 text-amber-900")}>
          {red ? (enviando ? "enviando…" : "con conexión") : "sin conexión"}
        </span>
      </div>
      {listas && <p className="mt-0.5 text-[12px] text-carbon/55">{listas.quien}</p>}
      {!listas && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Todavía no tengo las listas de direcciones y personas. Ábrelo una vez con cobertura y se quedan guardadas en el móvil.
        </p>
      )}
      {sinSesion && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Tienes que volver a entrar para enviar las notas. No se pierde nada: siguen en el móvil.{" "}
          <a href="/entrar?volver=/satelite" className="font-bold underline">
            Entrar
          </a>
        </p>
      )}

      {/* ---- la nota ---- */}
      <label className="mt-4 block">
        <span className={ETQ}>Qué ha pasado</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          placeholder="Escríbelo o díctalo con el micro del teclado."
          className={CAMPO + " mt-1 resize-y leading-relaxed"}
        />
      </label>

      <div className="mt-3">
        <span className={ETQ}>Cómo te has enterado</span>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {CANALES.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => setCanal(c.valor)}
              className={
                "rounded-xl border py-2 text-[13px] font-bold transition " +
                (canal === c.valor ? "border-[#5c4208] bg-[#5c4208] text-white" : "border-carbon/30 bg-white text-carbon/75")
              }
            >
              {c.texto}
            </button>
          ))}
        </div>
      </div>

      {/* ---- el sitio ---- */}
      <div className="mt-3">
        <span className={ETQ}>Dirección</span>
        {escrita && !opp ? (
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#8a6410] bg-form-nuevo px-3 py-2.5 text-[15px]">
            <span className="min-w-0 flex-1 font-semibold text-[#5c4208]">
              {escrita} <span className="font-normal opacity-70">· se revisa después</span>
            </span>
            <button type="button" aria-label="Quitar" onClick={() => setEscrita("")} className="px-1 text-lg text-[#5c4208]/70">
              ×
            </button>
          </div>
        ) : (
          <Elegir
            id="sat_opp"
            nombre=""
            opciones={listas?.oportunidades ?? []}
            valor={opp}
            alElegir={setOpp}
            vacio="busca la dirección…"
            marco="border-carbon/40"
            conPista
            clase="mt-1"
            noEsta={(q) => {
              setOpp("");
              setEscrita(q);
            }}
          />
        )}
        {escrita && !opp && (
          <p className="mt-1 text-[12px] text-carbon/60">No está en la lista: la colocas desde «Notas pendientes» en el PC, y allí puedes darla de alta como nueva.</p>
        )}
        {deOtro && (
          <p className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[13px] text-amber-900">
            Esta oportunidad es de <b>{deOtro}</b>. Puedes guardar la nota igualmente.
          </p>
        )}
      </div>

      <div className="mt-3">
        <span className={ETQ}>Con quién</span>
        <Elegir
          id="sat_con"
          nombre=""
          opciones={listas?.personas ?? []}
          valor={con}
          alElegir={setCon}
          vacio="con nadie en concreto"
          marco="border-carbon/40"
          conPista
          clase="mt-1"
        />
        {lista === "pc" && !opp && !escrita && (
          <p className="mt-1 text-[12px] text-amber-900">Con un presidente o un vecino, pon también la dirección.</p>
        )}
      </div>

      {/* ---- fotos y fecha ---- */}
      <div className="mt-3">
        <span className={ETQ}>Fotos</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {fotos.map((f, i) => (
            <div key={f.vista} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.vista} alt={`Foto ${i + 1}`} className="size-16 rounded-lg border border-[#8a6410]/40 object-cover" />
              <button
                type="button"
                aria-label="Quitar la foto"
                onClick={() => setFotos((a) => a.filter((x) => x !== f))}
                className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border border-[#8a6410] bg-white text-[13px] text-[#5c4208]"
              >
                ×
              </button>
            </div>
          ))}
          {/* DOS BOTONES (Monica, 8-oct-2026: "no abre la camara, sino la
              galeria"). Los Android de ahora, si no se pide la camara
              expresamente, abren directamente la galeria. */}
          <button
            type="button"
            disabled={preparando}
            onClick={() => camara.current?.click()}
            className="rounded-xl border border-[#8a6410] bg-form-nuevo px-4 py-2.5 text-[14px] font-bold text-[#5c4208] disabled:opacity-50"
          >
            {preparando ? "Preparando…" : "📷 Hacer foto"}
          </button>
          <button
            type="button"
            disabled={preparando}
            onClick={() => galeria.current?.click()}
            className="rounded-xl border border-carbon/30 bg-white px-4 py-2.5 text-[14px] font-semibold text-carbon/75 disabled:opacity-50"
          >
            🖼️ De la galería
          </button>
          <input
            ref={camara}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              añadirFotos(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={galeria}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              añadirFotos(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-[13px] text-carbon/70">
        <span className={ETQ + " !inline"}>Cuándo</span>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-lg border border-carbon/30 bg-white px-2 py-1 text-[14px]" />
      </label>

      {error && <p className="mt-3 text-[13px] font-semibold text-alerta">{error}</p>}

      <button
        type="button"
        disabled={!puede}
        onClick={guardar}
        className="mt-5 w-full rounded-2xl bg-lima py-4 text-[17px] font-extrabold text-carbon shadow-sm transition active:scale-[0.99] disabled:bg-black/10 disabled:text-carbon/35"
      >
        Guardar
      </button>
      {!puede && texto.trim() !== "" && (
        <p className="mt-1.5 text-center text-[12px] text-carbon/55">
          {!haySitio ? "Falta la dirección o la persona." : canal === "" ? "Falta cómo te has enterado." : ""}
        </p>
      )}
      {aviso && <p className="mt-3 rounded-xl bg-lima-soft px-3 py-2 text-center text-[14px] font-semibold text-lima-dark">{aviso}</p>}

      {/* ---- lo que espera en el movil ---- */}
      {cola.length > 0 && (
        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-3">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.05em] text-carbon/65">
            En el móvil, esperando: {cola.length}
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {cola.map((n) => (
              <li key={n.id} className="rounded-xl border border-black/5 bg-hueso/60 px-3 py-2 text-[13px]">
                <div className="font-semibold text-carbon/80">{n.resumen}</div>
                <div className="line-clamp-2 text-carbon/65">{n.texto}</div>
                {n.fotos.length > 0 && <div className="text-[12px] text-carbon/50">{n.fotos.length} foto(s)</div>}
                {n.error && (
                  <div className="mt-1 text-[12px] text-alerta">
                    No se ha podido guardar: {n.error}{" "}
                    <button type="button" onClick={() => corregir(n)} className="font-bold underline">
                      Corregir
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
