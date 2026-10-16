import type { BarraOportunidad, EstadoTramo, Paso } from "../../../../lib/cuadroComercial";

// LA BARRA DE FASES DE LA LISTA DE OPPS ABIERTAS, en la cabecera de la ficha
// (Monica, 14-oct-2026): "sin NINGUN cambio salvo algun toque estetico: fondo
// negro, contrastes y algo de color en los textos para que se lean". Lee lo
// mismo que la de la lista (lib/cuadroComercial.ts, leerBarra): aqui solo se
// pinta sobre negro.

const ddmmaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

function Tramo({ estado, paso }: { estado: EstadoTramo; paso: Paso }) {
  const base = "self-center rounded-full ";
  const t = paso.corto.join(" ").trim();
  if (estado === "saltado" || estado === "no_aplica")
    return <span title={`${t}: ${estado === "saltado" ? "saltado (sigue abierto)" : "no aplica"}`} className={base + "h-2 border border-dashed border-white/30"} />;
  if (estado === "hecho") return <span title={`${t}: hecho`} className={base + "h-2 bg-[#8CCB4E]"} />;
  if (estado === "actual")
    return (
      <span
        title={`${t}: aquí está`}
        className={base + "h-3.5 border-2 " + (paso.ajeno ? "border-[#9DBDE6] bg-[#5680A1]" : "border-[#B5E08A] bg-[#4E8A25]")}
      />
    );
  return <span title={`${t}: pendiente`} className={base + "h-2 bg-white/25"} />;
}

/** La barra sola: los nombres de las fases y sus tramos. */
function Barra({ b }: { b: BarraOportunidad }) {
  return (
    <>
      {/* EL NOMBRE DE CADA FASE, encima de su tramo (Monica, 14-oct-2026: "creo
          que cabe bien con ese ancho de pantalla"). El de la fase actual, en claro. */}
      <div className="mb-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${b.pasos.length}, minmax(0, 1fr))` }}>
        {b.pasos.map((p) => {
          const aqui = b.tramos[p.clave] === "actual";
          const noAplica = b.tramos[p.clave] === "no_aplica";
          return (
            <div
              key={p.clave}
              className={"min-w-0 truncate text-[10.5px] font-semibold leading-tight " + (aqui ? (p.ajeno ? "text-[#9DBDE6]" : "text-white") : "text-white/50")}
              title={p.corto.join(" ").trim()}
            >
              {p.numero && <span className="mr-1 tabular-nums opacity-60">{p.numero}</span>}
              {p.corto.join(" ").trim()}
              {/* Las que no aplican, dichas (Monica, 15-oct-2026). */}
              {noAplica && <span className="block text-[9.5px] font-normal italic text-white/40">no aplica</span>}
            </div>
          );
        })}
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${b.pasos.length}, minmax(0, 1fr))` }}>
        {b.pasos.map((p) => (
          <Tramo key={p.clave} paso={p} estado={b.tramos[p.clave] ?? "pendiente"} />
        ))}
      </div>
    </>
  );
}

/** LA TIRA DE FASES DE LA FICHA (Monica, 16-oct-2026, "reducir espacios"): la
 *  barra al 70 % del ancho y, a su lado, los dias en esta fase y el ultimo
 *  contacto, que antes iban en la linea de debajo. Lo que esperamos y la junta
 *  proxima van debajo de cada cifra. */
export function TiraFases({ b }: { b: BarraOportunidad }) {
  const CIFRA = "flex min-w-0 flex-col justify-center rounded-[10px] bg-[#232323] px-4 py-2 text-white";
  const ROT = "text-[10px] font-bold uppercase tracking-[0.07em] text-white/50";
  return (
    <div className="mt-2 grid gap-[10px] xl:grid-cols-[70%_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-[10px] bg-[#232323] px-4 py-3">
        <Barra b={b} />
      </div>
      <div className={CIFRA}>
        <span className={ROT}>Días en esta fase</span>
        <span className="text-[20px] font-bold leading-tight tabular-nums">{b.diasAqui ?? "—"}</span>
        {b.esperando && <span className="truncate text-[11px] font-semibold text-[#9DBDE6]">esperando {b.esperando}</span>}
      </div>
      <div className={CIFRA}>
        <span className={ROT}>Último contacto</span>
        <span className="text-[20px] font-bold leading-tight tabular-nums">{b.ultimoContacto ? ddmmaa(b.ultimoContacto) : "—"}</span>
        {b.proximo && <span className="truncate text-[11px] font-semibold text-white/80">{b.proximo}</span>}
      </div>
    </div>
  );
}
