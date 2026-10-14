import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Volver } from "../components/Volver";
import { quienSoy } from "../../lib/sesion";
import { HojaDelDia, diaPedido, hoyEnMadrid, vistaPedida, type Vista } from "./HojaDelDia";
import { opcionesEntrada } from "../../lib/entradaDiario";

export const dynamic = "force-dynamic";

// LA AGENDA (Monica, 14-oct-2026): UNA PAGINA POR DIA, como un papel de rayas,
// una raya cada media hora. Cada cita en su raya, ocupando las de su duracion,
// con el PARA QUE a la vista sin abrirla: "el 90% de las veces el comercial mira
// su agenda y dice: ¿esto de que iba?". Al pinchar se despliega su ficha.
// Hecha a mano, sin paquete de calendario. La agenda de la app manda; Google
// vendra despues, en un solo sentido.
//
// Esta es la de cada uno. La de un comercial sale en su marco del area
// comercial. Lee solo `citas`: las notas de Sali NO se vuelcan aqui.

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<{ dia?: string; todos?: string; vista?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/agenda");
  const { dia: pedido, todos: t, vista: v } = await searchParams;
  const dia = diaPedido(pedido);
  const vista = vistaPedida(v);
  // Quien ve todo puede mirar la agenda de todo el equipo; los demas, la suya.
  const todos = yo.veTodo && t === "1";
  // En la propia se pueden crear citas; en la de todo el equipo, no (¿de quien?).
  const personas = todos ? undefined : (await opcionesEntrada()).personas;

  const enlace = (d: string, conTodos = todos, vi: Vista = vista) => {
    const q = new URLSearchParams();
    if (d !== hoyEnMadrid()) q.set("dia", d);
    if (vi === "semana") q.set("vista", "semana");
    if (conTodos) q.set("todos", "1");
    const s = q.toString();
    return "/agenda" + (s ? "?" + s : "");
  };
  const pildora = (activa: boolean) =>
    "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition " +
    (activa ? "bg-carbon text-white" : "text-carbon/65 hover:text-carbon");

  return (
    <>
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1000px] px-4 pb-20 pt-5 sm:px-6">
        <Volver siNoHay="/menu" />
        <div className="mt-3">
          <HojaDelDia
            dia={dia}
            deQuien={todos ? undefined : yo.id}
            vista={vista}
            enlace={(d, vi) => enlace(d, todos, vi)}
            personas={personas}
            extra={
              yo.veTodo && (
                <div className="flex gap-0.5 rounded-full border border-black/10 bg-white p-0.5">
                  <Link href={enlace(dia, false)} className={pildora(!todos)}>La mía</Link>
                  <Link href={enlace(dia, true)} className={pildora(todos)}>Todo el equipo</Link>
                </div>
              )
            }
          />
        </div>
      </main>
    </>
  );
}
