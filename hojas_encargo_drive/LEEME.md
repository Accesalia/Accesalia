# Hojas de encargo desde Drive (6-oct-2026)

Tabla de cruce enviada <-> firmada, para revisar ANTES de volcar nada a la base.
El volcado espera a que esten creadas todas las opps.

- `firmados.tsv`, `fuentes.tsv`: listado de G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS
  (firmadas / todo lo demas), con fecha y tamaño.
- `cruce.py`: clave de cotejo por nombre (calle + numero) y fecha del nombre.
- `tanda1.tsv`: las 136 firmadas recientes (desde 6-oct-2024) con UNA sola pareja.
- `textos/NNN.txt`: el texto de la enviada (Word/PDF leidos del disco; Google Docs
  copiados por el conector, primera linea #DRIVE_ID con su id y fecha de modificacion).
- `instrucciones_extraccion.md`: el formato y el catalogo con que se extrajeron.
- `extraido_*.jsonl`: los datos en bruto, uno por hoja.
- `hojas_monday.json`, `monday_candidatas.json`: las hojas que ya estan en la base
  (importadas de Monday) en la misma direccion: la migracion las COMPLETA.
- `montar_excel.py` -> `../cruce_hojas_tanda1.xlsx`.
