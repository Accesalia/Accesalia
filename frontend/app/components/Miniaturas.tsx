// LAS MINIATURAS DE LAS FOTOS de una nota (Monica, 8-oct-2026): "si ademas la
// miniatura se ve en el diario, muchisimo mejor". Pinchando, la foto entera en
// otra pestaña. Los enlaces caducan en una hora: al recargar se renuevan.

export type FotoVista = { id: string; mini: string; grande: string };

export function Miniaturas({ fotos, lado = 56 }: { fotos?: FotoVista[]; lado?: number }) {
  if (!fotos?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {fotos.map((f, i) => (
        <a key={f.id} href={f.grande} target="_blank" rel="noreferrer" title="Ver la foto entera">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={f.mini}
            alt={`Foto ${i + 1}`}
            loading="lazy"
            style={{ width: lado, height: lado }}
            className="rounded-md border border-black/10 object-cover transition hover:opacity-85"
          />
        </a>
      ))}
    </div>
  );
}
