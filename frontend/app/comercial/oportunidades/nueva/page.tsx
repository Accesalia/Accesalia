import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { opcionesOportunidad } from "../../../../lib/altaOportunidad";
import { eligeComercialAlDarDeAlta, puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { Formulario } from "./Formulario";
import { guardarOportunidad } from "./acciones";
import { Salida } from "../../../components/Salida";
import { apuntePendiente } from "../../../../lib/apuntesSatelite";

export const dynamic = "force-dynamic";

// DAR DE ALTA UNA OPORTUNIDAD (Monica, 27-sep-2026).
//
// Una accion, dos puertas: el comercial la abre desde su pantalla sin entrar en
// Administracion, y desde Administracion se llega a la misma. Gira alrededor de
// la ENTRADA DEL DIARIO, que es lo unico que no puede faltar.

export default async function NuevaOportunidad({
  searchParams,
}: {
  searchParams: Promise<{ falta?: string; nota?: string; direccion?: string; fecha?: string; canal?: string; pendiente?: string; apunte?: string }>;
}) {
  const { falta, nota, direccion, fecha, canal, pendiente, apunte: apunteId } = await searchParams;
  // Desde "Grabar entrada", con la direccion que no estaba en la lista.
  const inicial =
    nota || direccion
      ? {
          nota: nota ?? "",
          direccion: direccion ?? "",
          fecha: fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
          canal: canal && ["visita", "llamada", "mail", "escrito"].includes(canal) ? canal : null,
          // Desde la bandeja: al guardar, esta pendiente queda colocada aqui.
          pendiente: pendiente && /^[0-9a-f-]{36}$/.test(pendiente) ? pendiente : null,
        }
      : undefined;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/nueva");
  // UN APUNTE DEL SATELITE (13-oct-2026): el alta, ya rellena con lo que se
  // mando desde el movil. Al guardar, el apunte queda dado de alta.
  const apunte = apunteId ? await apuntePendiente(yo, apunteId) : null;
  const delApunte = apunte
    ? await (async () => {
        const d = apunte.datos as { administrador?: string | null; tipos?: string[]; paso?: string | null; contactoNombre?: string | null; contactoTelefono?: string | null };
        // El administrador llega como su puesto; el alta lo elige por la persona.
        let admin: string | null = null;
        const [t, idPuesto] = (d.administrador ?? "").split(":");
        if (t === "puesto" && /^[0-9a-f-]{36}$/.test(idPuesto ?? "")) {
          const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/puesto?select=persona_id&id=eq.${idPuesto}`, {
            headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}` },
            cache: "no-store",
          });
          admin = r.ok ? ((await r.json()) as { persona_id: string | null }[])[0]?.persona_id ?? null : null;
        }
        return {
          inicial: {
            nota: apunte.nota,
            direccion: apunte.direccion ?? "",
            fecha: apunte.fecha,
            canal: apunte.canal && ["visita", "llamada", "mail", "escrito"].includes(apunte.canal) ? apunte.canal : null,
            apunte: apunte.id,
            admin,
            tipos: Array.isArray(d.tipos) ? d.tipos : [],
            paso: d.paso ?? null,
          },
          contacto: [d.contactoNombre, d.contactoTelefono].filter(Boolean).join(" · ") || null,
          autor: apunte.autor,
        };
      })()
    : null;
  if (!puedeEntrar(yo, "comercial") && !puedeEntrar(yo, "administracion")) redirect("/menu");

  const { elige, mio } = await eligeComercialAlDarDeAlta(yo);
  const opciones = await opcionesOportunidad(yo.id, mio?.id ?? null);

  return (
    <div className="min-h-screen bg-alta-opp">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-20 pt-5 sm:px-6">
        <Salida href="/comercial">
          ← Área Comercial
        </Salida>

        {falta && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            No se ha guardado: hacían falta qué te han contado y cómo te has enterado, un comercial, el siguiente paso, con quién hablas a
            partir de ahora, y al menos una de estas — dirección, administrador, teléfono o correo.
          </p>
        )}

        {delApunte && (
          <p className="mt-3 rounded-xl border border-[#78b6b8] bg-[#78b6b8]/20 px-4 py-3 text-[14px] text-carbon">
            <b>Apuntada desde el satélite{delApunte.autor ? ` por ${delApunte.autor}` : ""}.</b> Está rellena con lo que se mandó: completa lo que
            falte y dala de alta.
            {delApunte.contacto && <> Contacto que se apuntó: <b>{delApunte.contacto}</b>.</>}
          </p>
        )}
        {apunteId && !apunte && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            Ese apunte ya no está pendiente o no es tuyo.
          </p>
        )}

        <div className="mt-3">
          <Formulario
            opciones={opciones}
            eligeComercial={elige}
            accion={guardarOportunidad}
            volver={delApunte ? "/pendientes/satelite?tipo=oportunidad" : "/comercial"}
            inicial={delApunte?.inicial ?? inicial}
          />
        </div>
      </main>
    </div>
  );
}
