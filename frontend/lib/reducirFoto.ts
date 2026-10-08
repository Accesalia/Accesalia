// lib/reducirFoto.ts
//
// REDUCIR UNA FOTO EN EL NAVEGADOR, antes de subirla (Monica, 8-oct-2026).
// Una foto de movil pesa 3-5 MB; reducida a 2.000 px de lado mayor se sigue
// viendo bien (una grieta, un escalon) y pesa unos 400 KB. Y la miniatura, de
// 320 px, es lo que enseña el diario.
//
// Corre en el navegador: usa el lienzo (canvas). En el movil, ademas, endereza
// la foto: createImageBitmap respeta la orientacion que guarda la camara.

async function aJpeg(img: ImageBitmap, lado: number, calidad: number): Promise<Blob> {
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const w = Math.round(img.width * escala);
  const h = Math.round(img.height * escala);
  const lienzo = document.createElement("canvas");
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("Este navegador no puede preparar la foto.");
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((ok, mal) =>
    lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se ha podido preparar la foto."))), "image/jpeg", calidad),
  );
}

export async function reducirFoto(f: File): Promise<{ foto: Blob; mini: Blob }> {
  const img = await createImageBitmap(f, { imageOrientation: "from-image" });
  try {
    const [foto, mini] = await Promise.all([aJpeg(img, 2000, 0.82), aJpeg(img, 320, 0.75)]);
    return { foto, mini };
  } finally {
    img.close();
  }
}
