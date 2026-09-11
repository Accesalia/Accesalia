"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { altaEmpleado } from "./acciones";
import { confirmarSubida, prepararSubida } from "./accionesDocumentos";

// Alta de un empleado, TODO en un sitio (Monica, 11-sep-2026: "si se hace todo
// en un solo sitio, marea menos"): quien es, sus funciones, datos personales,
// contrato, horario, vacaciones, el bruto (solo direccion) y los documentos.
// Primero se crea la persona; despues el navegador sube los documentos a su
// carpeta, uno a uno, y se abre su ficha.

function proporcional(desde: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) return "";
  const anio = Number(desde.slice(0, 4));
  const dia = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  const total = (dia(`${anio}-12-31`) - dia(`${anio}-01-01`)) / 864e5 + 1;
  const quedan = (dia(`${anio}-12-31`) - dia(desde)) / 864e5 + 1;
  return String(Math.round(((22 * quedan) / total) * 2) / 2).replace(".", ",");
}

const DOCS = [
  { tipo: "dni", etiqueta: "DNI o NIE" },
  { tipo: "contrato", etiqueta: "Contrato" },
  { tipo: "titulacion", etiqueta: "Titulación" },
  { tipo: "irpf", etiqueta: "IRPF (modelo 145)" },
] as const;

const campo = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";
const etiqueta = "grid gap-1 text-xs font-semibold text-carbon/55";

function Grupo({ titulo, children, nota }: { titulo: string; children: React.ReactNode; nota?: string }) {
  return (
    <fieldset className="grid content-start gap-2.5 rounded-xl border border-black/5 p-4">
      <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-carbon/45">{titulo}</legend>
      {children}
      {nota && <p className="text-xs text-carbon/45">{nota}</p>}
    </fieldset>
  );
}

