"use client";

import { useMemo, useState } from "react";
import { pedirDias } from "./acciones";

// El formulario de pedir dias. Cuenta los laborables mientras se eligen las
// fechas (sin fines de semana, festivos ni cierres), igual que lo contara el
// servidor al guardarlo.

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function laborables(desde: string, hasta: string, fuera: Record<string, string>) {
  let n = 0;
  const saltados: string[] = [];
  for (let d = new Date(desde + "T12:00:00Z"); d.toISOString().slice(0, 10) <= hasta; d.setUTCDate(d.getUTCDate() + 1)) {
    const f = d.toISOString().slice(0, 10);
    const w = d.getUTCDay();
    if (w === 0 || w === 6) continue;
    if (fuera[f]) {
      saltados.push(`${d.getUTCDate()} ${MES[d.getUTCMonth()]} (${fuera[f].toLowerCase()})`);
      continue;
    }
    n++;
  }
  return { n, saltados };
}

export function PedirDias({ hoy, fuera, quedan }: { hoy: string; fuera: Record<string, string>; quedan: number | null }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipo, setTipo] = useState("vacaciones");
  const cuenta = useMemo(() => (desde && hasta && hasta >= desde ? laborables(desde, hasta, fuera) : null), [desde, hasta, fuera]);
  const vac = tipo === "vacaciones";
  const pasa = vac && quedan != null && cuenta != null && cuenta.n > quedan;

  const campo = "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-base outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";
  return (
    <form action={pedirDias} className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm font-semibold text-carbon/55">
          Desde
          <input
            type="date"
            name="desde"
            required
            min={hoy}
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              if (!hasta || hasta < e.target.value) setHasta(e.target.value);
            }}
            className={campo}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-carbon/55">
          Hasta
          <input type="date" name="hasta" required min={desde || hoy} value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
        </label>
        <label className="col-span-2 grid gap-1 text-sm font-semibold text-carbon/55">
          Qué es
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
            <option value="vacaciones">Vacaciones</option>
            <option value="permiso_retribuido">Permiso retribuido (mudanza, boda, fallecimiento…)</option>
            <option value="ausencia_justificada">Ausencia justificada (médico, trámite…)</option>
          </select>
        </label>
        <label className="col-span-2 grid gap-1 text-sm font-semibold text-carbon/55">
          Algo que quieras añadir <span className="font-normal text-carbon/40">(opcional)</span>
          <input type="text" name="notas" maxLength={300} className={campo} />
        </label>
      </div>

      <p className="rounded-xl bg-hueso px-4 py-3 text-base text-carbon/70">
        {!cuenta ? (
          "Elige desde y hasta."
        ) : (
          <>
            Son <b className="text-carbon">{cuenta.n} {cuenta.n === 1 ? "día laborable" : "días laborables"}</b>
            {cuenta.saltados.length > 0 && <>; no cuentan {cuenta.saltados.join(", ")}</>}.{" "}
            {!vac ? (
              "No descuenta vacaciones."
            ) : quedan == null ? (
              "Tus días de este año aún no están cargados: RRHH lo revisará."
            ) : pasa ? (
              <span className="font-semibold text-alerta">Te quedan {quedan}: pide menos o habla con RRHH.</span>
            ) : (
              <>
                Si te lo aprueban, te quedarán <b className="text-carbon">{quedan - cuenta.n}</b>.
              </>
            )}
          </>
        )}
      </p>

      <button
        type="submit"
        disabled={!cuenta || cuenta.n === 0 || pasa}
        className="rounded-full bg-lima px-5 py-2.5 text-base font-semibold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        Enviar la solicitud
      </button>
      <p className="text-sm text-carbon/50">Le llega a RRHH y a dirección. La verás aquí abajo hasta que la resuelvan.</p>
    </form>
  );
}
