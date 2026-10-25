# Saca los CLIENTES de Factusol (tabla F_CLI) de las tres empresas, del fichero del año en curso, a un JSON.
# SOLO LEE, y sobre una COPIA del .accdb (el original esta en Dropbox y lo usa Factusol). Monica, 25-oct-2026:
# la app debe saber el codigo de cliente de cada comunidad/contrata EN CADA EMPRESA (Accesalia y Daniel autonomo
# tienen clientes dados de alta por separado) para generar los pedidos sin duplicar clientes.
#   powershell -File sacar_clientes_factusol.ps1 <carpeta_de_trabajo> [anio]
param([string]$S, [string]$A = (Get-Date).Year)
$sal = @{ clientes = @(); columnas = @{} }
foreach ($e in '001', '002', '003') {
  $orig = "C:\accesalia Dropbox\D SM\factusol\FACTUSOL\Datos\FS\$e$A.accdb"
  if (-not (Test-Path $orig)) { "no existe $e$A"; continue }
  $f = "$S\cli_$e$A.accdb"; Copy-Item $orig $f -Force
  $cn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$f;Mode=Read;"); $cn.Open()
  # Todos los campos, tal cual: los nombres cambian entre versiones de Factusol y no se adivinan.
  $c = $cn.CreateCommand(); $c.CommandText = "SELECT * FROM F_CLI"; $rd = $c.ExecuteReader()
  while ($rd.Read()) { $o = [ordered]@{ empresa = $e }; for ($i = 0; $i -lt $rd.FieldCount; $i++) { $v = $rd.GetValue($i); if ($v -is [System.DBNull]) { $v = $null }; $o[$rd.GetName($i)] = $v }; $sal.clientes += $o }
  $rd.Close(); $cn.Close(); Remove-Item $f
}
"clientes: $($sal.clientes.Count)"
$sal | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 "$S\clientes_factusol.json"
