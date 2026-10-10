-- EL DOCUMENTO FIRMADO DEL ENCARGO (Monica, 10-oct-2026).
-- Las lineas facturables solo salen de algo firmado: "para extraer lineas facturables necesito algo, un contrato
-- firmado de algun tipo... relajar el requisito de 'tiene que haber contrato firmado' me parece muy mala praxis".
-- Pero no siempre es una hoja de encargo: Iberdrola firma contrato; una contrata puede firmar un pedido. Y "en ultimo
-- caso, nota nuestra explicativa: el ultimo recurso para las historicas: nota a mano asumiendo la responsabilidad de
-- que se contrata y explicando por que no hay hoja de encargo firmada".
-- La tabla hojas_encargo pasa a guardar cualquier documento de encargo, con su tipo.
alter table public.hojas_encargo
  add column tipo_documento text not null default 'hoja_encargo'
    constraint hojas_encargo_tipo_documento_check
    check (tipo_documento in ('hoja_encargo', 'contrato', 'pedido', 'nota_responsabilidad')),
  add column responsable_id uuid references public.equipo(id),
  add column motivo_sin_firma text;
alter table public.hojas_encargo add constraint hojas_encargo_nota_responsabilidad_check
  check (tipo_documento <> 'nota_responsabilidad'
         or (responsable_id is not null and motivo_sin_firma is not null and btrim(motivo_sin_firma) <> ''));
comment on column public.hojas_encargo.tipo_documento is
  'EL DOCUMENTO FIRMADO del que salen las lineas facturables (Monica, 10-oct-2026: relajar "tiene que haber contrato firmado" seria muy mala praxis): hoja_encargo (comunidades, particulares) | contrato (Iberdrola) | pedido (orden de compra firmada de una contrata) | nota_responsabilidad (ULTIMO RECURSO, solo historicos: alguien del equipo asume por escrito que se contrato y explica por que no hay hoja firmada).';
comment on column public.hojas_encargo.responsable_id is 'En una nota de responsabilidad: quien del equipo asume que se contrato.';
comment on column public.hojas_encargo.motivo_sin_firma is 'En una nota de responsabilidad: por que no hay hoja de encargo firmada.';
