# Word -> PDF de las hojas enviadas en Word (para subirlas al almacen). Lee lista.txt: origen<TAB>destino
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0
$ok = 0; $mal = 0
foreach ($l in Get-Content -Encoding UTF8 "$PSScriptRoot\lista.txt") {
  $o, $d = $l -split "`t"; $o = $o.Replace("/", "\")
  if (Test-Path $d) { $ok++; continue }
  try { $doc = $w.Documents.Open($o, $false, $true); $doc.SaveAs([ref]$d, [ref]17); $doc.Close([ref]0); $ok++ }
  catch { $mal++; "FALLO $o : $($_.Exception.Message)" }
}
$w.Quit()
"convertidos $ok, fallos $mal"
