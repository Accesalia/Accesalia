import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../../../components/BarraSuperior";
import { listarEquipo } from "../../../../../../lib/equipo";
import { actaData, destinatariosDeComunidad, fotoUrl } from "../../../../../../lib/visita";
import { actualizarActa, borrarFoto, marcarEnviada, borrarVisita } from "../acciones";
import { BotonImprimir } from "./BotonImprimir";

export const dynamic = "force-dynamic";

function fecha(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";
const btn = "rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white";

// Celda de la cabecera del acta.
function Cel({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <td className="w-[22%] border border-black/15 bg-black/[0.03] px-2 py-1 align-top text-[11px] font-semibold uppercase text-carbon/60">{k}</td>
      <td className="border border-black/15 px-2 py-1 align-top text-sm text-carbon">{v || <span className="text-carbon/30">—</span>}</td>
    </>
  );
}

export default async function ActaVisita({ params }: { params: Promise<{ id: string; visitaId: string }> }) {
  const { id, visitaId } = await params;
  const [acta, destinatarios, equipo] = await Promise.all([
    actaData(visitaId),
    destinatariosDeComunidad(id),
    listarEquipo(false),
  ]);
  if (!acta) notFound();
  const v = acta.visita;

  const activos = destinatarios.filter((d) => d.activo && d.email);
  const asunto = `Acta de visita de obra — ${acta.comunidadNombre} — ${fecha(v.fecha_visita)}`;
  const cuerpo = `Buenas,\n\nAdjunto el acta de la visita de obra del ${fecha(v.fecha_visita)} en ${acta.comunidadNombre}.\n\nUn saludo,\nAccesalia`;
  const mailto = `mailto:${activos.map((d) => d.email).join(",")}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;

  return (
    <div className="min-h-screen bg-black/[0.04] print:bg-white">
      <div className="print:hidden"><BarraSuperior /></div>

      {/* Barra de acciones (no se imprime) */}
      <div className="mx-auto flex max-w-[820px] flex-wrap items-center justify-between gap-3 px-6 pt-6 print:hidden">
        <Link href={`/comunidades/${id}/obra`} className="text-sm text-carbon/50 hover:text-carbon">← Obra</Link>
        <div className="flex flex-wrap items-center gap-2">
          {v.enviada ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Enviada {v.fecha_enviada ? `· ${fecha(v.fecha_enviada)}` : ""}</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Sin enviar</span>
          )}
          <BotonImprimir />
          {activos.length > 0 && (
            <a href={mailto} className={btn}>✉ Enviar a {activos.length}</a>
          )}
          {!v.enviada && (
            <form action={marcarEnviada.bind(null, id, visitaId)}>
              <button className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-carbon hover:border-lima">Marcar enviada</button>
            </form>
          )}
        </div>
      </div>

      {/* EL ACTA (area imprimible) */}
      <main className="mx-auto my-6 max-w-[820px] bg-white px-10 py-8 shadow-sm print:my-0 print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between border-b-2 border-lima pb-2">
          <h1 className="text-lg font-bold uppercase tracking-wide text-carbon">Acta de obras</h1>
          <span className="text-xl font-bold text-lima-dark">accesalia</span>
        </div>

        <table className="mt-4 w-full border-collapse">
          <tbody>
            <tr><td colSpan={4} className="border border-black/15 bg-lima-soft px-2 py-1 text-sm font-bold uppercase text-carbon">{acta.comunidadNombre}{acta.direccion ? ` · ${acta.direccion}` : ""}</td></tr>
            <tr><Cel k="Empresa / Cliente" v={acta.cliente} /><Cel k="Contacto / Comercial" v={acta.contacto} /></tr>
            <tr><Cel k="Tipo de obra" v={acta.tipoObra} /><Cel k="Dirección facultativa" v={acta.df ? <>{acta.df.nombre}{acta.df.titulacion ? <><br /><span className="text-xs text-carbon/60">{acta.df.titulacion}</span></> : null}</> : null} /></tr>
            <tr><Cel k="Jefe de obra" v={acta.jefeObra} /><Cel k="Fecha visita" v={<span className="font-semibold">{fecha(v.fecha_visita)}</span>} /></tr>
            <tr><Cel k="Contrata" v={acta.contrata} /><Cel k="Nº visita" v={v.numero ?? "—"} /></tr>
          </tbody>
        </table>

        <div className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-carbon">
          {v.texto_acta || <span className="text-carbon/30">Sin informe todavía.</span>}
        </div>

        {v.fotos_acta.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {v.fotos_acta.map((f) => (
              <figure key={f.id} className="overflow-hidden rounded-lg border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoUrl(f.storage_path)} alt={f.pie ?? "Foto de obra"} className="h-56 w-full object-cover" />
                {f.pie && <figcaption className="px-2 py-1 text-xs text-carbon/60">{f.pie}</figcaption>}
                <form action={borrarFoto.bind(null, id, visitaId, f.id, f.storage_path)} className="print:hidden">
                  <button className="w-full border-t border-black/5 px-2 py-1 text-[11px] text-red-500 hover:bg-red-50">Quitar foto</button>
                </form>
              </figure>
            ))}
          </div>
        )}

        {/* Firma */}
        <div className="mt-10 text-sm text-carbon">
          <div className="text-carbon/50">La dirección facultativa,</div>
          <div className="mt-8 font-semibold">{acta.df?.nombre ?? "—"}</div>
          {acta.df?.titulacion && <div className="text-xs text-carbon/60">{acta.df.titulacion}</div>}
        </div>
      </main>

      {/* Edicion (no se imprime) */}
      <div className="mx-auto max-w-[820px] px-6 pb-10 print:hidden">
        <details className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer list-none text-sm font-semibold text-lima-dark">Editar acta · añadir fotos</summary>
          <form action={actualizarActa.bind(null, id, visitaId)} className="mt-3 space-y-3" encType="multipart/form-data">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-carbon/60">Fecha
                <input type="date" name="fecha_visita" defaultValue={v.fecha_visita} className={`${inp} mt-1 block w-full`} />
              </label>
              <label className="text-xs text-carbon/60">Técnico (DF)
                <select name="autor_tecnico_id" defaultValue={v.autor_tecnico_id ?? ""} className={`${inp} mt-1 block w-full`}>
                  <option value="">— sin asignar —</option>
                  {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-xs text-carbon/60">Informe
              <textarea name="texto_acta" defaultValue={v.texto_acta ?? ""} rows={6} className={`${inp} mt-1 block w-full`} />
            </label>
            <label className="block text-xs text-carbon/60">Añadir fotos
              <input type="file" name="fotos" multiple accept="image/*" className="mt-1 block w-full text-sm text-carbon/70 file:mr-3 file:rounded-lg file:border-0 file:bg-lima-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-lima-dark" />
            </label>
            <div className="flex items-center gap-2">
              <button className={btn}>Guardar</button>
              <button formAction={borrarVisita.bind(null, id, v.obra_id, visitaId)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Borrar acta</button>
            </div>
          </form>
        </details>
      </div>
    </div>
  );
}
