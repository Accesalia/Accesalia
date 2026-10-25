import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { datosGenerador, oppsParaHoja, puedeHacerHojas, puedeVerOpp } from "../../../lib/hojaGenerador";
import { EDITABLE, borradoresDe, formasParaHoja, nombresDeTipos } from "../../../lib/hojaCompromisos";
import { ArbolHoja, ElegirOpp, type Defecto, type PagadorOpcion, type PrecioArbol } from "./ArbolHoja";

export const dynamic = "force-dynamic";

// LA HOJA DE ENCARGO (Monica, 22-25-oct-2026): el generador en arbol de la maqueta validada (docs/figma/hoja-encargo-arbol.md),
// que sustituye al de antes. Se entra desde el bloque 2 de la oportunidad o desde el boton «Hoja de encargo» del area
// comercial (que pregunta de que opp). Va POR OPORTUNIDAD: «tener CP no deberia condicionar nada». Pueden entrar comercial,
// secretaria comercial y direccion; un comercial, solo con las oportunidades de su cartera.
//   - Lo que les interesa y el catalogo de bloques salen de la base; las tarifas proponen el precio segun quien paga, las
//     viviendas y el PEM; la comision del admin se suma; las formas de pago, de he_formas_pago con su caso por defecto.
//   - Guarda en borrador (se sigue con ?borrador=) o GENERA: va al ok de Daniel con su presupuesto y lleva a la opp,
//     donde la hoja sale en el bloque 2 con lo que toca en su fase.

// Lo que les interesa (oportunidad_tipos) -> el paquete del catalogo que lo cubre.
const PAQUETE: Record<string, string> = {
  Ascensor: "asc", Subvenciones: "subv", CSS: "css", IEE: "iee", DF: "df", CAES: "caes", Financiación: "fin",
  "Consulta urbanística": "cons", "Informe técnico": "inf", "Informe pericial": "per", "Memoria técnica valorada": "mem", "3 Presupuestos": "tres",
  Plataforma: "acc", Rampa: "acc", Accesibilidad: "acc", "Cota cero": "acc", "Modificación asc.": "acc", "Sustitución de ascensor": "acc",
  "Accesibilidad portal": "acc", "Añadir parada": "acc", "Cambio de puertas": "acc", "Cambio de cabina": "acc",
  "SATE envolvente completa": "efi", "SATE fachada": "efi", "SATE cubierta": "efi", Aerotermia: "efi", Fotovoltaica: "efi", "Eficiencia energética": "efi",
};

const cuando = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" });

