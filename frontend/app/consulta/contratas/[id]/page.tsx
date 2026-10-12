import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { quienSoy } from "../../../../lib/sesion";
import { fichaContrata, type GenteContrata } from "../../../../lib/fichas";
import { CAJA, ENLACE, Marco, ROT } from "../../Marco";

export const dynamic = "force-dynamic";

// LA FICHA DE CONTRATA (Monica, 12-oct-2026). Primera version para verla en
// pantalla y decidir sobre ella. Sus datos, sus notas, su gente (la actual y
// la que estuvo, con fechas) y lo que hemos hecho con ella.

const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const mes = (v: string | null) => (v ? MES.format(new Date(v)) : null);
const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");
const eur = (n: number | null) => (n == null ? "—" : Math.round(n).toLocaleString("es-ES") + " €");

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={CAJA + " mt-4 p-5"}>
      <h2 className={ROT}>{titulo}</h2>
      <div className="mt-2.5 text-[14px] text-carbon">{children}</div>
    </section>
  );
}
function Dato({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex gap-3 py-0.5">
      <span className="w-[140px] shrink-0 text-[12.5px] text-carbon/65">{k}</span>
      <span className="min-w-0">{v || <span className="text-amber-700/60">por completar</span>}</span>
    </div>
  );
}
function Persona({ g, actual }: { g: GenteContrata; actual: boolean }) {
  const cuando = actual ? (g.desde ? `desde ${mes(g.desde)}` : "") : [g.desde ? `de ${mes(g.desde)}` : null, `a ${mes(g.hasta)}`].filter(Boolean).join(" ");
  return (
    <li className="py-1">
      <Link href={`/consulta/personas/${g.personaId}`} className={ENLACE}>
        {g.nombre}
      </Link>
      {g.cargo && ` · ${g.cargo}`}
      {cuando && <span className="text-carbon/65"> · {cuando}</span>}
      {(g.telefono || g.correos.length > 0) && <span className="text-carbon/65"> · {[g.telefono, ...g.correos].filter(Boolean).join(" · ")}</span>}
    </li>
  );
}

export default async function FichaDeContrata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/consulta/contratas/${id}`);
  const c = await fichaContrata(id);
  if (!c) notFound();

  return (
    <Marco aqui="">
      <Link href="/consulta?que=contrata" className="text-sm font-semibold text-carbon/65 transition hover:text-carbon">
        ← Buscar
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 border-b border-black/10 pb-4">
        <h1 className="text-3xl font-bold text-carbon">{c.nombre}</h1>
        <span className="text-carbon/65">{[c.tipo, c.especialidad].filter(Boolean).join(" · ")}</span>
        {!c.activa && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold uppercase text-carbon/60">inactiva</span>}
      </div>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <Seccion titulo="Datos">
          <Dato k="Razón social" v={c.razonSocial} />
          <Dato k="CIF" v={c.cif} />
          <Dato k="Teléfono" v={c.telefono} />
          <Dato k="Correo" v={c.email} />
          <Dato k="Dirección" v={c.direccion} />
          <Dato k="Domicilio fiscal" v={c.domicilioFiscal} />
          <Dato k="Relación" v={c.relacion} />
          <Dato k="Quién factura" v={c.emisorFactura} />
          <Dato k="Códigos que exige" v={c.codigosExigidos} />
        </Seccion>
        <Seccion titulo="Notas de la relación">
          <Dato k="Fiabilidad" v={c.notasFiabilidad && <span className="whitespace-pre-wrap">{c.notasFiabilidad}</span>} />
          <Dato k="Comercial" v={c.notasComercial && <span className="whitespace-pre-wrap">{c.notasComercial}</span>} />
        </Seccion>
      </div>

      <Seccion titulo="Su gente">
        {c.gente.actuales.length === 0 ? <p className="text-carbon/65">Nadie con cargo vigente.</p> : <ul>{c.gente.actuales.map((g, i) => <Persona key={i} g={g} actual />)}</ul>}
        {c.gente.anteriores.length > 0 && (
          <>
            <div className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-carbon/65">Estuvieron</div>
            <ul>{c.gente.anteriores.map((g, i) => <Persona key={i} g={g} actual={false} />)}</ul>
          </>
        )}
      </Seccion>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <Seccion titulo={`Hojas de encargo que paga · ${c.hojas.total}`}>
          {c.hojas.total === 0 ? (
            <p className="text-carbon/65">Ninguna.</p>
          ) : (
            <ul className="space-y-0.5">
              {c.hojas.ultimas.map((h) => (
                <li key={h.id}>
                  {fecha(h.fecha)} · {h.numero ?? "sin número"} ·{" "}
                  {h.comunidadId ? (
                    <Link href={`/administracion/comunidades/${h.comunidadId}`} className={ENLACE}>
                      {h.comunidad}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {h.estado && <span className="text-carbon/65"> · {h.estado}</span>}
                </li>
              ))}
              {c.hojas.total > 10 && <li className="text-carbon/65">y {c.hojas.total - 10} más antiguas</li>}
            </ul>
          )}
        </Seccion>
        <Seccion titulo={`Presupuestos de licitación · ${c.licitaciones.total}`}>
          {c.licitaciones.total === 0 ? (
            <p className="text-carbon/65">Ninguno.</p>
          ) : (
            <ul className="space-y-0.5">
              {c.licitaciones.ultimas.map((l) => (
                <li key={l.id}>
                  {fecha(l.fecha)} · PEM {eur(l.pem)}
                  {l.rol && ` · ${l.rol}`}
                  {l.estado && <span className="text-carbon/65"> · {l.estado}</span>}
                </li>
              ))}
              {c.licitaciones.total > 10 && <li className="text-carbon/65">y {c.licitaciones.total - 10} más antiguos</li>}
            </ul>
          )}
        </Seccion>
      </div>

      <Seccion titulo="Acuerdos de comisión">
        {c.comisiones.length === 0 ? (
          <p className="text-carbon/65">Ninguno.</p>
        ) : (
          <ul className="space-y-0.5">
            {c.comisiones.map((x) => (
              <li key={x.id} className={x.vigente ? "" : "text-carbon/55"}>
                {x.beneficiario ?? "—"} · {x.porcentaje != null ? `${x.porcentaje} %` : eur(x.importe)}
                {x.base && ` sobre ${x.base}`}
                {!x.vigente && " · ya no vigente"}
                {x.notas && <span className="text-carbon/65"> · {x.notas}</span>}
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo={`Notas · ${c.notas.length}`}>
        {c.notas.length === 0 ? (
          <p className="text-carbon/65">Ninguna.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {c.notas.map((n) => (
              <li key={n.id} className="py-2">
                <div className="text-[12px] text-carbon/65">
                  {fecha(n.fecha)}
                  {n.autor ? ` · ${n.autor}` : ""}
                </div>
                <p className="whitespace-pre-wrap">{n.texto}</p>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </Marco>
  );
}
