import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// ¿ABRE LA LLAVE? (Monica, 29-sep-2026).
//
// Antes de montar el lector del buzon entero, una sola pregunta: ¿se conecta?
// Devuelve cuantos correos hay y los ultimos asuntos, para que ella vea de un
// vistazo que es SU buzon y no otro.
//
// NUNCA devuelve la contraseña ni parte de ella. Y solo entra quien lo ve todo
// -direccion-: esto no es una pagina publica.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const yo = await quienSoy();
  if (!yo || !(yo.veTodo || puedeEntrar(yo, "comercial", "supervisar")))
    return NextResponse.json({ error: "Esto solo lo puede mirar dirección." }, { status: 403 });

  const usuario = process.env.BUZON_POLYCAM_USUARIO;
  const clave = process.env.BUZON_POLYCAM_CLAVE;

  if (!usuario || !clave)
    return NextResponse.json({
      ok: false,
      donde: "faltan las variables",
      dice: "En Vercel no están puestas BUZON_POLYCAM_USUARIO y/o BUZON_POLYCAM_CLAVE, o el despliegue es anterior a haberlas puesto.",
      usuario: usuario ?? "(sin poner)",
      clave: clave ? "(puesta)" : "(sin poner)",
    });

  const cliente = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    // Gmail con 2FA NO admite la contraseña de la cuenta: solo la de aplicacion,
    // 16 letras. Los espacios que enseña Google no cuentan, asi que se quitan.
    auth: { user: usuario, pass: clave.replace(/\s+/g, "") },
    logger: false,
  });

  try {
    await cliente.connect();
    const buzon = await cliente.mailboxOpen("INBOX", { readOnly: true });

    const ultimos: { de: string; asunto: string; cuando: string; adjuntos: boolean }[] = [];
    if (buzon.exists > 0) {
      const desde = Math.max(1, buzon.exists - 4);
      for await (const m of cliente.fetch(`${desde}:*`, { envelope: true, bodyStructure: true })) {
        ultimos.push({
          de: m.envelope?.from?.[0]?.address ?? "—",
          asunto: m.envelope?.subject ?? "(sin asunto)",
          cuando: m.envelope?.date ? new Date(m.envelope.date).toISOString().slice(0, 16).replace("T", " ") : "—",
          adjuntos: JSON.stringify(m.bodyStructure ?? {}).includes("attachment"),
        });
      }
    }

    const sinLeer = await cliente.search({ seen: false });
    await cliente.logout();

    return NextResponse.json({
      ok: true,
      buzon: usuario,
      correos: buzon.exists,
      sinLeer: Array.isArray(sinLeer) ? sinLeer.length : 0,
      ultimos: ultimos.reverse(),
    });
  } catch (e) {
    const dice = e instanceof Error ? e.message : String(e);
    // Los dos errores de siempre, traducidos para que no haya que adivinar.
    const pista = /AUTHENTICATIONFAILED|Invalid credentials/i.test(dice)
      ? "La contraseña no vale. Casi seguro que es la de la CUENTA y no una contraseña de APLICACIÓN de 16 letras, que es la única que admite Gmail con 2FA."
      : /ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i.test(dice)
        ? "No se llega al servidor de Gmail. Suele ser cosa del despliegue, no de la contraseña."
        : "Error inesperado.";
    try {
      await cliente.logout();
    } catch {
      /* ya estaba cerrado */
    }
    return NextResponse.json({ ok: false, buzon: usuario, dice, pista }, { status: 200 });
  }
}
