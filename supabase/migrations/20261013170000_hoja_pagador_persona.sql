-- LA HOJA DE ENCARGO PUEDE IR A UNA PERSONA (Monica, 13-oct-2026): tener CP no
-- debe condicionar nada, ni que se emita la hoja ni la factura. Una opp de un
-- particular (Av. del Monte 89, Algete: un chalet) no tiene comunidad; su hoja
-- va al titular de sus accesos, que es una persona. Igual que ya admiten las
-- lineas de cobro (lineas_facturacion.pagador_tipo = 'persona').

alter table hojas_encargo
  add column pagador_persona_id uuid references persona (id);

comment on column hojas_encargo.pagador_persona_id is
  'Relleno solo si pagador_tipo = persona: el particular al que va la hoja (el titular de los accesos de la opp, accesos.figura_legal_propietaria_id).';

alter table hojas_encargo drop constraint hojas_encargo_pagador_tipo_check;
alter table hojas_encargo add constraint hojas_encargo_pagador_tipo_check
  check (pagador_tipo in ('comunidad', 'contrata', 'persona'));

alter table hojas_encargo drop constraint chk_hojas_encargo_pagador;
alter table hojas_encargo add constraint chk_hojas_encargo_pagador check (
  (pagador_tipo = 'comunidad' and pagador_contrata_id is null and pagador_persona_id is null) or
  (pagador_tipo = 'contrata'  and pagador_contrata_id is not null and pagador_persona_id is null) or
  (pagador_tipo = 'persona'   and pagador_persona_id is not null and pagador_contrata_id is null)
);
