-- YA APLICADA el 3-oct-2026 por el MCP. Esta en el registro con esta misma
-- version. Este fichero es la copia para el repositorio: NO volver a ejecutar.
--
-- LA TABLA COMODIN, modelo de Monica: "una tabla relacional: id_comodin -
-- figura, donde comodin es: comunidad, empresa, persona, organismo. Punto. La
-- figura solo es un identificador, los datos viven en su tabla."
-- `id_comodin` no lleva default a proposito: no nace aqui, viene de la tabla
-- donde viven los datos de esa figura.

create table public.figura_legal_propietaria (
  id_comodin     uuid        primary key,
  figura         text        not null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint figura_legal_propietaria_figura_valida check (figura in (
    'Comunidad de Propietarios',
    'Mancomunidad',
    'Entidad Urbanística',
    'Propietario Particular',
    'Propietario Empresa',
    'Subcomunidad',
    'Comunidad sin título constitutivo',
    'Organismo',
    'Copropiedad Particular'
  ))
);

comment on table public.figura_legal_propietaria is
  'Quien es el propietario legal de un acceso. Dos columnas: el id de la fila donde viven sus datos, y que clase de figura es. Los datos NO estan aqui.';

comment on column public.figura_legal_propietaria.id_comodin is
  'El id de la fila que guarda los datos de esta figura, en la tabla que dice `figura`. No se genera aqui.';

create trigger trg_set_actualizado_en before update on public.figura_legal_propietaria
  for each row execute function public.set_actualizado_en();
