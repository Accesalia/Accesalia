-- YA APLICADA el 3-oct-2026 por el MCP. NO volver a ejecutar.
--
-- Los huecos de contacto de una empresa propietaria. Y uno de ellos NO es un
-- hueco de esa tabla, que es la correccion de Monica: "persona de contacto no
-- deberia guardarse en la agenda de personas?". Si. La persona vive en
-- `persona` y no se duplica; lo que faltaba era el VINCULO, y es la columna de
-- `puesto` del bloque 3.

-- 1. domicilio y telefono, con los mismos nombres que en `empresa`
alter table public.empresas_propietarias
  add column direccion text,
  add column telefono  text;

-- 2. el mail: quinto dueño de `correo`, manteniendo la regla de dueño unico
alter table public.correo
  add column empresa_propietaria_id uuid
    references public.empresas_propietarias(id) on delete cascade;

alter table public.correo drop constraint correo_un_solo_dueno_check;

alter table public.correo add constraint correo_un_solo_dueno_check check (
  (puesto_id is not null)::int
+ (departamento_id is not null)::int
+ (empresa_id is not null)::int
+ (persona_id is not null)::int
+ (empresa_propietaria_id is not null)::int = 1
);

create index correo_empresa_propietaria_id_idx
  on public.correo(empresa_propietaria_id)
  where empresa_propietaria_id is not null;

-- 3. la persona de contacto NO se guarda aqui: vive en `persona`. Lo que falta
--    es el VINCULO, y es esta columna de `puesto`.
alter table public.puesto
  add column figura_legal_propietaria_id uuid
    references public.figura_legal_propietaria(id_comodin) on delete set null;

create index puesto_figura_legal_propietaria_id_idx
  on public.puesto(figura_legal_propietaria_id)
  where figura_legal_propietaria_id is not null;

comment on column public.puesto.figura_legal_propietaria_id is
  'De que figura propietaria es esta persona: presidente de una comunidad, propietario de una copropiedad, apoderado de una empresa propietaria. `cargo` dice de que, y `desde`/`hasta` desde cuando.';

-- Un puesto es en una administracion de fincas O en una figura propietaria,
-- nunca en las dos: mismo patron que `oportunidad_contacto_real_o_provisional`.
alter table public.puesto add constraint puesto_en_administracion_o_en_figura check (
  figura_legal_propietaria_id is null
  or (empresa_id is null and departamento_id is null)
);
