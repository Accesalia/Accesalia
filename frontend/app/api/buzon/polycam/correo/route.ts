import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { quienSoy } from "../../../../../lib/sesion";

// QUE ES ESTE CORREO DEL BUZON DE POLYCAM (Monica, 12-oct-2026). El correo 12
// colgaba todas las pasadas desde el 7-oct y nadie podia mirarlo: el buzon pide
// el 2FA del movil y la llave de la app esta en Vercel como "sensible". Asi que
// se pregunta desde aqui, en SOLO LECTURA (no se marca nada), y con preguntas
// cortas, cada una con su tiempo maximo: se ve cuales contesta Gmail y cuales no.
// Solo direccion. /api/buzon/polycam/correo?uid=12

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ESPERA = 30_000;

async function conTiempo<T>(que: string, f: () => Promise<T>): Promise<{ que: string; segundos: number; contesta: boolean; dice: unknown }> {
  const t = Date.now();
  try {
    const dice = await Promise.race([
      f(),
      new Promise<never>((_, mal) => setTimeout(() => mal(new Error(`sin respuesta en ${ESPERA / 1000} s`)), ESPERA)),
    ]);
    return { que, segundos: Math.round((Date.now() - t) / 100) / 10, contesta: true, dice };
  } catch (e) {
    return { que, segundos: Math.round((Date.now() - t) / 100) / 10, contesta: false, dice: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: Request) {
  const yo = await quienSoy();
  if (!yo?.veTodo) return NextResponse.json({ error: "Solo dirección." }, { status: 403 });
  const uid = Number(new URL(req.url).searchParams.get("uid") ?? "12");
  const usuario = process.env.BUZON_POLYCAM_USUARIO;
  const clave = process.env.BUZON_POLYCAM_CLAVE;
  if (!usuario || !clave) return NextResponse.json({ error: "Faltan las llaves del buzón." }, { status: 500 });

  const cliente = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: usuario, pass: clave.replace(/\s+/g, "") },
    logger: false,
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  });

  const pasos = [];
  pasos.push(await conTiempo("conectar", () => cliente.connect().then(() => "ok")));
  // EXAMINE: solo lectura, no cambia nada del buzon.
  pasos.push(await conTiempo("abrir la bandeja (solo lectura)", () => cliente.mailboxOpen("INBOX", { readOnly: true }).then((m) => `${m.exists} correos`)));
  pasos.push(await conTiempo("cuales estan sin leer", () => cliente.search({ seen: false }, { uid: true })));
  pasos.push(await conTiempo("cuales pasan de 40 MB", () => cliente.search({ larger: 40 * 1024 * 1024 }, { uid: true })));
  pasos.push(await conTiempo("cuales pasan de 10 MB", () => cliente.search({ larger: 10 * 1024 * 1024 }, { uid: true })));
  // Si una pregunta se cuelga, las de detras esperan en la misma conexion: por
  // eso lo que mas interesa (quien y que asunto) va primero.
  const de = (q: Record<string, unknown>) => cliente.fetchOne(String(uid), q, { uid: true });
  pasos.push(await conTiempo(`correo ${uid}: fecha de llegada`, () => de({ internalDate: true }).then((m) => (m ? m.internalDate : "no existe"))));
  pasos.push(
    await conTiempo(`correo ${uid}: remitente y asunto`, () =>
      de({ envelope: true }).then((m) => (m ? { de: m.envelope?.from, asunto: m.envelope?.subject, fecha: m.envelope?.date } : "no existe")),
    ),
  );
  pasos.push(await conTiempo(`correo ${uid}: tamaño`, () => de({ size: true }).then((m) => (m ? `${((m.size ?? 0) / 1048576).toFixed(1)} MB` : "no existe"))));
  pasos.push(await conTiempo(`correo ${uid}: que lleva dentro`, () => de({ bodyStructure: true }).then((m) => (m ? m.bodyStructure : "no existe"))));
  // LA VELOCIDAD (13-oct-2026): Gmail contesta al instante que es cada correo
  // pero ninguno de 10-30 MB se baja en 60 s. Se baja el adjunto mas grande
  // durante 20 s, sin guardarlo, y se mide. ?otros=13,14,15 dice que son esos.
  pasos.push(
    await conTiempo(`correo ${uid}: velocidad de descarga (20 s, sin guardar)`, async () => {
      const m = await de({ bodyStructure: true });
      type Nodo = { part?: string; size?: number; disposition?: string; childNodes?: Nodo[] };
      const partes: Nodo[] = [];
      const recorrer = (n?: Nodo) => {
        if (!n) return;
        if (n.disposition === "attachment" || (!n.childNodes && (n.size ?? 0) > 100_000)) partes.push(n);
        n.childNodes?.forEach(recorrer);
      };
      recorrer(m?.bodyStructure as Nodo | undefined);
      const mayor = partes.sort((x, y) => (y.size ?? 0) - (x.size ?? 0))[0];
      if (!mayor?.part) return "sin adjunto";
      const t = Date.now();
      const { content } = await cliente.download(String(uid), mayor.part, { uid: true });
      let bytes = 0;
      await new Promise<void>((bien) => {
        const corta = setTimeout(() => {
          content.destroy();
          bien();
        }, 20_000);
        content.on("data", (c: Buffer) => (bytes += c.length));
        content.on("end", () => {
          clearTimeout(corta);
          bien();
        });
        content.on("error", () => {
          clearTimeout(corta);
          bien();
        });
      });
      const seg = (Date.now() - t) / 1000;
      return {
        parte: mayor.part,
        bajado: `${(bytes / 1048576).toFixed(1)} de ${((mayor.size ?? 0) / 1048576).toFixed(1)} MB`,
        velocidad: `${(bytes / 1048576 / seg).toFixed(2)} MB/s`,
        segundos: Math.round(seg),
      };
    }),
  );
  const otros = (new URL(req.url).searchParams.get("otros") ?? "").split(",").map(Number).filter((n) => n > 0);
  for (const o of otros) {
    pasos.push(
      await conTiempo(`correo ${o}: quien, asunto y tamaño`, () =>
        cliente
          .fetchOne(String(o), { envelope: true, size: true, internalDate: true }, { uid: true })
          .then((m) => (m ? { de: m.envelope?.from?.[0]?.address, asunto: m.envelope?.subject, llego: m.internalDate, mb: ((m.size ?? 0) / 1048576).toFixed(1) } : "no existe")),
      ),
    );
  }
  try {
    cliente.close();
  } catch {}
  return NextResponse.json({ uid, pasos }, { status: 200 });
}
