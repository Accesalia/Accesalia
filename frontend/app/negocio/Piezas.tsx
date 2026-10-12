// PIEZAS DE LAS PANTALLAS DE DIRECCION (Negocio, Control interno, Resultados
// economicos; Monica, 12-oct-2026). "Una pagina de placeholders": lo que tiene
// dato se calcula; lo que no, sale como HUECO con la nota de que va ahi y que
// falta para poder calcularlo. Cuando el dato exista, el hueco se cambia por la cifra.

export const EUROS = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
export const eur = (n: number) => `${EUROS.format(n)} €`;
export const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)} %`);
export const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });

/** El selector de fechas (un formulario GET: la pantalla se recalcula con ellas). */
export function Fechas({ desde, hasta }: { desde: string; hasta: string }) {
  const campo = "rounded-lg border border-carbon/25 bg-white px-2.5 py-1.5 text-[14px] outline-none focus:border-lima";
  return (
    <form className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
      <label className="text-[13px] text-carbon/70">
        Desde
        <input type="date" name="desde" defaultValue={desde} className={campo + " ml-2"} />
      </label>
      <label className="text-[13px] text-carbon/70">
        Hasta
        <input type="date" name="hasta" defaultValue={hasta} className={campo + " ml-2"} />
      </label>
      <button type="submit" className="rounded-lg bg-carbon px-4 py-1.5 text-[14px] font-semibold text-white hover:bg-carbon/85">
        Ver
      </button>
    </form>
  );
}

/** Una cifra con dato. */
export function Cifra({ titulo, valor, nota }: { titulo: string; valor: React.ReactNode; nota?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-[12.5px] font-semibold uppercase tracking-wide text-carbon/60">{titulo}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-carbon">{valor}</div>
      {nota && <div className="mt-1 text-[12.5px] text-carbon/65">{nota}</div>}
    </div>
  );
}

/** EL HUECO: aqui va un dato que aun no existe. Dice que va y que falta. */
export function Hueco({ titulo, va, falta }: { titulo: string; va: string; falta: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-carbon/25 bg-white/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12.5px] font-semibold uppercase tracking-wide text-carbon/60">{titulo}</div>
        <span className="shrink-0 rounded-full bg-carbon/10 px-2 py-0.5 text-[11px] font-bold text-carbon/60">sin dato</span>
      </div>
      <p className="mt-2 text-[13.5px] text-carbon/80">
        <b>Aquí:</b> {va}
      </p>
      <p className="mt-1 text-[13px] text-carbon/65">
        <b>Falta:</b> {falta}
      </p>
    </div>
  );
}

export function Seccion({ titulo, children, sub }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-carbon">{titulo}</h2>
      {sub && <p className="text-[13.5px] text-carbon/65">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export const REJILLA = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4";
