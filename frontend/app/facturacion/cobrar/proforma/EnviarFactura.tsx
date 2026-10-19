"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Lectura } from "../../../../lib/enviarFactura";
import { accionBuscarEnDrive, accionEnviarFactura, accionLeerFactura } from "./acciones";

// PASO 2: ENVIAR FACTURA Y REGISTRO DEL CARGO (maqueta validada). Al abrirse,
// la app BUSCA SOLA la factura (y su justificante) en la carpeta del Drive donde
// la guarda Factusol (19-oct-2026); si no la encuentra, se sueltan los PDF a
// mano como antes. La app los lee y dice que cuadra y que no (avisa, no
// bloquea); se marca a quien va y se envia.

type Dest = { email: string; quien: string };
type DeDrive = { id: string; nombre: string } | null;

function Caja({ titulo, sub, fichero, drive, poner }: { titulo: string; sub: string; fichero: File | null; drive: DeDrive; poner: (f: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  return (
    <div
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(false);
        const f = e.dataTransfer.files[0];
        if (f) poner(f);
      }}
      className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-3 text-[13px] transition ${encima ? "border-lima bg-lima-soft" : fichero || drive ? "border-[#9fcf7a] bg-white" : "border-black/15 bg-white hover:border-carbon/40"}`}
    >
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => poner(e.target.files?.[0] ?? null)} />
      <div className="font-bold text-carbon">{titulo}</div>
      <div className="mt-0.5 truncate text-carbon/55" title={fichero?.name ?? drive?.nombre}>
        {fichero ? `✓ ${fichero.name}` : drive ? `✓ del Drive: ${drive.nombre}` : sub}
      </div>
    </div>
  );
}

export function EnviarFactura({ proformaId, codigo, donde, total, destinatarios }: { proformaId: string; codigo: string; donde: string; total: string; destinatarios: Dest[] }) {
  const router = useRouter();
  const [factura, setFactura] = useState<File | null>(null);
  const [justificante, setJustificante] = useState<File | null>(null);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [para, setPara] = useState<string[]>(destinatarios.slice(0, 1).map((d) => d.email));
  const [otro, setOtro] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [driveF, setDriveF] = useState<DeDrive>(null);
  const [driveJ, setDriveJ] = useState<DeDrive>(null);
  const [buscando, setBuscando] = useState(true);
  const [dice, setDice] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  // Lo soltado a mano manda sobre lo encontrado en el Drive.
  const datos = (f: File | null, j: File | null, df: DeDrive = driveF, dj: DeDrive = driveJ) => {
    const fd = new FormData();
    if (f) fd.set("factura", f);
    else if (df) fd.set("drive_factura", df.id);
    if (j) fd.set("justificante", j);
    else if (dj) fd.set("drive_justificante", dj.id);
    return fd;
  };
  const rellenar = (l: Lectura, conJustificante: boolean) => {
    setLectura(l);
    const n = l.factura ? `${(l.factura.fecha ?? "").slice(0, 4)}/${l.factura.numero}` : "";
    setAsunto(`Factura ${n} · ${donde} · Proforma ${codigo} · ${total} €`);
    setCuerpo(
      `Buenos días:\n\nOs adjuntamos la factura ${n} de ${donde}, correspondiente a la proforma ${codigo}, por un total de ${total} € (IVA incluido)` +
        `${conJustificante ? ", y el justificante del cargo en cuenta" : ""}.\n\nUn saludo,\nAccesalia · Facturación`,
    );
  };

  // Al abrirse: la factura y su justificante, de la carpeta del Drive.
  useEffect(() => {
    let vivo = true;
    accionBuscarEnDrive(proformaId)
      .then((r) => {
        if (!vivo) return;
        if (!r.ok) return setDice(`No se ha podido mirar la carpeta del Drive: ${r.error}`);
        setDice(r.drive.dice);
        setDriveF(r.drive.factura);
        setDriveJ(r.drive.justificante);
        if (r.drive.lectura) rellenar(r.drive.lectura, !!r.drive.justificante);
      })
      .finally(() => vivo && setBuscando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proformaId]);

  // Al soltar un PDF se lee y se cuadra en el acto; con el numero, el asunto y el texto.
  const leer = (f: File | null, j: File | null) => {
    if (!f && !driveF) return setLectura(null);
    empezar(async () => {
      setError(null);
      const r = await accionLeerFactura(proformaId, datos(f, j));
      if (!r.ok) return setError(r.error);
      rellenar(r.lectura, !!(j || driveJ));
    });
  };

  const enviar = () =>
    empezar(async () => {
      setError(null);
      const fd = datos(factura, justificante);
      for (const p of [...para, ...otro.split(/[,;\s]+/).filter(Boolean)]) fd.append("para", p);
      fd.set("asunto", asunto);
      fd.set("cuerpo", cuerpo);
      fd.set("nota", nota);
      const r = await accionEnviarFactura(proformaId, fd);
      if (!r.ok) return setError(r.error);
      setHecho(r.factura);
      router.refresh();
    });

  if (hecho)
    return <p className="rounded-xl border border-lima bg-lima-soft px-4 py-3 text-[13.5px] text-carbon"><b>Factura {hecho} enviada</b>, registrada y enganchada a sus hitos.</p>;

  const avisos = lectura?.comprobaciones.filter((c) => !c.ok) ?? [];
  return (
    <div className="space-y-3">
      {buscando ? (
        <p className="text-[13px] text-carbon/55">Buscando la factura en la carpeta del Drive…</p>
      ) : (
        dice && <p className={`text-[13px] ${driveF ? "font-semibold text-[#2f5d14]" : "text-carbon/60"}`}>{driveF ? "Factura generada · " : ""}{dice}</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Caja titulo="Factura" sub="el PDF de Factusol · suéltalo aquí o pincha" fichero={factura} drive={driveF} poner={(f) => (setFactura(f), leer(f, justificante))} />
        <Caja
          titulo="Justificante del cargo"
          sub={driveF ? "aún no está en la carpeta · o suéltalo aquí" : "el alta del recibo de CaixaBank"}
          fichero={justificante}
          drive={driveJ}
          poner={(j) => (setJustificante(j), leer(factura, j))}
        />
      </div>

      {ocupado && !lectura && <p className="text-[13px] text-carbon/55">Leyendo…</p>}
      {lectura && (
        <ul className="space-y-1 rounded-xl bg-white px-4 py-3 text-[13px]">
          {lectura.comprobaciones.map((c, i) => (
            <li key={i} className={c.ok ? "text-[#2f5d14]" : "font-semibold text-[#875f07]"}>
              {c.ok ? "✓" : "⚠"} {c.texto}
            </li>
          ))}
        </ul>
      )}

      {lectura && (
        <div className="space-y-2 rounded-xl bg-white px-4 py-3 text-[13px]">
          <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/55">Para · marca a quién va; de la agenda</div>
          {destinatarios.map((d) => (
            <label key={d.email} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={para.includes(d.email)}
                onChange={(e) => setPara((p) => (e.target.checked ? [...p, d.email] : p.filter((x) => x !== d.email)))}
                className="h-4 w-4 accent-[#104269]"
              />
              <span className="text-carbon/60">{d.quien}</span> {d.email}
            </label>
          ))}
          <input value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="otro correo" className="w-full rounded-lg border border-black/15 px-2.5 py-1.5" />
          <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className="w-full rounded-lg border border-black/15 px-2.5 py-1.5" />
          <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={6} className="w-full resize-y rounded-lg border border-black/15 px-2.5 py-1.5" />
          {avisos.length > 0 && (
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              placeholder="Hay avisos: si quieres, di por qué se envía igualmente (queda en sus notas de facturación)"
              className="w-full resize-y rounded-lg border border-[#ecdcae] bg-[#fdf8ec] px-2.5 py-1.5"
            />
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-carbon/50">Sale de facturacion.accesalia@gmail.com</span>
            <button type="button" disabled={ocupado} onClick={enviar} className="rounded-xl bg-carbon px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-50">
              {ocupado ? "Enviando…" : avisos.length ? "Enviar factura igualmente" : "Enviar factura"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-[13px] font-semibold text-alerta">{error}</p>}
    </div>
  );
}
