import Link from "next/link";
import { datosPersonales, nombreCompleto, type Persona } from "../../lib/rrhh";
import { lote, lotesRecientes, type Nomina } from "../../lib/rrhhNominas";
import { BotonEnviar } from "../components/Aviso";
import { descartar, guardarLote } from "./accionesNominas";
import { EUR, Titulo } from "./Piezas";
import { SubirLote } from "./SubirLote";

// Nominas del mes (Monica, 11-sep-2026): se sube el PDF de la gestoria, se
// revisa de quien es cada pagina y se publica. Lo ven RRHH y direccion; el
// coste para la empresa, solo direccion.

const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesLargo = (periodo: string) => `${MES[Number(periodo.slice(5, 7)) - 1]} ${periodo.slice(0, 4)}`;

const CASADO: Record<string, { txt: string; clase: string }> = {
  dni: { txt: "por DNI", clase: "bg-lima-soft text-lima-dark" },
  nombre: { txt: "propuesta por el nombre", clase: "bg-amber-50 text-amber-800" },
  manual: { txt: "confirmada", clase: "bg-ajeno-soft text-ajeno" },
  ninguno: { txt: "sin dueño", clase: "bg-[#f6e9e8] text-alerta" },
};

async function Revision({ id, equipo, direccion, error }: { id: string; equipo: Persona[]; direccion: boolean; error: string | null }) {
  const l = await lote(id);
  if (!l) return <p className="text-sm text-carbon/50">Ese lote no existe.</p>;
  const { lote: lt, nominas } = l;
  const abierto = lt.estado === "revision";
  const cuentas = await datosPersonales(nominas.map((n) => n.personaId).filter(Boolean) as string[]);
  const asignados = new Set(nominas.map((n) => n.personaId).filter(Boolean));
  const sinNomina = equipo.filter((p) => p.activo && !asignados.has(p.id));
  const totalLiquido = nominas.filter((n) => n.personaId).reduce((s, n) => s + (n.liquido ?? 0), 0);
  const totalCoste = nominas.filter((n) => n.personaId).reduce((s, n) => s + (n.costeEmpresa ?? 0), 0);
  const pendientes = nominas.filter((n) => !n.personaId || n.casadoPor === "nombre").length;
  const opciones = (n: Nomina) => {
    const lista = equipo.filter((p) => p.activo || p.id === n.personaId);
    return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  };

  return (
    <div id="lote" className="scroll-mt-24 rounded-2xl border border-lima/40 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/5 pb-3">
        <div>
          <h3 className="text-xl font-bold text-carbon">Nóminas de {mesLargo(lt.periodo)}</h3>
          <p className="text-sm text-carbon/55">
            {lt.paginas} páginas ·{" "}
            {abierto ? (
              <span className="font-semibold text-amber-800">en revisión: nadie las ve todavía</span>
            ) : lt.estado === "publicado" ? (
              <span className="font-semibold text-lima-dark">publicadas: cada uno tiene la suya en su espacio</span>
            ) : (
              "descartado"
            )}
          </p>
        </div>
        <Link href="/rrhh#nominas" className="text-sm font-semibold text-carbon/50 hover:text-carbon">Cerrar ✕</Link>
      </div>

      {error === "repetida" && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Hay una persona elegida en dos páginas. Cada nómina es de una sola persona.</p>
      )}

      <form action={guardarLote}>
        <input type="hidden" name="lote" value={lt.id} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-[11px] font-bold uppercase tracking-wider text-carbon/40">
                <th className="px-2 py-2">Pág.</th>
                <th className="px-2 py-2">En la nómina</th>
                <th className="px-2 py-2">Es de</th>
                <th className="px-2 py-2 text-right">Líquido</th>
                {direccion && <th className="px-2 py-2 text-right">Coste empresa</th>}
                <th className="px-2 py-2">Cuenta</th>
              </tr>
            </thead>
            <tbody>
              {nominas.map((n) => {
                const c = CASADO[n.casadoPor ?? "ninguno"];
                const iban = n.personaId ? cuentas.get(n.personaId)?.iban : null;
                return (
                  <tr key={n.id} className="border-b border-black/[0.04] align-middle">
                    <td className="px-2 py-2 tabular-nums text-carbon/45">{n.pagina}</td>
                    <td className="px-2 py-2">
                      <span className="block font-semibold text-carbon">{n.nombreLeido ?? "—"}</span>
                      <span className="text-xs text-carbon/45">{n.dniLeido ?? "sin DNI leído"}</span>
                    </td>
                    <td className="px-2 py-2">
                      {abierto ? (
                        <select
                          name={`p_${n.id}`}
                          defaultValue={n.personaId ?? ""}
                          className="w-full min-w-44 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-lima"
                        >
                          <option value="">— de nadie (no se publica) —</option>
                          {opciones(n).map((p) => (
                            <option key={p.id} value={p.id}>{nombreCompleto(p)}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-semibold">{equipo.find((p) => p.id === n.personaId) ? nombreCompleto(equipo.find((p) => p.id === n.personaId)!) : "—"}</span>
                      )}
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${c.clase}`}>{c.txt}</span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{n.liquido != null ? EUR.format(n.liquido) : <span className="text-alerta">no leído</span>}</td>
                    {direccion && <td className="px-2 py-2 text-right tabular-nums text-carbon/65">{n.costeEmpresa != null ? EUR.format(n.costeEmpresa) : "—"}</td>}
                    <td className="px-2 py-2">
                      {!n.personaId ? (
                        <span className="text-carbon/35">—</span>
                      ) : iban ? (
                        <span className="text-xs font-semibold text-lima-dark">en la ficha</span>
                      ) : (
                        <span className="rounded-md bg-[#f6e9e8] px-1.5 py-0.5 text-xs font-semibold text-alerta">falta</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="px-2 py-3 font-bold" colSpan={3}>Total a transferir</td>
                <td className="px-2 py-3 text-right text-base font-bold tabular-nums">{EUR.format(totalLiquido)}</td>
                {direccion && <td className="px-2 py-3 text-right font-bold tabular-nums text-carbon/65">{EUR.format(totalCoste)}</td>}
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {sinNomina.length > 0 && (
          <p className="mt-3 text-sm text-carbon/55">
            Sin nómina en este PDF: {sinNomina.map((p) => nombreCompleto(p)).join(", ")}.
          </p>
        )}

        {abierto && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BotonEnviar
              name="decision"
              value="publicar"
              pendiente="Publicando… (separando y guardando cada nómina)"
              className="rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              Publicar las nóminas
            </BotonEnviar>
            <BotonEnviar
              name="decision"
              value="guardar"
              pendiente="Guardando…"
              className="rounded-full border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-carbon/70 hover:border-lima"
            >
              Guardar sin publicar
            </BotonEnviar>
            <span className="text-sm text-carbon/50">
              {pendientes > 0
                ? `Revisa las ${pendientes} marcadas en ámbar o rojo: al publicar, las propuestas que dejes como están se dan por buenas.`
                : "Todo casado por DNI."}
            </span>
          </div>
        )}
      </form>
      {abierto && (
        <form action={descartar} className="mt-2">
          <input type="hidden" name="lote" value={lt.id} />
          <button type="submit" className="text-xs text-carbon/45 hover:text-alerta hover:underline">Descartar este PDF (se ha subido el que no era)</button>
        </form>
      )}
      {abierto && (
        <p className="mt-3 text-xs text-carbon/50">
          Al publicar: cada página va, como PDF suyo, al espacio de su dueño (si ya tenía la de este mes, se sustituye), y el DNI
          leído se guarda en su ficha si no lo tenía. Así, el mes que viene casará solo.
        </p>
      )}
    </div>
  );
}

export async function NominasDelMes({ loteId, equipo, direccion, error }: { loteId: string | null; equipo: Persona[]; direccion: boolean; error: string | null }) {
  const lotes = await lotesRecientes();
  return (
    <section id="nominas" className="mt-10 scroll-mt-24">
      <Titulo extra="Sin iLovePDF, sin script, sin correos">Nóminas del mes</Titulo>
      {loteId ? (
        <Revision id={loteId} equipo={equipo} direccion={direccion} error={error} />
      ) : (
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          {lotes.length > 0 && (
            <ul className="mb-4 divide-y divide-black/5 text-sm">
              {lotes.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <b className="font-semibold capitalize">{mesLargo(l.periodo)}</b>
                    <span className="text-carbon/50"> · {l.paginas} nóminas</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {l.estado === "revision" ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">en revisión</span>
                    ) : (
                      <span className="rounded-full bg-lima-soft px-2 py-0.5 text-xs font-bold text-lima-dark">publicadas</span>
                    )}
                    <Link href={`/rrhh?lote=${l.id}#lote`} className="font-semibold text-lima-dark hover:underline">
                      {l.estado === "revision" ? "Revisar" : "Ver"}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <SubirLote />
        </div>
      )}
    </section>
  );
}
