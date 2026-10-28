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

export default async function Enviar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ adjuntar?: string | string[] }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/comercial/oportunidades/${id}/enviar`);
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");
  const [d, todas] = await Promise.all([paraEnviar(id), plantillasPara(yo, "comercial")]);
  if (!d) notFound();
  // VIENE DE «PREPARAR UNA OFERTA» (bloque 2, 27-oct-2026): ya marcada la oferta -las hojas con ok sin enviar, sus
  // presupuestos y la viabilidad mas reciente- y los adjuntos que se eligieron alli.
  const adjuntar = new Set([sp.adjuntar ?? []].flat());
  const listas = new Set(d.documentos.filter((x) => x.lista).map((x) => x.clave.slice(3)));
  const marcados = [
    ...d.documentos.filter((x) => x.lista || (x.hojaId && listas.has(x.hojaId))).map((x) => x.clave),
    ...(listas.size ? d.documentos.filter((x) => x.clave.startsWith("viabilidad:")).slice(0, 1).map((x) => x.clave) : []),
    ...(adjuntar.has("costes") ? d.documentos.filter((x) => x.clave.startsWith("costes:")).slice(0, 1).map((x) => x.clave) : []),
    ...(adjuntar.has("inmueble") ? d.documentos.filter((x) => x.clave.startsWith("inmueble:")).map((x) => x.clave) : []),
  ];
  // Al enviar, las plantillas que valen son las generales y las mias.
  const plantillas = todas
    .filter((p) => !p.propietario_id || p.propietario_id === yo.id)
    .map((p) => ({ id: p.id, nombre: p.nombre, asunto: p.asunto, texto: p.texto, personal: !!p.propietario_id }));
  // LA PLANTILLA DE LA OFERTA, YA PUESTA (Monica, 28-oct-2026: «no hay plantilla ni se rellena el asunto o el cuerpo»):
  // al llegar desde «Preparar una oferta», la general «Envío de oferta».
  const deOferta = listas.size
    ? (plantillas.find((p) => !p.personal && p.nombre.trim().toLowerCase().replace("í", "i") === "envio de oferta")?.id ?? "")
    : "";

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
            marcados={marcados}
            destinatarios={d.destinatarios}
            plantillas={plantillas}
            plantillaInicial={deOferta}
            rellenar={{ direccion: d.nombre ?? "", comercial: d.comercial.nombre }}
            remitente={`${d.comercial.nombre} · Accesalia`}
            responderA={d.comercial.email}
          />
        )}
      </main>
    </div>
  );
}
