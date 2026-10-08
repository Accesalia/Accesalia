-- Monica, 8-oct-2026: una hoja la firma y la paga un PARTICULAR (HE-2025-0394, un propietario):
-- "pues un particular". En la tabla de trabajo el pagador puede ser comunidad, empresa o particular.
alter table public.revision_firmadas drop constraint revision_firmadas_pagador_tipo_check;
alter table public.revision_firmadas add constraint revision_firmadas_pagador_tipo_check
  check (pagador_tipo in ('comunidad', 'empresa', 'particular'));
