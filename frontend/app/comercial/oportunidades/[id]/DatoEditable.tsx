"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { accionAnadirContacto, accionBuscarPersonas, accionDatoCabecera } from "./acciones";
import type { CampoCabecera, OpcionPersona } from "../../../../lib/datosCabecera";

// EDITAR EN LA CABECERA (Monica, 27-oct-2026): al pulsar el dato (o «— no se apunto») se abre aqui mismo un buscador
// de la agenda; si no esta, se crea en el momento en su caja amarilla (guia de estilo, formularios: «lo que se crea
// nuevo se despliega dentro, en amarillo»). Cada dato se guarda en su casa (lib/datosCabecera.ts).

const CAMPO = "w-full rounded-[6px] border border-[#cfcfcf] bg-white px-2 py-1 text-[12.5px] placeholder:text-carbon/55";
const BOTON = "rounded-[6px] bg-lima px-3 py-1 text-[12px] font-bold text-white transition hover:bg-lima-dark disabled:opacity-50";
const ENLACE = "text-[12px] font-semibold text-[#104269] underline-offset-2 hover:underline";

const QUE_TRAJO = [
  { valor: "administrador", texto: "Administrador" },
  { valor: "contrata", texto: "Comercial de contrata" },
  { valor: "vecino", texto: "Vecino" },
  { valor: "", texto: "Otro" },
];

