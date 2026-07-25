/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-pdf se ejecuta en Node (no se empaqueta en el bundle del servidor).
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