export function AltaEmpleado({ hoy, funciones, direccion }: { hoy: string; funciones: { id: string; nombre: string }[]; direccion: boolean }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [desde, setDesde] = useState(hoy);
  const [dias, setDias] = useState(proporcional(hoy));
  const [ficheros, setFicheros] = useState<Record<string, File | null>>({});
  const [estado, setEstado] = useState<{ tono: "mal" | "espera"; texto: string } | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (const d of DOCS) fd.delete(`doc_${d.tipo}`); // los ficheros van aparte, directos al almacen
    setEstado({ tono: "espera", texto: "Dando de alta…" });
    const r = await altaEmpleado(fd);
    if (!r.ok) return setEstado({ tono: "mal", texto: r.error });

    const aSubir = DOCS.filter((d) => ficheros[d.tipo]);
    const fallos: string[] = [];
    for (const [i, d] of aSubir.entries()) {
      const f = ficheros[d.tipo]!;
      setEstado({ tono: "espera", texto: `Alta hecha. Subiendo documentos (${i + 1} de ${aSubir.length}): ${d.etiqueta}…` });
      try {
        const p = await prepararSubida({ personaId: r.id, tipo: d.tipo, nombre: f.name });
        if (!p.ok) throw new Error(p.error);
        const put = await fetch(p.url, { method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "false" }, body: f });
        if (!put.ok) throw new Error("subida");
        const c = await confirmarSubida({ personaId: r.id, tipo: d.tipo, ruta: p.ruta, nombre: f.name, periodo: null });
        if (!c.ok) throw new Error(c.error);
      } catch {
        fallos.push(d.etiqueta);
      }
    }
    // A su ficha. Si algun documento no subio, se dice y se sube desde alli.
    router.push(`/rrhh?p=${r.id}&aviso=${fallos.length ? "alta_sin_docs" : "alta"}#ficha`);
  }

  const trabajando = estado?.tono === "espera";
  return (
    <div id="alta" className="mt-4 scroll-mt-24 rounded-2xl border border-lima/40 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/5 pb-3">
        <h3 className="text-xl font-bold text-carbon">Dar de alta a una persona</h3>
        <Link href="/rrhh" className="text-sm font-semibold text-carbon/50 hover:text-carbon">Cancelar ✕</Link>
      </div>

      <form ref={form} onSubmit={enviar} className="mt-4 grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Quién es">
          <div className="grid grid-cols-2 gap-2.5">
            <label className={etiqueta}>Nombre<input name="nombre" required className={campo} /></label>
            <label className={etiqueta}>Apellidos<input name="apellidos" className={campo} /></label>
          </div>
          <label className={etiqueta}>
            Correo de Accesalia
            <input name="email" type="email" placeholder="inicialapellido.accesalia@gmail.com" className={campo} />
            <span className="font-normal text-carbon/45">Con él entrará en la app. Sin correo, está en RRHH pero no entra.</span>
          </label>
          <label className={etiqueta}>
            Primer día
            <input
              type="date"
              name="desde"
              required
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                setDias(proporcional(e.target.value));
              }}
              className={campo}
            />
          </label>
        </Grupo>

        <Grupo titulo="Datos personales" nota="Solo los ven la persona, RRHH y dirección.">
          <div className="grid grid-cols-2 gap-2.5">
            <label className={etiqueta}>DNI o NIE<input name="dni" className={campo} /></label>
            <label className={etiqueta}>Neto de un mes normal (€)<input name="neto" inputMode="decimal" className={campo} /></label>
          </div>
          <label className={etiqueta}>Dirección (para comunicaciones)<input name="direccion" className={campo} /></label>
          <label className={etiqueta}>Cuenta para la nómina (IBAN)<input name="iban" placeholder="ES00 0000 0000 0000 0000 0000" className={campo} /></label>
        </Grupo>

        <Grupo titulo="Contrato">
          <div className="grid grid-cols-2 gap-2.5">
            <label className={etiqueta}>Tipo<input name="tipo" placeholder="Indefinido, temporal, prácticas…" className={campo} /></label>
            <label className={etiqueta}>Horas a la semana<input name="horas" inputMode="decimal" className={campo} /></label>
          </div>
          <label className={etiqueta}>Categoría del convenio<input name="categoria" className={campo} /></label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className={etiqueta}>
              Vacaciones de {desde.slice(0, 4) || "este año"}
              <input name="dias" inputMode="decimal" value={dias} onChange={(e) => setDias(e.target.value)} className={campo} />
              <span className="font-normal text-carbon/45">Lo proporcional de 22.</span>
            </label>
            {direccion && (
              <label className={etiqueta}>
                Bruto anual (€) · solo dirección
                <input name="bruto" inputMode="decimal" className={campo} />
              </label>
            )}
          </div>
        </Grupo>

        <Grupo titulo="Horario">
          <label className={etiqueta}>Tipo de jornada<input name="tipo_jornada" placeholder="Completa, reducida, intensiva…" className={campo} /></label>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {(["lunes", "martes", "miercoles", "jueves", "viernes"] as const).map((d) => (
              <label key={d} className={etiqueta}>
                {d === "miercoles" ? "Miércoles" : d[0].toUpperCase() + d.slice(1)}
                <input name={d} placeholder="9:00 - 18:00" className={campo} />
              </label>
            ))}
            <label className={etiqueta}>Comida<input name="comida" placeholder="1 h" className={campo} /></label>
          </div>
          <label className={etiqueta}>Horas a la semana<input name="horas_horario" inputMode="decimal" className={campo} /></label>
        </Grupo>

        <Grupo titulo="Funciones · son las que le dan acceso en la app">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {funciones.map((f) => (
              <label key={f.id} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm hover:border-lima">
                <input type="checkbox" name="funciones" value={f.id} className="accent-lima" />
                {f.nombre}
              </label>
            ))}
          </div>
        </Grupo>

        <Grupo titulo="Documentos" nota="PDF, foto, Word o Excel, hasta 25 MB. Se suben al dar de alta; lo que falte se sube luego desde su ficha.">
          {DOCS.map((d) => (
            <label key={d.tipo} className={etiqueta}>
              {d.etiqueta}
              <input
                type="file"
                name={`doc_${d.tipo}`}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setFicheros((x) => ({ ...x, [d.tipo]: e.target.files?.[0] ?? null }))}
                className="w-full min-w-0 text-sm font-normal file:mr-3 file:rounded-full file:border-0 file:bg-hueso file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-carbon"
              />
            </label>
          ))}
        </Grupo>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button
            type="submit"
            disabled={trabajando}
            className="rounded-full bg-lima px-5 py-2.5 text-base font-semibold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            {trabajando ? "Trabajando…" : "Dar de alta"}
          </button>
          {estado && <span className={`text-sm ${estado.tono === "mal" ? "font-semibold text-alerta" : "text-carbon/60"}`}>{estado.texto}</span>}
          {!estado && <span className="text-sm text-carbon/50">Solo el nombre y el primer día son obligatorios.</span>}
        </div>
      </form>
    </div>
  );
}
