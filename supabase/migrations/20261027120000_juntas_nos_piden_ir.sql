-- «¿NOS PIDEN IR A LA JUNTA?» (Monica, 27-oct-2026, ficha comercial de la opp): si la comunidad nos pide estar en la
-- junta. null = no se sabe; true / false = lo que nos han dicho. Se marca desde la ficha.
alter table public.juntas add column if not exists nos_piden_ir boolean;
comment on column public.juntas.nos_piden_ir is 'La comunidad nos pide ir a la junta (null: no se sabe). Ficha comercial, 27-oct-2026.';
