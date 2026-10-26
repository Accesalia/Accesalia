import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { letraMenu } from "../../components/letraMenu";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { listarComerciales } from "../../../lib/comercial";
import { listaAbiertas } from "../../../lib/listaAbiertas";
import { PASOS } from "../../../lib/pasosEscalera";
import { ListaAbiertas } from "./ListaAbiertas";

export const dynamic = "force-dynamic";

// OPORTUNIDADES ABIERTAS, LA LISTA NUEVA (Monica, 26-oct-2026; maqueta validada
// docs/figma/oportunidades-abiertas-clara.html). Una fila por opp, con buscador, orden y filtros que se suman. Se entra
// por la tarjeta «Oportunidades abiertas» del submenu del area; la de siempre sigue en «Navegacion rapida». Quien ve
// que, como en /comercial: direccion y supervision comercial, todas las carteras con el selector; un comercial, la suya.

const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

export default async function Pagina({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/abiertas");
  const direccion = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const mio = await comercialDe(yo.id);
  if (!direccion && !mio) redirect(puedeEntrar(yo, "comercial") ? "/comercial" : "/menu");

  const comerciales = await listarComerciales();
  const elegido = direccion ? (comerciales.find((x) => x.id === c) ?? null) : (comerciales.find((x) => x.id === mio!.id) ?? null);
  const todos = direccion && !elegido;
  const filas = await listaAbiertas(elegido?.id ?? null);
  const hoy = FECHA_LARGA.format(new Date());
  // Los puntos de la escalera, en su orden, para el desplegable «Ver solo».
  const pasos = PASOS.map((p) => ({ clave: p.clave, titulo: p.titulo, hecha: p.seccion === "completado" || p.seccion === "cerrada" }));

  return (
    <div className={`${letraMenu.variable} min-h-screen bg-[#2e3236]`}>
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1470px] px-6 pb-16 pt-4">
        <Salida href={`/comercial${c ? `?c=${c}` : ""}`}>← Accesos del área comercial</Salida>
        <ListaAbiertas
          filas={filas}
          pasos={pasos}
          saludo={{ nombre: todos ? null : elegido && direccion ? elegido.nombre : yo.nombre, hoy: hoy.charAt(0).toUpperCase() + hoy.slice(1) }}
          carteras={direccion ? { elegido: elegido?.id ?? null, lista: comerciales.map((m) => ({ id: m.id, nombre: m.nombre })) } : null}
        />
      </main>
    </div>
  );
}
