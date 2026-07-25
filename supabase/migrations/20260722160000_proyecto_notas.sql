-- proyectos.notas: nota libre / causa de pausa (que lo desbloquearia).
alter table proyectos add column notas text;
comment on column proyectos.notas is 'Nota libre; en pausa = causa y que lo desbloquearia.';