export default async function HojaDeEncargo({ searchParams }: { searchParams: Promise<{ opp?: string; borrador?: string }> }) {
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=" + encodeURIComponent("/comercial/hoja-encargo" + (sp.opp ? `?opp=${sp.opp}` : "")));
  if (!puedeHacerHojas(yo)) redirect("/comercial");
  const permitida = sp.opp ? await puedeVerOpp(yo, sp.opp) : false;
  const [opps, d, fp, guardadas, nombreTipo] = await Promise.all([
    oppsParaHoja(yo),
    permitida ? datosGenerador(sp.opp!) : Promise.resolve(null),
    formasParaHoja(),
    permitida ? borradoresDe(sp.opp!) : Promise.resolve([]),
    nombresDeTipos(),
  ]);

  const defectos: Record<string, Defecto> = {};
  for (const b of d?.bloques ?? [])
    defectos[b.codigo] = {
      cobra: b.desglose === "se_cobra",
      importe: b.importe != null ? Number(b.importe) : null,
      pct: b.exito?.porcentaje ?? null,
      titulo: b.titulo,
      puntos: b.puntos,
    };
  const interesa = [...new Set((d?.interes ?? []).map((t) => PAQUETE[t.nombre]).filter(Boolean))];
  // A QUIEN VA: su comunidad, los particulares titulares de sus accesos o cualquier contrata.
  const pagadores: PagadorOpcion[] = d
    ? [
        ...(d.comunidad ? [{ valor: "comunidad", texto: d.comunidad.nombre, pista: d.comunidad.cif ?? "sin CIF", cif: d.comunidad.cif, tarifaId: null }] : []),
        ...d.personas.map((x) => ({ valor: `persona:${x.id}`, texto: x.nombre, pista: "particular, titular", cif: null, tarifaId: null })),
        ...d.contratas.map((c) => ({ valor: `contrata:${c.id}`, texto: c.nombre, pista: c.cif ?? "contrata", cif: c.cif, tarifaId: c.tarifaId })),
      ]
    : [];
  // LAS TARIFAS, con el bloque por su codigo y el tipo por su nombre, como el arbol.
  const codigoBloque = new Map((d?.bloques ?? []).map((b) => [b.id, b.codigo]));
  const precios: PrecioArbol[] = (d?.tarifas.precios ?? [])
    .filter((p) => codigoBloque.has(p.bloqueId))
    .map((p) => ({
      tarifaId: p.tarifaId, tarifa: p.tarifa, bloque: codigoBloque.get(p.bloqueId)!, tipo: p.tipoId ? nombreTipo.get(p.tipoId) ?? null : null,
      desde: p.desde, hasta: p.hasta, forma: p.forma, importe: p.importe, porcentaje: p.porcentaje,
      incluye: p.incluye.map((i) => codigoBloque.get(i)).filter((x): x is string => !!x),
    }));
  // LA COMISION DEL ADMINISTRADOR (sumada SI O SI): sobre que cobra cada bloque. Proyecto = el proyecto basico y de
  // ejecucion (y los SATE con cesion de CAES); subvenciones = las de su area. Los servicios NUNCA.
  const sobre: Record<string, "proyecto" | "subvenciones"> = {};
  for (const b of d?.bloques ?? []) {
    if (b.area === "SUBV" || /^TRAMITACION SUBVENCIONES/.test(b.codigo)) sobre[b.codigo] = "subvenciones";
    else if (b.codigo === "REDACCION PROYECTO" || /CON CESION DE CAES$/.test(b.codigo)) sobre[b.codigo] = "proyecto";
  }
  const comision = d?.comision ? { persona: d.comision.persona, proyecto: d.comision.proyecto, subvenciones: d.comision.subvenciones, sobre } : null;
  // El borrador abierto (en borrador o devuelto por Daniel con cambios): se carga para seguir con el.
  const abierto = guardadas.find((g) => g.id === sp.borrador && EDITABLE.includes(g.estado)) ?? null;
  const sinPaquete = (d?.interes ?? []).filter((t) => !PAQUETE[t.nombre]).map((t) => t.nombre);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href={d ? `/comercial/oportunidades/${d.opp.id}` : "/comercial"}>{d ? "← La oportunidad" : "← Área comercial"}</Salida>
        <div className="mt-3 border-b border-black/10 pb-3">
          <h1 className="text-2xl font-bold text-carbon">Hoja de encargo{d ? ` · ${d.opp.nombre}` : ""}</h1>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <ElegirOpp opciones={opps} valor={sp.opp ?? null} />
          {d && (
            <span className="text-sm text-carbon/70">
              {d.interes.length > 0 && <>Les interesa: <b className="text-carbon">{d.interes.map((t) => t.nombre).join(", ")}</b></>}
              {sinPaquete.length > 0 && <span className="text-amber-800/80"> (sin paquete en el catálogo: {sinPaquete.join(", ")})</span>}
            </span>
          )}
        </div>
        {sp.opp && !permitida && <p className="mt-3 text-sm text-amber-800/80">Esa oportunidad no es de tu cartera.</p>}
        {d && abierto && (
          <p className="mt-3 text-sm text-carbon/80">
            Estás cambiando {abierto.codigo ? <b>la versión {abierto.numero} de {abierto.codigo}</b> : <b>el borrador del {cuando(abierto.creadoEn)}</b>}: al guardar se queda en el mismo.{" "}
            <a className="font-semibold text-carbon underline" href={`/comercial/hoja-encargo?opp=${d.opp.id}`}>Empezar una hoja nueva</a>
          </p>
        )}
        {d && abierto?.ultimo?.estado === "cambios_daniel" && abierto.ultimo.nota && (
          <p className="mt-2 rounded-lg border border-alerta/40 bg-[#fbeeee] px-3 py-2 text-sm text-alerta">
            <b>Daniel pide cambios{abierto.ultimo.quien ? ` (${abierto.ultimo.quien})` : ""}:</b> {abierto.ultimo.nota}
          </p>
        )}
        <div className="mt-4">
          {d ? (
            <ArbolHoja key={`${d.opp.id}|${abierto?.id ?? ""}`} oppId={d.opp.id} defectos={defectos} interesa={interesa} accesos={d.accesos} formas={fp.formas}
              casos={fp.casos} pagadores={pagadores} comision={comision} comisionAviso={d.comisionAviso} tarifas={{ generalId: d.tarifas.generalId, precios }} pem={d.pem}
              municipio={d.comunidad?.municipio ?? d.municipio} borrador={abierto ? { id: abierto.id, lineas: abierto.lineas, pagador: abierto.pagador } : null} />
          ) : sp.opp && permitida ? (
            <p className="text-sm text-amber-800/80">No encuentro esa oportunidad.</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
