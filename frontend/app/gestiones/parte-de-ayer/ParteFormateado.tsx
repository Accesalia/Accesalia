import type { ReactNode } from "react";

// EL PARTE, FORMATEADO (Monica, 31-oct-2026: «ahora se ve todo farragoso,
// simples bloques de texto»). Sali contesta en markdown con las secciones que
// piden las instrucciones (URGENTE, NUEVO CLIENTE...). Aqui cada seccion va en su
// tarjeta, con su color, y cada asunto (lo que empieza por «→» o por un numero)
// como un bloque con su titulo en negrita y sus lineas debajo. No se cambia ni
// una palabra de lo que dijo Sali: solo se le da forma.

type Asunto = { titulo: string | null; lineas: { nivel: number; texto: string }[] };
type Seccion = { titulo: string; asuntos: Asunto[] };

// El color de cada seccion: lo urgente en rojo, lo resuelto apagado.
const TONOS: { clave: RegExp; marco: string; cabeza: string }[] = [
  { clave: /URGENTE/, marco: "border-alerta/60", cabeza: "bg-alerta text-white" },
  { clave: /NUEVO/, marco: "border-lima", cabeza: "bg-lima text-carbon" },
  { clave: /DOCUMENTO/, marco: "border-[#5680a1]/60", cabeza: "bg-[#5680a1] text-white" },
  { clave: /OFERTA|SEGUIMIENTO/, marco: "border-[#223a5d]/50", cabeza: "bg-[#223a5d] text-white" },
  { clave: /VISITA|CITA/, marco: "border-[#754a04]/50", cabeza: "bg-[#754a04] text-white" },
  { clave: /JUGADA|ESTRATEG|RECOMEND/, marco: "border-[#0f1558]/50", cabeza: "bg-[#0f1558] text-white" },
  { clave: /RESUELTO/, marco: "border-black/15", cabeza: "bg-[#e3e6df] text-carbon/70" },
  { clave: /DESCARTADO/, marco: "border-black/10", cabeza: "bg-[#f0f2ee] text-carbon/50" },
];
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const tono = (t: string) => TONOS.find((x) => x.clave.test(sinTildes(t))) ?? { marco: "border-black/15", cabeza: "bg-[#f0f2ee] text-carbon" };

const limpiarTitulo = (s: string) =>
  s
    .replace(/\*\*/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .trim();

function trocear(texto: string): { secciones: Seccion[]; sueltas: string[] } {
  const secciones: Seccion[] = [];
  const sueltas: string[] = [];
  let actual: Seccion | null = null;
  let asunto: Asunto | null = null;

  for (const bruta of texto.replace(/\r/g, "").split("\n")) {
    if (!bruta.trim() || /^\s*-{3,}\s*$/.test(bruta) || /^\s*_{3,}\s*$/.test(bruta)) continue;
    const cabecera = bruta.match(/^\s*#{1,4}\s+(.*)$/);
    if (cabecera) {
      const t = limpiarTitulo(cabecera[1]);
      // Un titulo general del parte («PARTE DE AYER...») no es una seccion.
      if (/^PARTE\b/.test(sinTildes(t)) && !secciones.length) continue;
      actual = { titulo: t, asuntos: [] };
      secciones.push(actual);
      asunto = null;
      continue;
    }
    if (!actual) {
      sueltas.push(bruta.trim());
      continue;
    }
    const sangria = (bruta.match(/^\s*/)?.[0].length ?? 0) / 2;
    const linea = bruta.trim();
    // El asunto empieza por «→» o por un numero, a veces dentro de una negrita
    // mal cerrada («**1. **C/ Mostoles 3****»): el titulo va en negrita entero.
    const inicio = linea.replace(/^\*\*\s*/, "").match(/^(?:→|->|\d+\.)\s*(.*)$/);
    if (inicio && sangria < 1) {
      asunto = { titulo: inicio[1].replace(/\*\*/g, "").replace(/:\s*$/, ""), lineas: [] };
      actual.asuntos.push(asunto);
      continue;
    }
    if (!asunto) {
      asunto = { titulo: null, lineas: [] };
      actual.asuntos.push(asunto);
    }
    const viñeta = linea.match(/^[-*•]\s+(.*)$/);
    asunto.lineas.push({ nivel: viñeta ? Math.min(3, Math.floor(sangria)) : 0, texto: viñeta ? viñeta[1] : linea });
  }
  return { secciones, sueltas };
}

/** Negritas, cursivas, `codigo` y [enlaces](url), sin HTML de por medio. */
function enLinea(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  s = s.replace(/\*{3,}/g, "**");
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;
  let ultimo = 0;
  let i = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > ultimo) out.push(s.slice(ultimo, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<b key={i++} className="font-semibold text-carbon">{t.slice(2, -2)}</b>);
    else if (t.startsWith("`")) out.push(<span key={i++} className="rounded bg-black/[0.05] px-1 text-[12.5px]">{t.slice(1, -1)}</span>);
    else if (t.startsWith("[")) {
      const [, texto, url] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      if (/^(https?:\/\/|\/)/.test(url))
        out.push(
          <a key={i++} href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2E5D88] hover:underline">
            {texto}
          </a>,
        );
      else out.push(texto);
    } else out.push(<i key={i++}>{t.slice(1, -1)}</i>);
    ultimo = m.index! + t.length;
  }
  if (ultimo < s.length) out.push(s.slice(ultimo));
  return out;
}

export function ParteFormateado({ texto }: { texto: string }) {
  const { secciones, sueltas } = trocear(texto);
  if (!secciones.length) return <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-carbon">{texto}</div>;

  // Lo urgente a lo ancho, arriba; el resto en mosaico de dos.
  const [urgentes, resto] = [secciones.filter((s) => /URGENTE/.test(sinTildes(s.titulo))), secciones.filter((s) => !/URGENTE/.test(sinTildes(s.titulo)))];
  return (
    <div className="space-y-4">
      {sueltas.length > 0 && !/^aqu[ií] tienes/i.test(sueltas[0]) && <p className="text-[13px] text-carbon/60">{enLinea(sueltas.join(" "))}</p>}
      {urgentes.map((s, k) => (
        <Tarjeta key={`u${k}`} seccion={s} />
      ))}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {resto.map((s, k) => (
          <Tarjeta key={k} seccion={s} />
        ))}
      </div>
    </div>
  );
}

function Tarjeta({ seccion }: { seccion: Seccion }) {
  const t = tono(seccion.titulo);
  return (
    <section className={`overflow-hidden rounded-2xl border-2 bg-white ${t.marco}`}>
      <h3 className={`px-4 py-2 text-[12.5px] font-bold uppercase tracking-wider ${t.cabeza}`}>{seccion.titulo}</h3>
      <div className="divide-y divide-black/5">
        {seccion.asuntos.length === 0 && <p className="px-4 py-3 text-[13px] text-carbon/45">—</p>}
        {seccion.asuntos.map((a, i) => (
          <div key={i} className="px-4 py-3">
            {a.titulo && <p className="text-[14px] font-semibold leading-snug text-carbon">{enLinea(a.titulo)}</p>}
            {a.lineas.length > 0 && (
              <ul className={`${a.titulo ? "mt-1.5" : ""} space-y-1`}>
                {a.lineas.map((l, j) => (
                  <li
                    key={j}
                    className="text-[13px] leading-relaxed text-carbon/80"
                    style={{ paddingLeft: `${l.nivel * 16}px` }}
                  >
                    {l.nivel > 0 && <span className="mr-1.5 text-carbon/35">•</span>}
                    {enLinea(l.texto)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