export function DatoEditable({
  oppId,
  campo,
  hayDato,
  children,
}: {
  oppId: string;
  campo: CampoCabecera;
  /** Si ya hay alguien puesto (para el aviso de cambiar el administrador). */
  hayDato: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<OpcionPersona[]>([]);
  const [elegida, setElegida] = useState<OpcionPersona | null>(null);
  const [nueva, setNueva] = useState(false);
  const [n, setN] = useState({ nombre: "", telefono: "", correo: "", que: campo === "trajo" ? "" : "vecino", otro: "" });
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto || q.trim().length < 2) return setLista([]);
    const t = setTimeout(() => accionBuscarPersonas(oppId, q, campo).then(setLista), 250);
    return () => clearTimeout(t);
  }, [q, abierto, oppId, campo]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => caja.current && !caja.current.contains(e.target as Node) && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const cerrar = () => {
    setAbierto(false); setQ(""); setElegida(null); setNueva(false); setError(null);
    setN({ nombre: "", telefono: "", correo: "", que: campo === "trajo" ? "" : "vecino", otro: "" });
  };
  const guardar = () => {
    if (campo === "admin" && hayDato && !confirm("Vas a cambiar el administrador de la COMUNIDAD: cambia también en todas sus oportunidades. El anterior queda en el historial. ¿Seguimos?")) return;
    empezar(async () => {
      setError(null);
      const r = await accionDatoCabecera(oppId, campo, {
        valor: nueva ? null : (elegida?.valor ?? null),
        nueva: nueva
          ? { nombre: n.nombre, telefono: n.telefono.trim() || null, correo: n.correo.trim() || null, que: n.que || null, otro: n.otro.trim() || null, contrataId: null }
          : null,
      });
      if (!r.ok) return setError(r.error);
      cerrar();
      router.refresh();
    });
  };

  return (
    <span className="relative inline">
      <button type="button" onClick={() => setAbierto(!abierto)} title="Editar" className="group text-left">
        {children}
        <span className="ml-1 text-[11px] text-[#104269] opacity-60 group-hover:opacity-100">✎</span>
      </button>
      {abierto && (
        <div ref={caja} className="absolute left-0 top-full z-40 mt-1 w-[380px] rounded-[10px] border border-[#cfcfcf] bg-white p-2.5 text-[12.5px] font-normal text-carbon shadow-lg">
          {!nueva ? (
            <>
              <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setElegida(null); }} placeholder="Busca por nombre o apellidos…" className={CAMPO} />
              {lista.length > 0 && (
                <ul className="mt-1 max-h-[220px] overflow-y-auto">
                  {lista.map((o) => (
                    <li key={o.valor}>
                      <button
                        type="button"
                        onClick={() => setElegida(o)}
                        className={"block w-full rounded-[5px] px-2 py-1 text-left hover:bg-[#eef2f6] " + (elegida?.valor === o.valor ? "bg-[#E3EAF0] font-bold" : "")}
                      >
                        {o.texto} <span className="font-normal text-carbon/65">· {o.pista}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q.trim().length >= 2 && !lista.length && <p className="mt-1 text-carbon/65">No hay nadie con ese nombre.</p>}
              <div className="mt-2 flex items-center gap-3">
                <button type="button" className={BOTON} disabled={ocupado || !elegida} onClick={guardar}>Guardar</button>
                <button type="button" className={ENLACE} onClick={() => { setNueva(true); setN({ ...n, nombre: q }); }}>+ Es nueva: crearla</button>
                <button type="button" className={ENLACE + " ml-auto"} onClick={cerrar}>cancelar</button>
              </div>
            </>
          ) : (
            <div className="rounded-[8px] border border-[#ecd27a] bg-[#fff5cc] p-2">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b4a00]">
                {campo === "admin" ? "Administrador nuevo" : campo === "contacto" ? "Contacto nuevo de la comunidad" : "Quién nos la trae (nuevo)"}
              </div>
              <div className="grid gap-1.5">
                <input autoFocus value={n.nombre} onChange={(e) => setN({ ...n, nombre: e.target.value })} placeholder="Nombre y apellidos" className={CAMPO} />
                <div className="grid grid-cols-2 gap-1.5">
                  <input value={n.telefono} onChange={(e) => setN({ ...n, telefono: e.target.value })} placeholder="Teléfono" className={CAMPO} />
                  <input value={n.correo} onChange={(e) => setN({ ...n, correo: e.target.value })} placeholder="Correo" className={CAMPO} />
                </div>
                {campo === "trajo" && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {QUE_TRAJO.map((x) => (
                      <label key={x.texto} className="flex items-center gap-1">
                        <input type="radio" name={`que-${campo}`} checked={n.que === x.valor} onChange={() => setN({ ...n, que: x.valor })} /> {x.texto}
                      </label>
                    ))}
                  </div>
                )}
                {(campo === "contacto" || (campo === "trajo" && !n.que)) && (
                  <input value={n.otro} onChange={(e) => setN({ ...n, otro: e.target.value })} placeholder={campo === "contacto" ? "Su papel: presidente, secretaria… (si no, vecino)" : "Qué es: técnico municipal, comercial de…"} className={CAMPO} />
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" className={BOTON} disabled={ocupado || !n.nombre.trim()} onClick={guardar}>Crear y guardar</button>
                <button type="button" className={ENLACE} onClick={() => setNueva(false)}>volver a buscar</button>
                <button type="button" className={ENLACE + " ml-auto"} onClick={cerrar}>cancelar</button>
              </div>
            </div>
          )}
          {error && <p className="mt-1 font-semibold text-alerta">{error}</p>}
        </div>
      )}
    </span>
  );
}

/** «+ añadir contacto» de la caja de contactos de la comunidad (estaba «por montar»). */
export function AnadirContacto({ oppId }: { oppId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [n, setN] = useState({ nombre: "", telefono: "", correo: "", otro: "" });
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  if (!abierto)
    return (
      <button type="button" onClick={() => setAbierto(true)} className="mt-2 inline-block text-[11.5px] font-semibold text-[#104269] hover:underline">
        + añadir contacto
      </button>
    );
  const guardar = () =>
    empezar(async () => {
      setError(null);
      const r = await accionAnadirContacto(oppId, { nombre: n.nombre, telefono: n.telefono.trim() || null, correo: n.correo.trim() || null, que: "vecino", otro: n.otro.trim() || null, contrataId: null });
      if (!r.ok) return setError(r.error);
      setAbierto(false); setN({ nombre: "", telefono: "", correo: "", otro: "" });
      router.refresh();
    });
  return (
    <div className="mt-2 grid gap-1.5 rounded-[8px] border border-[#ecd27a] bg-[#fff5cc] p-2 text-[12.5px]">
      <input autoFocus value={n.nombre} onChange={(e) => setN({ ...n, nombre: e.target.value })} placeholder="Nombre y apellidos" className={CAMPO} />
      <div className="grid grid-cols-2 gap-1.5">
        <input value={n.telefono} onChange={(e) => setN({ ...n, telefono: e.target.value })} placeholder="Teléfono" className={CAMPO} />
        <input value={n.correo} onChange={(e) => setN({ ...n, correo: e.target.value })} placeholder="Correo" className={CAMPO} />
      </div>
      <input value={n.otro} onChange={(e) => setN({ ...n, otro: e.target.value })} placeholder="Su papel: presidente, secretaria… (si no, vecino)" className={CAMPO} />
      <div className="flex items-center gap-3">
        <button type="button" className={BOTON} disabled={ocupado || !n.nombre.trim()} onClick={guardar}>Guardar</button>
        <button type="button" className={ENLACE} onClick={() => setAbierto(false)}>cancelar</button>
      </div>
      {error && <p className="font-semibold text-alerta">{error}</p>}
    </div>
  );
}
