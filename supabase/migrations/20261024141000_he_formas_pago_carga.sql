-- CARGA INICIAL DE LAS FORMAS DE PAGO (Monica, 24-oct-2026): los 15 repartos que de verdad se han firmado (de las lineas
-- de facturacion; la de la adjudicacion es de Ecobalance y no entra) y, como casos por defecto, SOLO los que ya
-- funcionaban en el generador: CSS, documentacion tecnica, subvencion y proyecto, pague quien pague. Lo demas, en blanco.
do $$
declare
  f uuid;
  formas jsonb := '[
    {"n": "100 % encargo", "h": [["encargo","fijo",100,"100 % a la contratación"]]},
    {"n": "50 % encargo · 50 % entrega", "notas": "La habitual de los proyectos", "h": [["encargo","fijo",50,"50 % a la contratación"],["entrega","fijo",50,"50 % a la entrega del proyecto"]]},
    {"n": "50 % entrega · 30 % licencia · 20 % CFO", "notas": "FAIN, proyectos", "h": [["entrega","fijo",50,"50 % a la entrega del proyecto"],["licencia","fijo",30,"30 % a la concesión de la licencia"],["cfo","fijo",20,"20 % al certificado de fin de obra"]]},
    {"n": "80 % PSS · 20 % CFO", "notas": "FAIN, CSS", "h": [["pss","fijo",80,"80 % a la firma del Plan de Seguridad y Salud"],["cfo","fijo",20,"20 % al certificado de fin de obra"]]},
    {"n": "100 % entrega", "h": [["entrega","fijo",100,"100 % a la entrega del proyecto"]]},
    {"n": "100 % PSS", "notas": "La habitual de la CSS", "h": [["pss","fijo",100,"100 % a la firma del Plan de Seguridad y Salud"]]},
    {"n": "100 % encargo · concesión a éxito", "notas": "Subvención: fijo al encargo y el % a éxito", "h": [["encargo","fijo",100,"100 % a la contratación"],["concesion","exito",null,"el % a éxito, a la concesión de la subvención"]]},
    {"n": "concesión a éxito", "notas": "Subvención: solo a éxito", "h": [["concesion","exito",null,"el % a éxito, a la concesión de la subvención"]]},
    {"n": "100 % concesión", "h": [["concesion","fijo",100,"100 % a la concesión de la subvención"]]},
    {"n": "60 % entrega · 20 % licencia · 20 % CFO", "h": [["entrega","fijo",60,"60 % a la entrega del proyecto"],["licencia","fijo",20,"20 % a la concesión de la licencia"],["cfo","fijo",20,"20 % al certificado de fin de obra"]]},
    {"n": "⅓ encargo · ⅓ entrega · ⅓ licencia", "notas": "Un tercio cada una", "h": [["encargo","fijo",33.33,"⅓ a la contratación"],["entrega","fijo",33.33,"⅓ a la entrega del proyecto"],["licencia","fijo",33.34,"⅓ a la concesión de la licencia"]]},
    {"n": "100 % presentación", "h": [["presentacion","fijo",100,"100 % a la presentación de la subvención"]]},
    {"n": "50 % entrega · 25 % inicio de obra · 25 % CFO", "h": [["entrega","fijo",50,"50 % a la entrega del proyecto"],["inicio_obra","fijo",25,"25 % al inicio de obra"],["cfo","fijo",25,"25 % al certificado de fin de obra"]]},
    {"n": "50 % encargo · 50 % CFO", "h": [["encargo","fijo",50,"50 % a la contratación"],["cfo","fijo",50,"50 % al certificado de fin de obra"]]},
    {"n": "25 % encargo · 50 % entrega · 25 % CFO", "h": [["encargo","fijo",25,"25 % a la contratación"],["entrega","fijo",50,"50 % a la entrega del proyecto"],["cfo","fijo",25,"25 % al certificado de fin de obra"]]}
  ]';
  defectos jsonb := '[
    ["CSS", "100 % PSS"],
    ["DOCUMENTACION TECNICA SUBVENCIONES", "100 % encargo"],
    ["TRAMITACION SUBVENCIONES", "concesión a éxito"],
    ["REDACCION PROYECTO", "50 % encargo · 50 % entrega"]
  ]';
  x jsonb; h jsonb; i int := 0; j int;
begin
  for x in select * from jsonb_array_elements(formas) loop
    i := i + 1;
    insert into public.he_formas_pago (nombre, orden, notas) values (x->>'n', i, x->>'notas') returning id into f;
    j := 0;
    for h in select * from jsonb_array_elements(x->'h') loop
      j := j + 1;
      insert into public.he_formas_pago_hitos (forma_pago_id, orden, momento, tipo, porcentaje, frase)
      values (f, j, h->>0, h->>1, (h->>2)::numeric, h->>3);
    end loop;
  end loop;
  for x in select * from jsonb_array_elements(defectos) loop
    insert into public.he_formas_pago_defecto (forma_pago_id, bloque_id, pagador_tipo)
    select fp.id, b.id, 'cualquiera' from public.he_formas_pago fp, public.bloques b where fp.nombre = x->>1 and b.codigo = x->>0;
    if not found then raise exception 'No encuentro % o %', x->>0, x->>1; end if;
  end loop;
end $$;
