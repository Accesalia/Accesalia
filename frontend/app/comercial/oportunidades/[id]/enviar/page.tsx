import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../../components/BarraSuperior";
import { puedeEntrar, quienSoy } from "../../../../../lib/sesion";
import { paraEnviar } from "../../../../../lib/envioCorreo";
import { plantillasPara } from "../../../../../lib/plantillasCorreo";
import { EnviarCorreo } from "./EnviarCorreo";
import { Salida } from "../../../../components/Salida";

export const dynamic = "force-dynamic";

// ENVIAR DOCUMENTOS A LA COMUNIDAD, desde el bloque 2 de su oportunidad
// (Monica, 12-oct-2026). Ver lib/envioCorreo.ts.

export default async function Enviar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/comercial/oportunidades/${id}/enviar`);
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");
  const [d, todas] = await Promise.all([paraEnviar(id), plantillasPara(yo, "comercial")]);
  if (!d) notFound();
  // Al enviar, las plantillas que valen son las generales y las mias.
  const plantillas = todas
    .filter((p) => !p.propietario_id || p.propietario_id === yo.id)
    .map((p) => ({ id: p.id, nombre: p.nombre, asunto: p.asunto, texto: p.texto, personal: !!p.propietario_id }));

  return (
    <div className="min-h-screen bg-form">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href={`/comercial/oportunidades/${id}?bloque=2`}>
          ← La oportunidad
        </Salida>
        <p className="mb-3 mt-2 text-sm text-carbon/70">
          {d.codigo} · <b className="text-carbon">{d.nombre}</b>
        </p>
        {!d.comercial ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
            Esta oportunidad no tiene comercial, y el correo sale a su nombre: asígnaselo antes de enviar.
          </p>
        ) : (
          <EnviarCorreo
            oppId={id}
            documentos={d.documentos}
            destinatarios={d.destinatarios}
            plantillas={plantillas}
            remitente={`${d.comercial.nombre} · Accesalia`}
            responderA={d.comercial.email}
          />
        )}
      </main>
    </div>
  );
}
