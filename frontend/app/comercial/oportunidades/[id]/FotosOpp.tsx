"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FotoDeOpp } from "../../../../lib/fotos";
import { reducirFoto } from "../../../../lib/reducirFoto";
import { accionPermisosFotos } from "../../acciones";
import { accionApuntarFotosOpp } from "./acciones";

// LAS FOTOS DE LA OPP, ABAJO DEL BLOQUE 1 (Monica, 15-oct-2026). Todas las que
// llegan (con las notas del diario, del satelite, de Sali) y las que se suben aqui
// desde el PC: "van a ver la accesibilidad, marcan no, y añaden nota contando lo
// que ven y las fotos del escalon"; "si a un vecino le han arañado la puerta:
// foto al expediente". Se ven en miniatura y se abren al pulsar.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Madrid" });

export function FotosOpp({ oppId, fotos }: { oppId: string; fotos: FotoDeOpp[] }) {
  const router = useRouter();
  const elegir = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function subir(ficheros: File[]) {
    const fotosPc = ficheros.filter((f) => f.type.startsWith("image/")).slice(0, 20);
    if (!fotosPc.length) return setError("Solo se pueden subir fotos.");
    setError(null);
    setSubiendo(fotosPc.length);
    try {
      // Las mismas piezas que las fotos de las notas: reducidas en el navegador,
      // con su miniatura, directas al almacen; y luego se apuntan en la opp.
      const permisos = await accionPermisosFotos(fotosPc.length);
      const rutas = await Promise.all(
        fotosPc.map(async (file, i) => {
          const { foto, mini } = await reducirFoto(file);
          const p = permisos[i];
          const poner = (url: string, cuerpo: Blob) =>
            fetch(url, { method: "PUT", headers: { "Content-Type": "image/jpeg", "x-upsert": "false" }, body: cuerpo });
          const [a, b] = await Promise.all([poner(p.url, foto), poner(p.urlMini, mini)]);
          if (!a.ok || !b.ok) throw new Error(`No se ha podido subir «${file.name}».`);
          return p.ruta;
        }),
      );
      const r = await accionApuntarFotosOpp(oppId, rutas);
      if (!r.ok) throw new Error(r.error);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(0);
    }
  }

  return (
    <section className="rounded-[10px] border border-[#d9d9d9] bg-white px-[13px] py-[11px]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]">Fotos · {fotos.length}</div>
        <input
          ref={elegir}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (fs.length) subir(fs);
          }}
        />
        <button
          type="button"
          disabled={subiendo > 0}
          onClick={() => elegir.current?.click()}
          className="ml-auto rounded-lg border border-dashed border-lima/70 bg-white px-3 py-1 text-[12px] font-semibold text-lima-dark transition hover:border-lima-dark disabled:opacity-60"
        >
          {subiendo ? `Subiendo ${subiendo}…` : "📷 Añadir fotos desde el PC"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-alerta">{error}</p>}
      {fotos.length === 0 ? (
        <p className="mt-2 text-[12px] text-[#8a8a8a]">
          Todavía no hay fotos. Llegan solas con las notas del diario y del satélite, y aquí se pueden subir desde el PC.
        </p>
      ) : (
        <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
          {fotos.map((f) => (
            <li key={f.id}>
              <a href={f.url} target="_blank" rel="noreferrer" className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.mini} alt="" loading="lazy" className="aspect-square w-full rounded-[8px] border border-[#d9d9d9] object-cover transition group-hover:opacity-85" />
                <span className="mt-0.5 block text-center text-[10px] text-[#8a8a8a]">
                  {FECHA.format(new Date(f.fecha))} · {f.origen === "pc" ? "subida" : "de una nota"}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
