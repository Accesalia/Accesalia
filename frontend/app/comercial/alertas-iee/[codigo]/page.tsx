import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { alertaIEE } from "../../../../lib/alertasIEE";

export const dynamic = "force-dynamic";

// LA FICHA DEL IEE.
//
//   "En esa ficha de IEE vienen los datos, pero no hace falta HOY hacer nada con
//    ellos salvo verlos. Es algo que primero debemos tener y luego evaluar."
//
// Asi que aqui NO se interpreta nada: se enseña lo que dice el registro y ya.
// Las lecturas -que si esto significa que necesitan ascensor, que si la letra G
// abre tal subvencion- vendran cuando ella decida cuales son.
//
// Y UNA ACLARACION QUE HAY QUE HACER EN PANTALLA: no hay PDF que descargar. El
// boton "Descargar Nota Informativa" del registro solo abre esta misma
// informacion para imprimirla. Lo que tenemos guardado es el dato, que es mas
// util que un papel, pero conviene decirlo para que nadie busque un adjunto que
// no existe.

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const ROTULO = "text-[11px] font-bold uppercase tracking-wider text-carbon/45";

const enCastellano = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const siNo = (b: boolean | null) => (b === null ? "No consta" : b ? "Sí" : "No");

export default async function FichaIEE({ params }: { params: Promise<{ codigo: string }> }) {
  const yo = await quienSoy();
  const { codigo } = await params;
  if (!yo) redirect(`/entrar?volver=/comercial/alertas-iee/${codigo}`);
  if (!puedeEntrar(yo, "comercial", "ver")) redirect("/menu");

  const a = await alertaIEE(codigo);

  if (!a) {
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <main className="mx-auto w-full max-w-[820px] px-6 pb-16 pt-5">
          <Link href="/comercial/alertas-iee" className="text-sm font-semibold text-carbon/55 hover:text-carbon">
            ← Radar de IEE
          </Link>
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-[14px] text-amber-900">
            No hay ningún informe guardado con el número <b>{codigo}</b>.
          </div>
        </main>
      </div>
    );
  }

  const desfavorable = (a.valoracion ?? "").toLowerCase().startsWith("desfavorable");

  const secciones: { titulo: string; datos: [string, string][] }[] = [
    {
      titulo: "El edificio",
      datos: [
        ["Dirección", a.direccion ?? "No consta"],
        ["Municipio", a.municipio ?? "No consta"],
        ["Código postal", a.cp ?? "No consta"],
        ["Referencia catastral", a.referencia ?? "No consta"],
        ["Año de construcción", a.anioConstruccion ? String(a.anioConstruccion) : "No consta"],
      ],
    },
    {
      titulo: "El informe",
      datos: [
        ["Nº de registro", a.codigo],
        ["Fecha de emisión", enCastellano(a.fechaEmision)],
        ["Validez", a.validez ?? "No consta"],
        ["Estado del expediente", a.estadoExpediente ?? "No consta"],
        ["Lo vimos aparecer el", enCastellano(a.vistoEn.slice(0, 10))],
      ],
    },
    {
      titulo: "Conservación",
      datos: [
        ["Valoración final", a.valoracion ?? "No consta"],
        ["Deficiencias subsanadas", a.deficienciasSubsanadas ?? "No consta"],
      ],
    },
    {
      titulo: "Accesibilidad y energía",
      datos: [
        ["Satisface las condiciones de accesibilidad", siNo(a.accesibilidadSatisface)],
        ["Admite ajustes razonables", siNo(a.accesibilidadAjustes)],
        ["Calificación energética", a.calificacionEnergetica ?? "No consta"],
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1000px] px-6 pb-16 pt-5">
        <Link href="/comercial/alertas-iee" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Radar de IEE
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className={ROTULO}>Informe de Evaluación del Edificio</div>
            <h1 className="mt-1 text-[25px] font-bold leading-tight text-carbon">
              {a.direccion ?? "Sin dirección"}
            </h1>
            <p className="mt-1.5 text-[13px] text-carbon/60">
              Registro de la Comunidad de Madrid, nº <b className="text-carbon/80">{a.codigo}</b>
              {a.municipio && <> · {a.municipio}</>}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className={
                "rounded-full px-3.5 py-1.5 text-[13px] font-bold " +
                (desfavorable ? "bg-amber-100 text-amber-800" : "bg-hueso text-carbon/60")
              }
            >
              {a.valoracion ?? "Sin valoración"}
            </span>
            {a.referenciaParcela && (
              <Link
                href={`/comercial/edificio/${a.referenciaParcela}`}
                className="inline-flex h-[32px] items-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3.5 text-[12px] font-bold uppercase text-white transition hover:bg-[#46769c]"
              >
                Ver el edificio
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {secciones.map((s) => (
            <section key={s.titulo} className={CAJA + " p-4"}>
              <h2 className={ROTULO + " mb-2"}>{s.titulo}</h2>
              <dl className="text-[13px]">
                {s.datos.map(([q, v]) => (
                  <div
                    key={q}
                    className="flex items-baseline justify-between gap-4 border-t border-black/5 py-2 first:border-t-0 first:pt-0"
                  >
                    <dt className="text-carbon/55">{q}</dt>
                    <dd
                      className={
                        "text-right font-semibold " +
                        (v === "No consta" ? "text-carbon/35" : "text-carbon")
                      }
                    >
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        {a.asignadaA && (
          <section className={CAJA + " mt-4 p-4"}>
            <h2 className={ROTULO + " mb-2"}>El reparto</h2>
            <p className="text-[13px] text-carbon/70">
              Se le pasó a <b className="text-carbon">{a.comercial}</b> el{" "}
              {enCastellano((a.asignadaEn ?? "").slice(0, 10))}.{" "}
              {a.asignadaEmailFallo ? (
                <span className="text-amber-700">El correo no salió: {a.asignadaEmailFallo}.</span>
              ) : a.asignadaEmailEn ? (
                <span className="text-lima-dark">Se le avisó por correo.</span>
              ) : null}
            </p>
          </section>
        )}

        <p className="mt-5 text-[12px] leading-relaxed text-carbon/45">
          Estos datos son los que publica el Registro de IEE de la Comunidad de Madrid, y los
          guardamos el día que aparecieron. No hay PDF que descargar: el registro no lo ofrece, solo
          deja imprimir esta misma información.{" "}
          <a
            href="https://www.rieecm.es/portal/home"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#2B6CB0] hover:underline"
          >
            Consultarlo en el registro oficial
          </a>
          .
        </p>
      </main>
    </div>
  );
}
