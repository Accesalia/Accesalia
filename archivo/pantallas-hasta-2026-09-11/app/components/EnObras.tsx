// Marcador para una seccion que existe en el modelo pero todavia no en pantalla.
//
// No es un "proximamente" vacio: dice QUE datos hay ya en la base y QUE falta
// por construir. Asi la pantalla no es un callejon sin salida — se ve lo que
// hay detras aunque no se pueda usar todavia.
export function EnObras({ titulo, hay, falta }: { titulo: string; hay: string; falta: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-14 text-center">
      <h1 className="text-2xl font-bold text-carbon/70 sm:text-3xl">{titulo}</h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-carbon/70">
        <span className="rounded bg-lima-soft px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-lima-dark">
          Ya está
        </span>{" "}
        {hay}
      </p>
      <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-carbon/70">
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-700">
          Falta
        </span>{" "}
        {falta}
      </p>
    </div>
  );
}
