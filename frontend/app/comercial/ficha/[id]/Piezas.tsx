import type { DocumentoComercial, Edificio, FichaComercial, NotaOlfato, PersonaFicha } from "../../../../lib/fichaComercial";
import type { EntradaCuadro, HitoCobro } from "../../../../lib/cuadroComercial";

// Las piezas de la ficha comercial completa. Solo pintan.
//
// Criterio de Monica (12-sep-2026): esta ficha es la SEMILLA del expediente 360
// y es una VENTANA, no un almacen: cada bloque dice de donde sale el dato. Lo
// que aun no tiene casa se deja como HUECO con el nombre de los campos, "solo
// placeholder, pero dejemoslo visto, porque se me va a olvidar".

const EUR = new Intl.NumberFormat("es-ES", { useGrouping: "always", maximumFractionDigits: 0 });
export const eur = (n: number) => `${EUR.format(n)} €`;
export const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

export function Bloque({ titulo, de, children }: { titulo: string; de?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/60">{titulo}</h2>
        {de && <span className="text-xs text-carbon/40">{de}</span>}
      </div>
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">{children}</div>
    </section>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-carbon/40">{children}</p>;
}

/** Un hueco con el nombre de los campos que iran aqui. */
export function Placeholder({ campos, nota }: { campos: string[]; nota: string }) {
  return (
    <div className="rounded-xl border border-dashed border-black/15 bg-hueso/40 p-4">
      <p className="text-sm text-carbon/55">{nota}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {campos.map((c) => (
          <li key={c} className="rounded-md border border-dashed border-black/15 bg-white px-2.5 py-1 text-sm text-carbon/45">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------- los documentos

export function Documentos({ docs }: { docs: DocumentoComercial[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {docs.map((d) => (
        <div key={d.rotulo}>
          <div className="text-base font-bold text-carbon">{d.rotulo}</div>
          {d.versiones.length === 0 ? (
            <p className="mt-1.5 text-sm text-carbon/35">{d.falta}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {d.versiones.map((v, i) => (
                <li
                  key={v.version}
                  className={
                    "rounded-lg px-3 py-2 " +
                    // La ULTIMA ENVIADA destacada: es la que manda (Monica).
                    (i === 0 ? "border border-lima bg-lima-soft" : "border border-black/5 bg-hueso/50")
                  }
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={"text-sm font-bold " + (i === 0 ? "text-lima-dark" : "text-carbon/60")}>
                      {v.version}
                      {i === 0 && <span className="ml-1.5 text-xs font-semibold uppercase tracking-wide">la última</span>}
                    </span>
                    <span className="text-xs tabular-nums text-carbon/50">{ddmm(v.fecha)}</span>
                  </div>
                  {v.nota && <p className="mt-0.5 text-sm leading-snug text-carbon/60">{v.nota}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ los pasos

export function Tiempos({ pasos }: { pasos: FichaComercial["pasos"] }) {
  if (pasos.length === 0) return <Vacio>Sin fechas todavía.</Vacio>;
  return (
    <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {pasos.map((p) => (
        <li key={p.nombre} className="flex items-baseline gap-2 border-b border-black/5 pb-1.5">
          <span className="w-4 shrink-0 text-sm font-bold tabular-nums text-carbon/30">{p.numero ?? "·"}</span>
          <span className={"flex-1 text-base " + (p.fecha ? "text-carbon/85" : "text-carbon/35")}>{p.nombre}</span>
          <span className={"shrink-0 text-sm tabular-nums " + (p.fecha ? "font-semibold text-carbon/70" : "text-carbon/25")}>
            {p.fecha ? ddmm(p.fecha) : "—"}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- los cobros

export function Cobros({ hitos }: { hitos: HitoCobro[] }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const total = hitos.reduce((s, h) => s + h.importe, 0);
  const suyo = hitos.reduce((s, h) => s + h.comision, 0);
  const cobrado = hitos.filter((h) => h.cobrado);
  return (
    <div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-black/10 text-xs font-bold uppercase tracking-wider text-carbon/45">
            <th className="pb-2">Hito</th>
            <th className="pb-2 text-right">Importe</th>
            <th className="pb-2 text-right">Tu comisión</th>
            <th className="pb-2 text-right">Vence</th>
            <th className="pb-2 text-right">Cobrado</th>
          </tr>
        </thead>
        <tbody>
          {hitos.map((h, i) => {
            const tarde = !h.cobrado && h.previsto !== null && h.previsto < hoy;
            return (
              <tr key={h.nombre + i} className="border-b border-black/5">
                <td className="py-2 text-base text-carbon">{h.nombre}</td>
                <td className="py-2 text-right text-base tabular-nums text-carbon/75">{eur(h.importe)}</td>
                <td className="py-2 text-right text-base font-bold tabular-nums text-[#8A6410]">{eur(h.comision)}</td>
                <td className={"py-2 text-right text-sm tabular-nums " + (tarde ? "font-bold text-alerta" : "text-carbon/55")}>
                  {h.previsto ? ddmm(h.previsto) : "—"}
                </td>
                <td className="py-2 text-right text-sm tabular-nums">
                  {h.cobrado ? (
                    <span className="font-semibold text-lima-dark">{ddmm(h.cobrado)}</span>
                  ) : (
                    <span className={tarde ? "font-bold text-alerta" : "text-carbon/30"}>{tarde ? "vencido" : "pendiente"}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-sm text-carbon/60">
        Cobrado <b className="tabular-nums text-carbon/85">{eur(cobrado.reduce((s, h) => s + h.importe, 0))}</b> de {eur(total)}
        {" · "}
        <span className="text-[#8A6410]">
          tu comisión <b className="tabular-nums">{eur(cobrado.reduce((s, h) => s + h.comision, 0))}</b> de {eur(suyo)}
        </span>
      </p>
      <p className="mt-2 text-xs text-carbon/40">
        Un hito se puede pagar fraccionado («mil euros al mes hasta cubrir»). Los plazos aún no tienen dónde guardarse.
      </p>
    </div>
  );
}

// --------------------------------------------------------------- las personas

export function Personas({ personas }: { personas: PersonaFicha[] }) {
  if (personas.length === 0) return <Vacio>Nadie apuntado todavía.</Vacio>;
  return (
    <ul className="divide-y divide-black/5">
      {personas.map((p) => (
        <li key={p.nombre} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <span className="text-base font-semibold text-carbon">{p.nombre}</span>
            <span className="ml-2 text-sm text-carbon/50">{p.papel}</span>
            {p.porQue && <p className="mt-0.5 text-sm leading-snug text-carbon/60">{p.porQue}</p>}
          </div>
          <div className="shrink-0 text-right">
            {p.telefono ? (
              <a href={`tel:${p.telefono.replace(/\s/g, "")}`} className="block text-base font-bold tabular-nums text-lima-dark hover:underline">
                {p.telefono}
              </a>
            ) : (
              <span className="block text-sm text-carbon/30">sin teléfono</span>
            )}
            {p.email ? <span className="text-sm text-carbon/55">{p.email}</span> : <span className="text-sm text-carbon/25">sin correo</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

// -------------------------------------------------------------- el edificio

export function FichaEdificio({ e }: { e: Edificio }) {
  const hay = e.viviendas || e.anio || e.fachadas || e.tipoFachada || e.portalAccesible !== null || e.ascensor !== null || e.iee;
  if (!hay)
    return (
      <Placeholder
        nota="Esto no es un dato comercial: son los datos con los que se elabora la IEE, y esa sección está por montar. El comercial los ve en la primera visita y los apunta aquí."
        campos={["Año de construcción", "Número de vecinos", "Nº de fachadas", "Tipo de fachada", "Tipo de cubierta", "Sistema de calefacción", "Accesibilidad (texto)", "IEE: si la tiene y de qué fecha", "y otros"]}
      />
    );
  const dato = (k: string, v: React.ReactNode) => (
    <div className="border-b border-black/5 py-1.5">
      <div className="text-xs uppercase tracking-wide text-carbon/40">{k}</div>
      <div className="text-base text-carbon/85">{v}</div>
    </div>
  );
  const si = (b: boolean | null) => (b === null ? <span className="text-carbon/30">—</span> : b ? "Sí" : "No");
  return (
    <div>
      <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
        {dato("Vecinos", e.viviendas ?? <span className="text-carbon/30">—</span>)}
        {dato("Año", e.anio ?? <span className="text-carbon/30">—</span>)}
        {dato("Fachadas", e.fachadas ?? <span className="text-carbon/30">—</span>)}
        {dato("Tipo de fachada", e.tipoFachada ?? <span className="text-carbon/30">—</span>)}
        {dato("Portal accesible", si(e.portalAccesible))}
        {dato("Ascensor", si(e.ascensor))}
        {dato("IEE", e.iee ? `de ${e.iee.slice(0, 4)}` : <span className="text-carbon/30">no tiene</span>)}
        {dato("Cubierta / calefacción", <span className="text-carbon/30">por recoger</span>)}
      </div>
      {e.problemas.length > 0 && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-carbon/40">Lo que los vecinos dicen que tiene</div>
          <ul className="mt-1 list-inside list-disc text-base text-carbon/80">
            {e.problemas.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs text-carbon/40">
        Estos datos son de la sección de IEE, no del área comercial. Aquí se ven y se adelantan.
      </p>
    </div>
  );
}

// ------------------------------------------------------------------- el olfato

const TONO: Record<string, string> = {
  palanca: "border-lima bg-lima-soft text-lima-dark",
  oposición: "border-alerta/40 bg-red-50 text-alerta",
  "oportunidad cruzada": "border-[#C9971B]/50 bg-[#FBF3DC] text-[#8A6410]",
};

export function Olfato({ notas }: { notas: NotaOlfato[] }) {
  if (notas.length === 0)
    return <Vacio>Nada apuntado. Aquí va lo que sabes y no cabe en un campo: quién lo mueve, quién se opone, de qué pie cojean.</Vacio>;
  return (
    <ul className="space-y-2.5">
      {notas.map((n) => (
        <li key={n.texto} className="flex flex-wrap items-start gap-2.5">
          <span
            className={
              "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide " +
              (TONO[n.tipo] ?? "border-black/10 bg-hueso text-carbon/60")
            }
          >
            {n.tipo}
          </span>
          <span className="min-w-0 flex-1 text-base leading-snug text-carbon/85">{n.texto}</span>
        </li>
      ))}
    </ul>
  );
}

// -------------------------------------------------------------- el diario

export function DiarioCompleto({ entradas }: { entradas: EntradaCuadro[] }) {
  if (entradas.length === 0) return <Vacio>Nada grabado de esta dirección.</Vacio>;
  return (
    <ul className="divide-y divide-black/5">
      {entradas.map((e) => (
        <li key={e.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-carbon/55">
            <span className="font-bold tabular-nums text-carbon/80">{ddmm(e.fecha)}</span>
            <span className="rounded-full border border-black/5 bg-hueso px-2 py-px text-xs font-semibold">{e.tipo}</span>
            {e.con && <span className="text-lima-dark">{e.con}</span>}
          </div>
          <p className="mt-1 text-base leading-snug text-carbon/80">{e.texto}</p>
        </li>
      ))}
    </ul>
  );
}
