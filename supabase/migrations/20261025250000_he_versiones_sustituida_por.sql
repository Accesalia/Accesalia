-- SUSTITUIDA POR OTRA HOJA (Monica, 25-oct-2026, repaso campo a campo de la migracion): las 54 sustituciones viejas son
-- entre HOJAS distintas (misma opp, otro numero; 25 de las nuevas firmadas con su numero impreso), no versiones de la
-- misma: no se convierten en v2. En lo nuevo tambien pasara (se anula la de Schindler y se emite otra a la comunidad).
alter table public.he_versiones_hoja add column sustituida_por uuid references public.he_versiones_hoja(id);
comment on column public.he_versiones_hoja.sustituida_por is 'Si otra HOJA (no una version de esta) la sustituye: la que vale ahora. Las 54 sustituciones viejas entre hojas distintas y lo nuevo (se anula la de Schindler y se emite otra a la comunidad). La version siguiente de la misma hoja no lo usa: es sustituida con el mismo codigo.';
create index he_versiones_hoja_sustituida_por_idx on public.he_versiones_hoja (sustituida_por);
