import Link from "next/link";
import { aHoraMadrid, citasDeLaSemana, citasDelDia, tiposDeCita, type CitaDelDia } from "../../lib/citas";
import { Dia, Semana } from "./Dia";
import type { Opcion } from "../components/Elegir";

// LA HOJA DE UNA AGENDA: la fecha con sus flechas, el cambio Dia / Semana y el
// papel de rayas. La usan la pagina /agenda (la de cada uno) y el marco "Agenda"
// del area comercial (la de ESE comercial, Monica 14-oct-2026). `enlace` dice a
// donde lleva cada dia y cada vista, porque cada sitio lo lleva en su direccion.

export type Vista = "dia" | "semana";

const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const DIA_MES = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "UTC" });
const DIA_MES_ANO = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const hoyEnMadrid = () => aHoraMadrid(new Date().toISOString()).slice(0, 10);

/** El dia pedido en la direccion, si es valido; si no, hoy. */
export const diaPedido = (pedido: string | undefined) => (pedido && /^\d{4}-\d{2}-\d{2}$/.test(pedido) ? pedido : hoyEnMadrid());
export const vistaPedida = (pedida: string | undefined): Vista => (pedida === "semana" ? "semana" : "dia");

const masDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const fecha = (dia: string) => new Date(`${dia}T12:00:00Z`);
/** El lunes de la semana de ese dia. */
const lunesDe = (dia: string) => masDias(dia, -((fecha(dia).getUTCDay() + 6) % 7));

/** Su dia y sus minutos desde las 00:00 de Madrid, para ponerla en su raya. */
function enRaya(c: CitaDelDia) {
  const local = aHoraMadrid(c.inicio);
  const [h, m] = local.slice(11).split(":").map(Number);
  return { ...c, dia: local.slice(0, 10), desde: h * 60 + m, hasta: h * 60 + m + c.minutos };
}

export async function HojaDelDia({
  dia,
  vista = "dia",
  deQuien,
  enlace,
  extra,
  personas,
}: {
  dia: string;
  vista?: Vista;
  /** La persona del equipo de la agenda; sin ella, la de todos. */
  deQuien?: string;
  enlace: (dia: string, vista: Vista) => string;
  /** Lo que va a la derecha de la fecha (el selector de la agenda, p. ej.). */
  extra?: React.ReactNode;
  /** Las personas para el "con quien". Si vienen (y la agenda es de alguien),
   *  se pueden crear, editar y mover citas. */
  personas?: Opcion[];
}) {
  const hoy = hoyEnMadrid();
  const semana = vista === "semana";
  const lunes = lunesDe(dia);
  const dias = Array.from({ length: 7 }, (_, i) => masDias(lunes, i));
  const citas = (semana ? await citasDeLaSemana(lunes, deQuien) : await citasDelDia(dia, deQuien)).map(enRaya);
  const editable = personas && deQuien ? { deQuien, personas, tipos: await tiposDeCita() } : undefined;

  const salto = semana ? 7 : 1;
  const titulo = semana
    ? fecha(lunes).getUTCMonth() === fecha(dias[6]).getUTCMonth()
      ? `${fecha(lunes).getUTCDate()} – ${DIA_MES_ANO.format(fecha(dias[6]))}`
      : `${DIA_MES.format(fecha(lunes))} – ${DIA_MES_ANO.format(fecha(dias[6]))}`
    : FECHA_LARGA.format(fecha(dia));
  const enEsta = semana ? dias.includes(hoy) : dia === hoy;

  const flecha =
    "grid size-9 place-items-center rounded-full border border-black/10 bg-white text-lg font-bold text-carbon/70 transition hover:border-lima hover:text-carbon";
  const pildora = (activa: boolean) =>
    "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition " +
    (activa ? "bg-carbon text-white" : "text-carbon/65 hover:text-carbon");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-black/10 pb-4">
        <div className="flex items-center gap-2">
          <Link href={enlace(masDias(dia, -salto), vista)} className={flecha} aria-label={semana ? "Semana anterior" : "Día anterior"}>‹</Link>
          <Link href={enlace(masDias(dia, salto), vista)} className={flecha} aria-label={semana ? "Semana siguiente" : "Día siguiente"}>›</Link>
        </div>
        <h2 className="text-2xl font-bold leading-tight text-carbon first-letter:uppercase sm:text-3xl">{titulo}</h2>
        <div className="ml-auto flex items-center gap-3">
          {!enEsta && (
            <Link href={enlace(hoy, vista)} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-carbon/70 hover:text-carbon">
              Hoy
            </Link>
          )}
          {/* En el movil la semana no cabe: ahi solo el dia. */}
          <div className="hidden gap-0.5 rounded-full border border-black/10 bg-white p-0.5 sm:flex">
            <Link href={enlace(dia, "dia")} className={pildora(!semana)}>Día</Link>
            <Link href={enlace(dia, "semana")} className={pildora(semana)}>Semana</Link>
          </div>
          {extra}
        </div>
      </div>
      {semana ? (
        <Semana dias={dias} hoy={hoy} enlacesDia={dias.map((d) => enlace(d, "dia"))} citas={citas} editable={editable} />
      ) : (
        <Dia dia={dia} citas={citas} editable={editable} />
      )}
    </div>
  );
}
