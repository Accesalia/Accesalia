/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-pdf se ejecuta en Node (no se empaqueta en el bundle del servidor).
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // EL NAVEGADOR GUARDA LO YA VISTO (Monica, 16-oct-2026: "le doy a VOLVER en
    // cualquier pantalla y tarda 3-4 segundos"). Una pantalla vista se guarda 30
    // segundos: volver a ella es al instante. Lo que cambias tu se refresca en el
    // acto (cada accion que guarda llama a revalidatePath o router.refresh, que
    // vacian esta memoria); lo que cambie otra persona se ve a los 30 s o al
    // recargar (Monica: ok). Las pantallas sin datos, 3 minutos.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
