# Saca las facturas de Factusol (cabecera F_FAC y lineas F_LFA) de 2025 y 2026, de las tres empresas, a un JSON.
# SOLO LEE, y sobre una COPIA del .accdb (el original esta en Dropbox y lo usa Factusol). Monica, 10-oct-2026.
#   powershell -File sacar_facturas_factusol.ps1 <carpeta_de_trabajo>
param([string]$S)
$sal=@{facturas=@(); lineas=@(); abonos=@(); lineas_abono=@()}
foreach ($e in '001','002','003') { foreach ($a in '2025','2026') {
  $orig="C:\accesalia Dropbox\D SM\factusol\FACTUSOL\Datos\FS\$e$a.accdb"
  if (-not (Test-Path $orig)) { "no existe $e$a"; continue }
  $f="$S\fac_$e$a.accdb"; Copy-Item $orig $f -Force
  $cn=New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$f;Mode=Read;"); $cn.Open()
  foreach ($q in @(
    @('facturas',"SELECT TIPFAC, CODFAC, REFFAC, FECFAC, ESTFAC, CLIFAC, CNOFAC, CNIFAC, CDOFAC, CPOFAC, CCPFAC, CPRFAC, FOPFAC, BAS1FAC, BAS2FAC, BAS3FAC, PIVA1FAC, PIVA2FAC, PIVA3FAC, IIVA1FAC, IIVA2FAC, IIVA3FAC, PRET1FAC, IRET1FAC, TOTFAC FROM F_FAC"),
    @('lineas',"SELECT TIPLFA, CODLFA, POSLFA, DESLFA, CANLFA, PRELFA, TOTLFA, DOCLFA, DTPLFA, DCOLFA FROM F_LFA"),
    # los ABONOS (rectificativas, serie 6), con los mismos nombres de campo que las facturas
    @('abonos',"SELECT TIPFAB AS TIPFAC, CODFAB AS CODFAC, REFFAB AS REFFAC, FECFAB AS FECFAC, ESTFAB AS ESTFAC, CLIFAB AS CLIFAC, CNOFAB AS CNOFAC, CNIFAB AS CNIFAC, CDOFAB AS CDOFAC, CPOFAB AS CPOFAC, CCPFAB AS CCPFAC, CPRFAB AS CPRFAC, FOPFAB AS FOPFAC, BAS1FAB AS BAS1FAC, BAS2FAB AS BAS2FAC, BAS3FAB AS BAS3FAC, PIVA1FAB AS PIVA1FAC, PIVA2FAB AS PIVA2FAC, PIVA3FAB AS PIVA3FAC, IIVA1FAB AS IIVA1FAC, IIVA2FAB AS IIVA2FAC, IIVA3FAB AS IIVA3FAC, PRET1FAB AS PRET1FAC, IRET1FAB AS IRET1FAC, TOTFAB AS TOTFAC FROM F_FAB"),
    @('lineas_abono',"SELECT TIPLFB AS TIPLFA, CODLFB AS CODLFA, POSLFB AS POSLFA, DESLFB AS DESLFA, CANLFB AS CANLFA, PRELFB AS PRELFA, TOTLFB AS TOTLFA FROM F_LFB")) ) {
    $c=$cn.CreateCommand(); $c.CommandText=$q[1]; $rd=$c.ExecuteReader()
    while ($rd.Read()) { $o=[ordered]@{empresa=$e; anio=$a}; for($i=0;$i -lt $rd.FieldCount;$i++){ $v=$rd.GetValue($i); if($v -is [datetime]){$v=$v.ToString('yyyy-MM-dd')}; if($v -is [System.DBNull]){$v=$null}; $o[$rd.GetName($i)]=$v }; $sal[$q[0]]+=$o }
    $rd.Close()
  }
  $cn.Close(); Remove-Item $f
} }
"facturas: $($sal.facturas.Count) | lineas: $($sal.lineas.Count) | abonos: $($sal.abonos.Count) | lineas de abono: $($sal.lineas_abono.Count)"
$sal | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 "$S\facturas_2025_2026.json"
