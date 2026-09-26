-- LA SALA DE ESPERA DE UNA OPORTUNIDAD (Monica, 26-sep-2026).
--
-- "Me llama Vanesa Lopez por la web, que quiere poner el ascensor". Hasta hoy
-- Vanesa solo cabia dentro del texto de la nota: no se podia exigir, ni pintar
-- para llamar, ni buscar. Y crearle ficha de verdad ensucia el maestro con un
-- dato que a los tres dias puede ser incorrecto.
--
-- Estas tres columnas son esa sala de espera: el dato entra tal cual lo
-- escribio el comercial, y NO llega al maestro hasta que alguien lo recoloca.
-- El telefono y el correo son ademas las dos llaves buenas para desambiguar:
-- el nombre se escribe de seis maneras (Vanesa / VANESA / Vanessa), un movil no.

alter table oportunidades add column if not exists contacto_provisional text;
alter table oportunidades add column if not exists telefono_provisional text;
alter table oportunidades add column if not exists correo_provisional text;

comment on column oportunidades.contacto_provisional is 'Quien nos llama, cuando todavia no existe en el maestro. Tal cual lo escribio el comercial.';
comment on column oportunidades.telefono_provisional is 'Su telefono. Llave para desambiguar cuando se recoloque.';
comment on column oportunidades.correo_provisional is 'Su correo. Misma funcion que el telefono.';

-- O es de verdad, o es provisional. Nunca las dos cosas a la vez: si no, no se
-- sabe cual manda. Al recolocar se rellena el real y se vacian estos tres.
alter table oportunidades drop constraint if exists oportunidad_contacto_real_o_provisional_check;
alter table oportunidades add constraint oportunidad_contacto_real_o_provisional_check check (
  (puesto_id is null and persona_comunidad_id is null)
  or (contacto_provisional is null and telefono_provisional is null and correo_provisional is null)
);
