# Saca los PEDIDOS DE CLIENTE de Factusol (F_PCL cabecera, F_LPC lineas) de 2026, de las tres empresas, a un JSON.
# Son las PROFORMAS que Alexandra emitia en Factusol (Monica, 19-oct-2026): se vuelcan a la app con el mismo numero.
# SOLO LEE, y sobre una COPIA del .accdb.
#   powershell -File sacar_pedidos_factusol.ps1 <carpeta_de_trabajo>
param([string]$S)
$sal=@{pedidos=@(); lineas=@(); de_factura=@()}
foreach ($e in '001','002','003') { $a='2026'
  $orig="C:\accesalia Dropbox\D SM\factusol\FACTUSOL\Datos\FS\$e$a.accdb"
  if (-not (Test-Path $orig)) { "no existe $e$a"; continue }
  $f="$S\ped_$e$a.accdb"; Copy-Item $orig $f -Force
  $cn=New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$f;Mode=Read;"); $cn.Open()
  foreach ($q in @(
    @('pedidos',"SELECT TIPPCL, CODPCL, REFPCL, FECPCL, ESTPCL, CLIPCL, CNOPCL, CNIPCL, CDOPCL, CPOPCL, CCPPCL, CPRPCL, FOPPCL, BAS1PCL, BAS2PCL, BAS3PCL, PIVA1PCL, PIVA2PCL, PIVA3PCL, IIVA1PCL, IIVA2PCL, IIVA3PCL, PRET1PCL, IRET1PCL, TOTPCL FROM F_PCL"),
    @('lineas',"SELECT TIPLPC, CODLPC, POSLPC, DESLPC, CANLPC, PRELPC, TOTLPC FROM F_LPC"),
    # que factura salio de cada pedido: sus lineas apuntan al pedido (DOCLFA 'C', serie DTPLFA, numero DCOLFA)
    @('de_factura',"SELECT DISTINCT TIPLFA, CODLFA, DTPLFA, DCOLFA FROM F_LFA WHERE DOCLFA='C'")) ) {
    $c=$cn.CreateCommand(); $c.CommandText=$q[1]; $rd=$c.ExecuteReader()
    while ($rd.Read()) { $o=[ordered]@{empresa=$e; anio=$a}; for($i=0;$i -lt $rd.FieldCount;$i++){ $v=$rd.GetValue($i); if($v -is [datetime]){$v=$v.ToString('yyyy-MM-dd')}; if($v -is [System.DBNull]){$v=$null}; $o[$rd.GetName($i)]=$v }; $sal[$q[0]]+=$o }
    $rd.Close()
  }
  $cn.Close(); Remove-Item $f
}
"pedidos: $($sal.pedidos.Count) | lineas: $($sal.lineas.Count) | facturas que salen de pedido: $($sal.de_factura.Count)"
$sal | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 "$S\pedidos_2026.json"
