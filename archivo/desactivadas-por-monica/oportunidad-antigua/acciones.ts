"use server";

// ⛔ LAS ACCIONES DE LA PANTALLA ARCHIVADA, DESACTIVADAS A PROPOSITO.
//
// La pantalla original escribia en produccion: creaba oportunidades, creaba
// viabilidades, aplazaba y reactivaba. Aqui esta puesta SOLO PARA MIRARLA, asi
// que sus botones no hacen nada. Si se tocan, se avisa y se queda igual.
//
// Se borra entera -pantalla y esto- cuando Monica haya terminado de mirarla.

function noHaceNada(_que: string) {
  // Ni error ni redireccion: la pantalla se queda como estaba. El aviso de que
  // esto no guarda nada esta arriba del todo, en la propia pantalla.
  return Promise.resolve();
}

export async function nuevaOportunidad(_comunidadId: string, _fd: FormData) {
  return noHaceNada("nueva oportunidad");
}
export async function crearViabilidad(_comunidadId: string, _oportunidadId: string) {
  return noHaceNada("crear viabilidad");
}
export async function aplazarOportunidad(_comunidadId: string, _oportunidadId: string, _fd: FormData) {
  return noHaceNada("aplazar");
}
export async function reactivarOportunidad(_comunidadId: string, _oportunidadId: string) {
  return noHaceNada("reactivar");
}
