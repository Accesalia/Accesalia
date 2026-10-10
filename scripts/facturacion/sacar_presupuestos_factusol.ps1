$S='C:\Users\mfavi\AppData\Local\Temp\claude\c--Users-mfavi-ACCESALIA\c9d7dade-e682-4771-a7b0-8688a13639e8\scratchpad\factusol'
$sal=@{presupuestos=@(); lineas=@(); origen_factura=@()}
foreach ($e in '001','002','003') { foreach ($a in '2025','2026') {
  $f="$S\$e$a.accdb"; if (-not (Test-Path $f)) { Copy-Item "C:\accesalia Dropbox\D SM\factusol\FACTUSOL\Datos\FS\$e$a.accdb" $f -Force }
  $cn=New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$f;Mode=Read;"); $cn.Open()
  foreach ($q in @(
    @('presupuestos',"SELECT TIPPRE, CODPRE, FECPRE, ESTPRE, CLIPRE, CNOPRE, CNIPRE, CDOPRE, CPOPRE, CCPPRE, CPRPRE, FOPPRE, BAS1PRE, BAS2PRE, BAS3PRE, PIVA1PRE, PIVA2PRE, PIVA3PRE, IIVA1PRE, IIVA2PRE, IIVA3PRE, PRET1PRE, IRET1PRE, TOTPRE FROM F_PRE"),
    @('lineas',"SELECT TIPLPS, CODLPS, POSLPS, ARTLPS, DESLPS, CANLPS, PRELPS, TOTLPS FROM F_LPS"),
    @('origen_factura',"SELECT TIPLFA, CODLFA, POSLFA, DOCLFA, DTPLFA, DCOLFA FROM F_LFA WHERE DOCLFA<>''")) ) {
    $c=$cn.CreateCommand(); $c.CommandText=$q[1]; $rd=$c.ExecuteReader()
    while ($rd.Read()) { $o=[ordered]@{empresa=$e; anio=$a}; for($i=0;$i -lt $rd.FieldCount;$i++){ $v=$rd.GetValue($i); if($v -is [datetime]){$v=$v.ToString('yyyy-MM-dd')}; if($v -is [System.DBNull]){$v=$null}; $o[$rd.GetName($i)]=$v }; $sal[$q[0]]+=$o }
    $rd.Close()
  }
  $cn.Close()
} }
"presupuestos: $($sal.presupuestos.Count) | lineas: $($sal.lineas.Count) | lineas de factura con documento de origen: $($sal.origen_factura.Count)"
$sal | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 "$S\presupuestos_2025_2026.json"
