import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { enlaceAlModelo } from "../../../../lib/mesaViabilidades";
import { haceViabilidades } from "../../revision-polycam/acciones";
import { Visor3D } from "./Visor3D";

export const dynamic = "force-dynamic";

// VER UN ESCANEO ANTES DE VINCULARLO (Monica, 10-oct-2026). "Abrir el fichero"
// en la lista de "¿De que portal es?" daba el zip original, que se descargaba
// y no habia con que abrirlo. Ahora abre aqui el mismo visor de la mesa.

const ajenoClaro =
  "inline-flex h-[30px] items-center justify-center rounded-[8px] border border-ajeno/40 bg-ajeno-soft px-3.5 text-[12px] font-bold uppercase tracking-wide text-[#3f5f80] transition hover:bg-[#dde7f1]";

type Escaneo = { id: string; polycam: string | null; asunto: string | null; ruta_polycam: string | null; nombre_original_fichero: string | null };

async function escaneo(id: string): Promise<Escaneo | null> {
  const r = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/escaneados_polycam?select=id,polycam,asunto,ruta_polycam,nombre_original_fichero&id=eq.${encodeURIComponent(id)}&limit=1`,
    {
      headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}` },
      cache: "no-store",
    },
  );
  if (!r.ok) throw new Error(`Supabase REST ${r.status}`);
  const [e] = (await r.json()) as Escaneo[];
  return e ?? null;
}

export default async function VerEscaneo({ params }: { params: Promise<{ id: string }> }) {
  await haceViabilidades();
  const { id } = await params;
  const e = await escaneo(id);
  if (!e) notFound();
  const url = await enlaceAlModelo(e);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1120px] px-6 pb-16 pt-5">
        <Link href="/viabilidades" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Mesa de viabilidades
        </Link>
        <h1 className="mt-3 text-[20px] font-bold leading-tight text-carbon">
          {e.asunto || e.nombre_original_fichero || "Escaneo sin asunto"}
        </h1>

        <div className="relative mt-4 flex h-[560px] items-center justify-center overflow-hidden rounded-xl border border-ajeno/30 bg-[#fffaf0]">
          {url ? (
            <Visor3D url={url} />
          ) : (
            <p className="max-w-[34ch] text-center text-[13px] text-carbon/60">
              Este escaneo no se puede ver aquí: el fichero no trae un .glb completo. Ábrelo en Polycam.
            </p>
          )}
        </div>

        {e.ruta_polycam && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <a href={e.ruta_polycam} target="_blank" rel="noreferrer" className={ajenoClaro}>
              Abrir en Polycam
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
