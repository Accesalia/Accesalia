import { redirect } from "next/navigation";

// Las plantillas pasaron a /plantillas (24-oct-2026): esta direccion reenvia a la nueva.
export default async function PlantillaAntes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/plantillas/${id}`);
}
